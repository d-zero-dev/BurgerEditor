// Fails when a file that names a branch disagrees with `lines.mjs`. Each
// failure names the file to fix, so breaking `lines.mjs` on purpose (removing
// a line, renaming `dev`) lists every place that has to follow.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { REMINDER_AFTER_DAYS } from '../release-reminder/report.mjs';

import {
	guardedBranches,
	lineBranches,
	MAINTENANCE_MONTHS_AFTER_NEXT_STABLE,
	RELEASE_LINES,
	releaseCommitBranches,
} from './lines.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The workflows of this checkout run for the newest line: the default branch
 * carries it, and its release branch is where releases are cut.
 */
const NEWEST = RELEASE_LINES[0];

/**
 * @param {string} relativePath
 * @returns {string}
 */
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

/**
 * @param {Iterable<string>} values
 * @returns {string[]}
 */
const sorted = (values) => [...new Set(values)].toSorted();

/**
 * Every branch a workflow lists under a `branches:` key (block or flow list).
 * @param {string} text
 * @returns {string[]}
 */
function workflowBranches(text) {
	const names = [];
	for (const match of text.matchAll(
		/^[ \t]*branches:[ \t]*(?:(\[[^\]\n]*\])[ \t]*)?$/gm,
	)) {
		if (match[1]) {
			names.push(
				...match[1]
					.slice(1, -1)
					.split(',')
					.map((name) => name.trim().replaceAll(/^["']|["']$/g, ''))
					.filter(Boolean),
			);
			continue;
		}
		const rest = text.slice((match.index ?? 0) + match[0].length);
		for (const line of rest.split('\n').slice(1)) {
			const item = /^[ \t]+-[ \t]+["']?([^"'#\s]+)["']?[ \t]*(?:#.*)?$/.exec(line);
			if (!item) {
				break;
			}
			names.push(item[1]);
		}
	}
	return names;
}

/**
 * The block of one trigger under `on:` of a workflow (the lines indented
 * deeper than the trigger), so its `branches:` can be read on its own.
 * @param {string} text
 * @param {string} trigger For example `push` or `pull_request`.
 * @returns {string}
 */
function triggerBlock(text, trigger) {
	const block = new RegExp(
		`^ {2}${trigger}:[ \\t]*\\n((?: {4,}.*\\n|[ \\t]*\\n)*)`,
		'm',
	).exec(text);
	if (!block) {
		throw new Error(`The workflow has no \`${trigger}:\` trigger under \`on:\``);
	}
	return block[1];
}

/**
 * The Markdown table row that names a line, if any.
 * @param {string} text
 * @param {import('./lines.mjs').ReleaseLine} line
 * @returns {string | undefined}
 */
function tableRowOf(text, line) {
	return text
		.split('\n')
		.find(
			(row) =>
				row.startsWith('|') &&
				row.includes(`\`${line.id}\``) &&
				row.includes(`\`${line.branch}\``),
		);
}

/**
 * The ids of the jobs of a workflow.
 * @param {string} text
 * @returns {string[]}
 */
function workflowJobs(text) {
	const jobs = text.slice(text.search(/^jobs:/m));
	return [...jobs.matchAll(/^ {2}([\w-]+):[ \t]*$/gm)].map((match) => match[1]);
}

const playwrightVersion = () =>
	JSON.parse(read('package.json')).devDependencies.playwright;

describe('release lines are the single definition of the branches', () => {
	it('keeps one definition per line', () => {
		expect(new Set(RELEASE_LINES.map((line) => line.id)).size).toBe(RELEASE_LINES.length);
		expect(new Set(RELEASE_LINES.map((line) => line.branch)).size).toBe(
			RELEASE_LINES.length,
		);
	});

	it('writes the tag prefix of a line from its major', () => {
		for (const line of RELEASE_LINES) {
			// `v4` without the dot would also match the tags of v40
			expect(line.tagPrefix).toBe(`v${line.major}.`);
		}
	});

	it('carries the major of the version in lerna.json on the newest line', () => {
		const { version } = JSON.parse(read('lerna.json'));
		expect(Number(version.split('.')[0])).toBe(NEWEST.major);
	});

	describe('.github/renovate.json', () => {
		const config = () => JSON.parse(read('.github/renovate.json'));
		const rules = () => config().packageRules ?? [];

		it('raises updates on exactly the branches of the lines', () => {
			expect(sorted(config().baseBranchPatterns ?? [])).toEqual(
				sorted(RELEASE_LINES.map((line) => line.branch)),
			);
		});

		it('disables every regular update on exactly the security-only lines', () => {
			const disabling = rules().filter(
				(rule) =>
					rule.enabled === false &&
					Array.isArray(rule.matchBaseBranches) &&
					Array.isArray(rule.matchUpdateTypes),
			);
			expect(sorted(disabling.flatMap((rule) => rule.matchBaseBranches))).toEqual(
				sorted(
					RELEASE_LINES.filter((line) => line.renovate === 'security-only').map(
						(line) => line.branch,
					),
				),
			);
			for (const rule of disabling) {
				// a missing type (patch, for example) would let that update through
				expect(sorted(rule.matchUpdateTypes)).toEqual(
					sorted([
						'major',
						'minor',
						'patch',
						'pin',
						'pinDigest',
						'digest',
						'lockfileUpdate',
						'rollback',
						'bump',
						'replacement',
					]),
				);
			}
		});

		it('lets vulnerability fixes through the rule that disables the rest', () => {
			expect(config().vulnerabilityAlerts?.enabled).toBe(true);
		});

		it('bumps the ranges of published packages on exactly the full lines', () => {
			const bump = rules().filter((rule) => rule.rangeStrategy === 'bump');
			expect(bump.length).toBeGreaterThan(0);
			expect(sorted(bump.flatMap((rule) => rule.matchBaseBranches ?? []))).toEqual(
				sorted(
					RELEASE_LINES.filter((line) => line.renovate === 'full').map(
						(line) => line.branch,
					),
				),
			);
		});

		it('reads every Playwright image tag through its custom manager', () => {
			// The regex is what puts the image into the pull request of the npm
			// package; `yarn lint` validates its syntax but not that it matches.
			const [manager] = config().customManagers ?? [];
			expect(manager, 'renovate.json has no custom manager for the image').toBeDefined();
			for (const file of ['.github/workflows/test.yml', 'Dockerfile.vr']) {
				const images =
					read(file).match(/mcr\.microsoft\.com\/playwright:[^\s"']+/g) ?? [];
				const found = manager.matchStrings.flatMap((source) =>
					[...read(file).matchAll(new RegExp(source, 'g'))].map(
						(match) => match.groups?.currentValue,
					),
				);
				expect(found, `${file}: the custom manager misses an image`).toHaveLength(
					images.length,
				);
				expect(images.length).toBeGreaterThan(0);
				for (const version of found) {
					expect(version).toBe(playwrightVersion());
				}
			}
		});
	});

	describe('.github/workflows', () => {
		const dir = path.join(root, '.github/workflows');
		const files = readdirSync(dir).filter((name) => /\.ya?ml$/.test(name));

		for (const file of files) {
			it(`${file} names only branches of the lines`, () => {
				const names = workflowBranches(read(`.github/workflows/${file}`));
				const unknown = names.filter((name) => !lineBranches().includes(name));
				expect(
					unknown,
					`.github/workflows/${file} lists branches that no release line has`,
				).toEqual([]);
			});
		}

		it('runs test.yml for the branch and the release branch of the newest line', () => {
			// An empty list would pass the check above, so the parser must find them
			const names = workflowBranches(read('.github/workflows/test.yml'));
			expect(sorted(names)).toEqual(sorted([NEWEST.branch, NEWEST.releaseBranch]));
		});

		it('runs test.yml on a push only for the release branch, because the merge queue already ran it on every merge into the branch', () => {
			// A push to the branch of the line is the merge the queue just validated:
			// running the whole suite (VR included) again adds a third run per change.
			// The release branch has no queue, so a push there is its only run.
			const text = read('.github/workflows/test.yml');
			expect(
				workflowBranches(triggerBlock(text, 'push')),
				'test.yml runs on a push to a branch that the merge queue validates',
			).toEqual([NEWEST.releaseBranch]);
			expect(workflowBranches(triggerBlock(text, 'pull_request'))).toEqual([
				NEWEST.branch,
			]);
		});

		it('requires every job of test.yml through ci-ok, which the merge queue waits for', () => {
			const text = read('.github/workflows/test.yml');
			expect(text, 'test.yml has no merge_group trigger').toMatch(/^ {2}merge_group:/m);
			const needs = /ci-ok:[\s\S]*?needs:\s*\[([^\]]*)\]/.exec(text)?.[1] ?? '';
			expect(
				sorted(needs.split(',').map((name) => name.trim())),
				'ci-ok does not need exactly the other jobs of test.yml',
			).toEqual(sorted(workflowJobs(text).filter((job) => job !== 'ci-ok')));
		});
	});

	describe('actions used by the workflows', () => {
		// The comment next to the digest has to name a full version (`# v7.0.1`),
		// not a floating tag (`# v7`): Renovate ages a digest update against the
		// release date of the version in the comment, a floating tag gives it
		// none, and `renovate/stability-days` then stays pending for ever, so the
		// update never merges. `helpers:pinGitHubActionDigestsToSemver` in
		// renovate.json writes the full version; this keeps a hand-written
		// comment of another form from going back. It checks the form of the
		// comment, not that the version belongs to the digest.
		const yamlFilesOf = (dir) =>
			existsSync(path.join(root, dir))
				? readdirSync(path.join(root, dir), { recursive: true })
						.map(String)
						.filter((name) => /\.ya?ml$/.test(name))
						.map((name) => `${dir}/${name}`)
				: [];
		const files = [
			...yamlFilesOf('.github/workflows'),
			...yamlFilesOf('.github/actions'),
		];

		/**
		 * @param {string} text The text of a workflow or of a composite action.
		 * @returns {{ name: string, ref: string, comment: string }[]} The actions that a
		 * `uses:` line names, with what follows `@` and the comment after `#`. A local
		 * action and a Docker image are left out: they have no git digest.
		 */
		function usedActions(text) {
			return text.split('\n').flatMap((line) => {
				const value = /^[\s-]*uses:(.*)$/.exec(line)?.[1]?.trim();
				if (value === undefined) {
					return [];
				}
				const [target = '', ...comment] = value.split('#');
				const reference = target.trim().replaceAll(/^["']|["']$/g, '');
				if (reference.startsWith('./') || reference.startsWith('docker://')) {
					return [];
				}
				const [name = '', ref = ''] = reference.split('@');
				return [
					{
						name,
						ref,
						comment: comment.length > 0 ? `#${comment.join('#')}`.trim() : '',
					},
				];
			});
		}

		it('finds the actions it is meant to check', () => {
			// an empty list would pass every check below
			const all = files.flatMap((file) => usedActions(read(file)));
			expect(all.length).toBeGreaterThan(5);
		});

		for (const file of files) {
			it(`${file} pins every action by digest, with a version in the comment`, () => {
				const wrong = usedActions(read(file)).filter(
					({ ref, comment }) =>
						!/^[0-9a-f]{40}$/.test(ref) || !/^#\s*v?\d+\.\d+\.\d+/.test(comment),
				);
				expect(
					wrong.map(({ name, ref, comment }) => `${name}@${ref} ${comment}`),
					`${file}: an action is not pinned by digest with a full version in the comment (like "# v7.0.1")`,
				).toEqual([]);
			});
		}
	});

	describe('.husky/pre-commit', () => {
		it('reads the guarded branches from lines.mjs instead of keeping a list of its own', () => {
			const hook = read('.husky/pre-commit');
			expect(hook).toContain('scripts/release-lines/guarded-branches.mjs');
			// a branch written into the hook would go stale when the lines change
			for (const line of RELEASE_LINES) {
				expect(hook, `.husky/pre-commit names the branch ${line.branch}`).not.toMatch(
					new RegExp(`=\\s*"${line.branch}"`),
				);
			}
		});

		it('guards exactly the lines that ask for it', () => {
			expect(sorted(guardedBranches())).toEqual(
				sorted(
					RELEASE_LINES.filter((line) => line.commitGuard).map((line) => line.branch),
				),
			);
		});

		it('never guards a branch that lerna version commits releases to', () => {
			expect(
				guardedBranches().filter((name) => releaseCommitBranches().includes(name)),
			).toEqual([]);
		});
	});

	for (const file of ['CLAUDE.md', 'SECURITY.md']) {
		describe(file, () => {
			for (const line of RELEASE_LINES) {
				it(`has a table row for ${line.id} with its branch and role`, () => {
					const row = tableRowOf(read(file), line);
					expect(
						row,
						`${file} has no table row naming \`${line.id}\` and \`${line.branch}\``,
					).toBeDefined();
					expect(
						row,
						`${file}: the row of ${line.id} does not say ${line.role}`,
					).toContain(line.role);
				});
			}

			it('gives the support period of the maintenance line in the months of lines.mjs', () => {
				const maintenance = RELEASE_LINES.find((line) => line.role === 'maintenance');
				const row = maintenance && tableRowOf(read(file), maintenance);
				expect(row).toContain(`${MAINTENANCE_MONTHS_AFTER_NEXT_STABLE} か月`);
			});
		});
	}

	describe('the release reminder period', () => {
		it('is the number of days CLAUDE.md states', () => {
			expect(read('CLAUDE.md')).toContain(`${REMINDER_AFTER_DAYS} 日`);
		});

		it('is the number of days the workflow states', () => {
			expect(read('.github/workflows/release-reminder.yml')).toContain(
				`${REMINDER_AFTER_DAYS} days`,
			);
		});
	});

	describe('install commands of the documents for users', () => {
		// While the newest line is a prerelease, `latest` of its packages is a
		// stale prerelease or the stable version of the older line, so a command
		// that names a package without a tag installs the wrong thing: the
		// commands carry the tag of the prerelease. Once the newest line is
		// stable, `latest` is right and the tag has to go. Both directions are
		// checked, so the rotation to a stable line cannot leave the tags behind
		// (the `major-rotation` skill lists the step).
		const packagesDir = 'packages/@burger-editor';
		const documents = [
			'README.md',
			...readdirSync(path.join(root, packagesDir)).map(
				(name) => `${packagesDir}/${name}/README.md`,
			),
			...readdirSync(path.join(root, 'skills'), { recursive: true })
				.filter((name) => String(name).endsWith('.md'))
				.map((name) => `skills/${name}`),
		].filter((file) => {
			try {
				read(file);
				return true;
			} catch {
				return false;
			}
		});
		const requireTag = NEWEST.role === 'prerelease';

		/**
		 * @param {string} text
		 * @returns {{ name: string, tag: string | undefined }[]} The packages that a
		 * command of the text names, in `yarn add`, `yarn global add` or `npx`, and
		 * the packages of an `args` entry of an MCP configuration.
		 */
		function packagesOfCommands(text) {
			const found = [];
			const commands =
				/(?:yarn (?:global )?add(?: -D)?|npx(?: -y)?)((?: +@burger-editor\/[a-z-]+(?:@[^\s`"',)]+)?)+)/g;
			for (const match of text.matchAll(commands)) {
				for (const token of match[1].trim().split(/ +/)) {
					const [, name, tag] = /^(@burger-editor\/[a-z-]+)(?:@(.+))?$/.exec(token) ?? [];
					found.push({ name, tag });
				}
			}
			for (const match of text.matchAll(/"(@burger-editor\/[a-z-]+)(?:@([^"]*))?"/g)) {
				// only a package that is run (an `args` entry), not a `name` or a key
				const before = text.slice(Math.max(0, (match.index ?? 0) - 40), match.index);
				if (/"-y",\s*$|\["-y",\s*$/.test(before)) {
					found.push({ name: match[1], tag: match[2] });
				}
			}
			return found;
		}

		it('finds the commands it is meant to check', () => {
			const all = documents.flatMap((file) => packagesOfCommands(read(file)));
			expect(all.length).toBeGreaterThan(20);
		});

		for (const file of documents) {
			it(`${file} ${requireTag ? 'installs with the tag of the prerelease' : 'installs without the tag of a prerelease'}`, () => {
				const wrong = packagesOfCommands(read(file)).filter(({ tag }) =>
					requireTag ? tag !== 'alpha' : tag === 'alpha',
				);
				expect(
					wrong.map(({ name, tag }) => (tag ? `${name}@${tag}` : name)),
					`${file}: ${
						requireTag
							? 'a command names a package without @alpha'
							: 'a command still names a package with @alpha'
					}`,
				).toEqual([]);
			});
		}
	});

	describe('Playwright', () => {
		const imageTag = () => `mcr.microsoft.com/playwright:v${playwrightVersion()}-noble`;

		for (const file of ['.github/workflows/test.yml', 'Dockerfile.vr']) {
			it(`${file} runs the image of the installed playwright`, () => {
				const images = [
					...read(file).matchAll(/mcr\.microsoft\.com\/playwright:[^\s"']+/g),
				].map((match) => match[0]);
				expect(images.length, `${file} has no Playwright image`).toBeGreaterThan(0);
				expect(
					images.filter((image) => image !== imageTag()),
					`${file} must use ${imageTag()} to match package.json`,
				).toEqual([]);
			});
		}
	});

	describe('Corepack', () => {
		// Node 25 and later do not ship Corepack, and the Playwright image moved
		// to Node 26, so neither the image nor the Node of `actions/setup-node`
		// brings `corepack` any more. Both places that enable Yarn install it
		// from npm at a pinned version.
		const files = ['.github/actions/setup-yarn/action.yml', 'Dockerfile.vr'];
		const config = () => JSON.parse(read('.github/renovate.json'));
		const installed = (file) =>
			[...read(file).matchAll(/npm install -g corepack@(?<version>\S+)/g)].map(
				(match) => match.groups.version,
			);

		for (const file of files) {
			it(`${file} installs Corepack at an exact version before enabling it`, () => {
				const text = read(file);
				const versions = installed(file);
				expect(versions, `${file} must install corepack once`).toHaveLength(1);
				expect(versions[0]).toMatch(/^\d+\.\d+\.\d+$/);
				expect(text.indexOf('npm install -g corepack@')).toBeLessThan(
					text.indexOf('corepack enable'),
				);
			});
		}

		it('pins the same version in every place', () => {
			expect(new Set(files.flatMap((file) => installed(file))).size).toBe(1);
		});

		it('reads every pinned version through its custom manager', () => {
			// The regex is what lets Renovate raise the pin; `yarn lint` validates
			// its syntax but not that it matches.
			const manager = (config().customManagers ?? []).find(
				(candidate) => candidate.depNameTemplate === 'corepack',
			);
			expect(manager, 'renovate.json has no custom manager for corepack').toBeDefined();
			for (const file of files) {
				const found = manager.matchStrings.flatMap((source) =>
					[...read(file).matchAll(new RegExp(source, 'g'))].map(
						(match) => match.groups?.currentValue,
					),
				);
				expect(found, `${file}: the custom manager misses the pin`).toEqual(
					installed(file),
				);
			}
		});
	});
});
