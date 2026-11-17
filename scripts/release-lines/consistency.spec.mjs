// Fails when a file that names a branch disagrees with `lines.mjs`. Each
// failure names the file to fix, so breaking `lines.mjs` on purpose (removing
// a line, renaming `dev`) lists every place that has to follow.

import { readdirSync, readFileSync } from 'node:fs';
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
});
