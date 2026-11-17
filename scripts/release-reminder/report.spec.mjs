import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	analyzeLine,
	compareVersions,
	pickBaseline,
	REMINDER_AFTER_DAYS,
	renderIssue,
} from './report.mjs';

const NOW = new Date('2026-11-16T00:00:00Z');
const daysAgo = (days) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const LINE = {
	id: 'v4',
	major: 4,
	role: 'prerelease',
	branch: 'main',
	tagPrefix: 'v4.',
	renovate: 'full',
	reminder: true,
	commitGuard: false,
};

/** A throwaway repository whose commit dates are under the test's control. */
function createRepo() {
	const dir = mkdtempSync(path.join(tmpdir(), 'bge-release-reminder-'));
	let currentDate = daysAgo(30);
	const git = (args, date = currentDate) =>
		execFileSync('git', args, {
			cwd: dir,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				...process.env,
				GIT_AUTHOR_NAME: 'test',
				GIT_AUTHOR_EMAIL: 'test@example.com',
				GIT_COMMITTER_NAME: 'test',
				GIT_COMMITTER_EMAIL: 'test@example.com',
				GIT_AUTHOR_DATE: date,
				GIT_COMMITTER_DATE: date,
				GIT_CONFIG_GLOBAL: '/dev/null',
				GIT_CONFIG_SYSTEM: '/dev/null',
			},
		});
	return {
		dir,
		git,
		/**
		 * Writes files (a `null` value deletes) and commits them at `date`.
		 * @param message
		 * @param files
		 * @param date
		 */
		commit(message, files, date) {
			currentDate = date;
			for (const [file, content] of Object.entries(files)) {
				const full = path.join(dir, file);
				if (content === null) {
					rmSync(full, { force: true });
					continue;
				}
				mkdirSync(path.dirname(full), { recursive: true });
				writeFileSync(full, content);
			}
			git(['add', '--all']);
			git(['commit', '--allow-empty', '-m', message], date);
		},
		/**
		 * Merges a topic branch with a merge commit, like a pull request.
		 * @param branch
		 * @param message
		 * @param date
		 */
		merge(branch, message, date) {
			currentDate = date;
			git(['merge', '--no-ff', '-m', message, branch], date);
		},
	};
}

const pkg = (extra = {}) =>
	JSON.stringify({
		name: '@burger-editor/foo',
		version: '4.0.0-alpha.1',
		files: ['dist', 'bin'],
		...extra,
	});

let repo;

beforeEach(() => {
	repo = createRepo();
	repo.git(['init', '--initial-branch=main']);
	repo.commit(
		'chore: first release',
		{
			'packages/@burger-editor/foo/package.json': pkg(),
			'packages/@burger-editor/foo/src/index.ts': 'export {};\n',
			'packages/@burger-editor/foo/bin/cli.js': '// cli\n',
			'packages/@burger-editor/private-tool/package.json': JSON.stringify({
				name: '@burger-editor/private-tool',
				private: true,
			}),
			'packages/@burger-editor/private-tool/src/index.ts': 'export {};\n',
		},
		daysAgo(30),
	);
	repo.git(['tag', 'v4.0.0-alpha.1']);
});

afterEach(() => {
	rmSync(repo.dir, { recursive: true, force: true });
});

/**
 * Lands a change on `main` through a topic branch and a merge commit.
 * @param files
 * @param date
 * @param message
 */
function land(files, date, message = 'feat: a change') {
	repo.git(['switch', '-c', 'topic'], date);
	repo.commit(message, files, date);
	repo.git(['switch', 'main'], date);
	repo.merge('topic', `Merge pull request: ${message}`, date);
	repo.git(['branch', '-D', 'topic'], date);
}

const analyze = () =>
	analyzeLine({ git: (args) => repo.git(args), ref: 'main', line: LINE, now: NOW });

describe('compareVersions', () => {
	it('orders a stable release above its prereleases', () => {
		expect(compareVersions('3.5.0', '3.5.0-alpha.3')).toBeGreaterThan(0);
	});

	it('orders prerelease numbers numerically', () => {
		expect(compareVersions('4.0.0-alpha.10', '4.0.0-alpha.9')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0-alpha.9', '4.0.0-alpha.10')).toBeLessThan(0);
	});

	it('orders alpha below beta below rc below the stable release', () => {
		expect(compareVersions('4.0.0-beta.1', '4.0.0-alpha.77')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0-alpha.77', '4.0.0-beta.1')).toBeLessThan(0);
		expect(compareVersions('4.0.0-rc.1', '4.0.0-beta.9')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0', '4.0.0-rc.1')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0-rc.1', '4.0.0')).toBeLessThan(0);
	});

	it('orders a shorter prerelease below a longer one with the same start', () => {
		expect(compareVersions('4.0.0-alpha', '4.0.0-alpha.1')).toBeLessThan(0);
		expect(compareVersions('4.0.0-alpha.1', '4.0.0-alpha')).toBeGreaterThan(0);
	});

	it('orders a numeric identifier below an alphanumeric one', () => {
		expect(compareVersions('4.0.0-1', '4.0.0-alpha')).toBeLessThan(0);
		expect(compareVersions('4.0.0-alpha', '4.0.0-1')).toBeGreaterThan(0);
	});

	it('finds equal versions equal', () => {
		expect(compareVersions('v4.0.0-alpha.1', '4.0.0-alpha.1')).toBe(0);
		expect(compareVersions('3.5.0', '3.5.0')).toBe(0);
	});

	it('orders by the numeric core first', () => {
		expect(compareVersions('3.10.0', '3.9.9')).toBeGreaterThan(0);
	});
});

describe('pickBaseline', () => {
	it('takes the highest tag of the line and ignores other lines', () => {
		expect(
			pickBaseline(['v3.5.0-alpha.3', 'v3.5.0', 'v4.0.0-alpha.77', 'v0.10.0'], 'v3.'),
		).toBe('v3.5.0');
	});

	it('takes the newest prerelease while the line has no stable release', () => {
		expect(
			pickBaseline(['v4.0.0-alpha.9', 'v4.0.0-alpha.77', 'v4.0.0-alpha.10'], 'v4.'),
		).toBe('v4.0.0-alpha.77');
	});

	it('returns null when the line has no tag', () => {
		expect(pickBaseline(['v3.5.0'], 'v4.')).toBeNull();
	});
});

describe('analyzeLine', () => {
	it('uses the highest tag the branch contains as the baseline', () => {
		repo.commit('chore: release', { 'CHANGELOG.md': '# changes\n' }, daysAgo(20));
		repo.git(['tag', 'v4.0.0-alpha.2']);
		expect(analyze().baseline).toBe('v4.0.0-alpha.2');
	});

	it('reports nothing when only changes that do not reach users landed', () => {
		land(
			{
				'README.md': '# readme\n',
				'packages/@burger-editor/foo/README.md': '# foo\n',
				'packages/@burger-editor/foo/src/index.spec.ts': 'test\n',
				'packages/@burger-editor/foo/src/__tests__/data.json': '{}\n',
				'packages/@burger-editor/private-tool/src/index.ts': 'export const a = 1;\n',
				'yarn.lock': 'lock\n',
			},
			daysAgo(10),
		);
		const report = analyze();
		expect(report.changes).toEqual([]);
		expect(report.since).toBeNull();
		expect(report.due).toBe(false);
	});

	it('counts a change to the build input of a public package', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
		);
		const report = analyze();
		expect(report.changes).toEqual(['packages/@burger-editor/foo/src/index.ts']);
		expect(report.due).toBe(true);
	});

	it('counts a tracked file the package ships through `files`', () => {
		land({ 'packages/@burger-editor/foo/bin/cli.js': '// changed\n' }, daysAgo(10));
		expect(analyze().changes).toEqual(['packages/@burger-editor/foo/bin/cli.js']);
	});

	it('counts the fields of package.json that a consumer resolves', () => {
		land(
			{
				'packages/@burger-editor/foo/package.json': pkg({
					dependencies: { hono: '^4.0.0' },
				}),
			},
			daysAgo(10),
		);
		expect(analyze().changes).toEqual(['packages/@burger-editor/foo/package.json']);
	});

	it('does not count a version bump or a change to devDependencies', () => {
		land(
			{
				'packages/@burger-editor/foo/package.json': pkg({
					version: '4.0.0-alpha.2',
					devDependencies: { vitest: '4.0.0' },
				}),
			},
			daysAgo(10),
		);
		expect(analyze().changes).toEqual([]);
	});

	it('is not due until the change has waited for the reminder period', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(REMINDER_AFTER_DAYS - 1),
		);
		const report = analyze();
		expect(report.changes).toHaveLength(1);
		expect(report.due).toBe(false);
	});

	it('starts the clock when the oldest counted change landed', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
		);
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 2;\n' },
			daysAgo(1),
		);
		expect(analyze().since.toISOString()).toBe(new Date(daysAgo(10)).toISOString());
	});

	it('does not start the clock when a release is merged back', () => {
		// main -> release branch commits the version bump and the tag; the
		// merge back into main is the only first-parent commit that carries it
		repo.git(['switch', '-c', 'release'], daysAgo(20));
		repo.commit(
			'chore(release): publish v4.0.0-alpha.2',
			{
				'packages/@burger-editor/foo/package.json': pkg({ version: '4.0.0-alpha.2' }),
				'packages/@burger-editor/foo/CHANGELOG.md': '# 4.0.0-alpha.2\n',
			},
			daysAgo(20),
		);
		repo.git(['tag', 'v4.0.0-alpha.2']);
		repo.git(['switch', 'main'], daysAgo(5));
		repo.merge('release', 'Merge branch release back', daysAgo(5));
		const report = analyze();
		expect(report.baseline).toBe('v4.0.0-alpha.2');
		expect(report.since).toBeNull();
		expect(report.due).toBe(false);
	});

	it('ignores a counted change that the cumulative diff no longer has', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
		);
		land({ 'packages/@burger-editor/foo/src/index.ts': 'export {};\n' }, daysAgo(9));
		const report = analyze();
		expect(report.changes).toEqual([]);
		expect(report.due).toBe(false);
	});

	it('lists vulnerability fixes since the baseline', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
			'chore(deps): update dependency glob to v14 [security]',
		);
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 2;\n' },
			daysAgo(9),
		);
		const report = analyze();
		expect(report.vulnerabilityCommits).toHaveLength(1);
		expect(report.vulnerabilityCommits[0].subject).toContain('[security]');
	});

	it('does not take a commit that merely mentions security for a vulnerability fix', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
			'docs(skills): tighten security review wording',
		);
		expect(analyze().vulnerabilityCommits).toEqual([]);
	});

	it('takes the merge of a security update branch and a CVE reference', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
			'chore: security-update-20261027',
		);
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 2;\n' },
			daysAgo(9),
			'fix(core): reject the input of CVE-2026-12345',
		);
		expect(analyze().vulnerabilityCommits).toHaveLength(2);
	});

	it('has no baseline when the line was never tagged', () => {
		repo.git(['tag', '--delete', 'v4.0.0-alpha.1']);
		const report = analyze();
		expect(report.baseline).toBeNull();
		expect(report.due).toBe(false);
	});

	describe('between a release on the release branch and the merge back', () => {
		/** A change lands on main, then a release is cut on its own branch and tagged. */
		function releaseWithoutMergeBack() {
			land(
				{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
				daysAgo(10),
			);
			repo.git(['switch', '-c', 'release'], daysAgo(9));
			repo.commit(
				'chore(release): publish v4.0.0-alpha.2',
				{ 'packages/@burger-editor/foo/package.json': pkg({ version: '4.0.0-alpha.2' }) },
				daysAgo(9),
			);
			repo.git(['tag', 'v4.0.0-alpha.2']);
			repo.git(['switch', 'main'], daysAgo(9));
		}

		it('reports the released change as unreleased while the tag is only on the release branch', () => {
			releaseWithoutMergeBack();
			const report = analyze();
			expect(report.baseline).toBe('v4.0.0-alpha.1');
			expect(report.due).toBe(true);
		});

		it('measures from a tag that the release branch has and the branch itself does not yet', () => {
			releaseWithoutMergeBack();
			const report = analyzeLine({
				git: (args) => repo.git(args),
				ref: 'main',
				releaseRef: 'release',
				line: LINE,
				now: NOW,
			});
			expect(report.baseline).toBe('v4.0.0-alpha.2');
			expect(report.changes).toEqual([]);
			expect(report.due).toBe(false);
		});

		it('still counts a change that landed after the release', () => {
			releaseWithoutMergeBack();
			land(
				{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 2;\n' },
				daysAgo(5),
			);
			const report = analyzeLine({
				git: (args) => repo.git(args),
				ref: 'main',
				releaseRef: 'release',
				line: LINE,
				now: NOW,
			});
			expect(report.baseline).toBe('v4.0.0-alpha.2');
			expect(report.changes).toEqual(['packages/@burger-editor/foo/src/index.ts']);
			expect(report.due).toBe(true);
		});
	});

	it('is due exactly when the reminder period has passed', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			new Date(NOW.getTime() - 3 * 86_400_000).toISOString(),
		);
		expect(analyze().due).toBe(true);
	});

	it('is not due one second before the reminder period has passed', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			new Date(NOW.getTime() - 3 * 86_400_000 + 1000).toISOString(),
		);
		expect(analyze().due).toBe(false);
	});

	it('clocks a change from the merge that brought it in, not from the date of its commits on the topic branch', () => {
		repo.git(['switch', '-c', 'topic'], daysAgo(20));
		repo.commit(
			'feat: a change',
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(20),
		);
		repo.git(['switch', 'main'], daysAgo(1));
		repo.merge('topic', 'Merge pull request: a change', daysAgo(1));
		const report = analyze();
		expect(report.since.toISOString()).toBe(new Date(daysAgo(1)).toISOString());
		expect(report.due).toBe(false);
	});

	describe('the fields of package.json that a consumer resolves', () => {
		it.each([
			['peerDependencies', { react: '^19.0.0' }],
			['optionalDependencies', { fsevents: '^2.0.0' }],
			['engines', { node: '>=20' }],
			['exports', { '.': './dist/index.js' }],
			['bin', { foo: './bin/cli.js' }],
			['files', ['dist', 'bin', 'style']],
		])('counts a change to %s', (field, value) => {
			land(
				{ 'packages/@burger-editor/foo/package.json': pkg({ [field]: value }) },
				daysAgo(10),
			);
			expect(analyze().changes).toEqual(['packages/@burger-editor/foo/package.json']);
		});

		it('counts the lower bound of a dependency being raised', () => {
			land(
				{
					'packages/@burger-editor/foo/package.json': pkg({
						dependencies: { hono: '^4.0.0' },
					}),
				},
				daysAgo(10),
			);
			repo.git(['tag', 'v4.0.0-alpha.2']);
			land(
				{
					'packages/@burger-editor/foo/package.json': pkg({
						dependencies: { hono: '^4.1.0' },
					}),
				},
				daysAgo(5),
			);
			const report = analyze();
			expect(report.baseline).toBe('v4.0.0-alpha.2');
			expect(report.changes).toEqual(['packages/@burger-editor/foo/package.json']);
		});

		it('counts a package that was added since the baseline', () => {
			land(
				{
					'packages/@burger-editor/added/package.json': JSON.stringify({
						name: '@burger-editor/added',
						files: ['dist'],
					}),
				},
				daysAgo(10),
			);
			expect(analyze().changes).toEqual(['packages/@burger-editor/added/package.json']);
		});

		it('fails loudly on a package.json that is not JSON, instead of dropping the package', () => {
			land(
				{ 'packages/@burger-editor/foo/package.json': '<<<<<<< conflict\n' },
				daysAgo(10),
			);
			expect(() => analyze()).toThrow(SyntaxError);
		});
	});

	describe('the files of a package that reach users', () => {
		/**
		 * A published package that ships `*.css` and `./docs` and builds `dist`.
		 * @param file
		 */
		const bar = (file) => `packages/@burger-editor/bar/${file}`;
		const manifest = JSON.stringify({
			name: '@burger-editor/bar',
			files: ['dist', '*.css', './docs'],
		});

		beforeEach(() => {
			land({ [bar('package.json')]: manifest }, daysAgo(20));
			repo.git(['tag', 'v4.0.0-alpha.2']);
		});

		it('counts a file that matches a wildcard entry and a ./-prefixed entry', () => {
			land(
				{
					[bar('style.css')]: 'a {}\n',
					[bar('docs/picture.svg')]: '<svg></svg>\n',
				},
				daysAgo(10),
			);
			expect(analyze().changes).toEqual([bar('docs/picture.svg'), bar('style.css')]);
		});

		it('does not count a wildcard entry in a subdirectory, or a file that no entry names', () => {
			land(
				{ [bar('nested/style.css')]: 'a {}\n', [bar('tsconfig.json')]: '{}\n' },
				daysAgo(10),
			);
			expect(analyze().changes).toEqual([]);
		});

		it('does not count build output, which is generated from src', () => {
			land({ [bar('dist/index.js')]: '// built\n' }, daysAgo(10));
			expect(analyze().changes).toEqual([]);
		});

		it.each([
			'docs/guide.md',
			'src/notes.md',
			'src/a.stories.tsx',
			'src/a.test.ts',
			'src/__snapshots__/a.snap',
			'src/__fixtures__/b.json',
			'src/fixtures/c.json',
			'src/test-data/d.json',
		])('does not count %s', (file) => {
			land({ [bar(file)]: 'content\n' }, daysAgo(10));
			expect(analyze().changes).toEqual([]);
		});
	});

	describe('the glob entries of files', () => {
		// npm reads `**` as "any number of directories" and `!` as "except", so a
		// package that ships `assets/**/*.css` or `lib/**` but not `lib/**/skip.js`
		// must have the first two counted and the last left out.
		const baz = (file) => `packages/@burger-editor/baz/${file}`;
		const manifest = JSON.stringify({
			name: '@burger-editor/baz',
			files: ['assets/**/*.css', 'lib/**', '!lib/**/skip.js', '!*.map'],
		});

		beforeEach(() => {
			land({ [baz('package.json')]: manifest }, daysAgo(20));
			repo.git(['tag', 'v4.0.0-alpha.2']);
		});

		it('counts a file under ** at any depth, including none', () => {
			land(
				{
					[baz('assets/style.css')]: 'a {}\n',
					[baz('assets/a/b/deep.css')]: 'a {}\n',
					[baz('lib/x/y/z.js')]: '// z\n',
				},
				daysAgo(10),
			);
			expect(analyze().changes).toEqual([
				baz('assets/a/b/deep.css'),
				baz('assets/style.css'),
				baz('lib/x/y/z.js'),
			]);
		});

		it('does not count a file that a negated entry excludes', () => {
			land(
				{
					[baz('lib/skip.js')]: '// skip\n',
					[baz('lib/a/skip.js')]: '// skip\n',
					[baz('bundle.map')]: '{}\n',
					// a negated entry without a slash applies at any depth
					[baz('lib/x/bundle.map')]: '{}\n',
				},
				daysAgo(10),
			);
			expect(analyze().changes).toEqual([]);
		});

		it('does not count a file that no entry names', () => {
			land({ [baz('assets/a/notes.txt')]: 'text\n' }, daysAgo(10));
			expect(analyze().changes).toEqual([]);
		});
	});

	describe('the order and the forms of the entries of files', () => {
		const qux = (file) => `packages/@burger-editor/qux/${file}`;
		const manifest = JSON.stringify({
			name: '@burger-editor/qux',
			files: ['lib', '!vendored', '!x', 'x/**', 'out/*.{js,css}', 'pic/[ab].png'],
		});

		beforeEach(() => {
			land({ [qux('package.json')]: manifest }, daysAgo(20));
			repo.git(['tag', 'v4.0.0-alpha.2']);
		});

		it('excludes a directory named by a negated entry without a slash, at any depth', () => {
			land(
				{ [qux('lib/a/vendored/t.js')]: '// t\n', [qux('lib/a/code.js')]: '// code\n' },
				daysAgo(10),
			);
			expect(analyze().changes).toEqual([qux('lib/a/code.js')]);
		});

		it('lets a later entry win over an earlier negated one', () => {
			land({ [qux('x/y.js')]: '// y\n' }, daysAgo(10));
			expect(analyze().changes).toEqual([qux('x/y.js')]);
		});

		it('reads {a,b} as alternatives and [ab] as a class of characters', () => {
			land(
				{
					[qux('out/a.js')]: '// a\n',
					[qux('out/b.css')]: 'b {}\n',
					[qux('out/c.txt')]: 'c\n',
					[qux('pic/a.png')]: 'png\n',
					[qux('pic/c.png')]: 'png\n',
				},
				daysAgo(10),
			);
			expect(analyze().changes).toEqual([
				qux('out/a.js'),
				qux('out/b.css'),
				qux('pic/a.png'),
			]);
		});
	});
});

describe('renderIssue', () => {
	it('puts the marker on the first line and the vulnerability fixes before the files', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
			'fix(deps): bump a library for a vulnerability fix',
		);
		const { title, body } = renderIssue(analyze(), LINE);
		expect(title).toContain('v4');
		expect(title).toContain('v4.0.0-alpha.1');
		expect(body.split('\n')[0]).toBe('<!-- release-reminder:v4 -->');
		// the vulnerability fix is listed, by its whole subject, under its own heading ...
		expect(body).toMatch(
			/^- [0-9a-f]+ Merge pull request: fix\(deps\): bump a library for a vulnerability fix$/m,
		);
		// ... which comes before the section of files
		expect(body.indexOf('## 脆弱性修正')).toBeGreaterThan(-1);
		expect(body.indexOf('## 脆弱性修正')).toBeLessThan(
			body.indexOf('## 利用者に届く変更'),
		);
		expect(body).toContain('- `packages/@burger-editor/foo/src/index.ts`');
	});

	it('says there is no vulnerability fix when there is none', () => {
		land(
			{ 'packages/@burger-editor/foo/src/index.ts': 'export const a = 1;\n' },
			daysAgo(10),
		);
		expect(renderIssue(analyze(), LINE).body).toMatch(/## 脆弱性修正\n\n- なし\n/);
	});
});
