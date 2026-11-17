// Runs .husky/pre-commit against throwaway repositories with a stub
// `lint-staged`. The hook takes its list of guarded branches from lines.mjs
// (through guarded-branches.mjs); this proves it acts on that list: a commit on
// a guarded branch is refused, and every other state (including a detached
// HEAD) reaches lint-staged.

import { execFileSync, spawnSync } from 'node:child_process';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RELEASE_LINES, releaseCommitBranches } from './lines.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const hook = path.join(root, '.husky/pre-commit');

let dir;
let repo;

/** @param {string[]} args */
function git(args) {
	execFileSync('git', args, {
		cwd: repo,
		stdio: 'ignore',
		env: {
			...process.env,
			GIT_AUTHOR_NAME: 'test',
			GIT_AUTHOR_EMAIL: 'test@example.com',
			GIT_COMMITTER_NAME: 'test',
			GIT_COMMITTER_EMAIL: 'test@example.com',
			GIT_CONFIG_GLOBAL: '/dev/null',
			GIT_CONFIG_SYSTEM: '/dev/null',
		},
	});
}

beforeEach(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'bge-pre-commit-'));
	repo = path.join(dir, 'repo');
	mkdirSync(repo);
	mkdirSync(path.join(dir, 'bin'));
	// `lint-staged` leaves a marker file, so a run that reached it can be told
	// from a run that was refused before it
	writeFileSync(
		path.join(dir, 'bin/lint-staged'),
		`#!/bin/sh\ntouch "${path.join(dir, 'lint-staged-ran')}"\n`,
	);
	chmodSync(path.join(dir, 'bin/lint-staged'), 0o755);
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

/**
 * @returns {{ status: number | null, stderr: string, stdout: string, reachedLintStaged: boolean }}
 */
function runHook() {
	// A hook runs from the root of the working tree (it reads the line
	// definition by a relative path), and the branch comes from the repository
	// that GIT_DIR names: the throwaway one, whose HEAD the test controls.
	const result = spawnSync('sh', [hook], {
		cwd: root,
		encoding: 'utf8',
		env: {
			...process.env,
			GIT_DIR: path.join(repo, '.git'),
			PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`,
		},
	});
	return {
		status: result.status,
		stdout: result.stdout,
		stderr: result.stderr,
		reachedLintStaged: existsSync(path.join(dir, 'lint-staged-ran')),
	};
}

describe('.husky/pre-commit', () => {
	for (const line of RELEASE_LINES.filter((candidate) => candidate.commitGuard)) {
		it(`refuses a commit on ${line.branch}`, () => {
			git(['init', `--initial-branch=${line.branch}`]);
			const result = runHook();
			expect(result.status).toBe(1);
			expect(result.reachedLintStaged).toBe(false);
			expect(result.stdout).toContain(
				`Direct commits to the ${line.branch} branch are prohibited.`,
			);
		});
	}

	for (const branch of [
		...releaseCommitBranches(),
		...RELEASE_LINES.filter((line) => !line.commitGuard).map((line) => line.branch),
		'a-topic-branch',
	]) {
		it(`lets a commit on ${branch} through to lint-staged`, () => {
			git(['init', `--initial-branch=${branch}`]);
			const result = runHook();
			expect(result.status).toBe(0);
			expect(result.reachedLintStaged).toBe(true);
		});
	}

	it('refuses every commit, and says why, when the list of guarded branches cannot be read', () => {
		// A `node` that cannot run (a GUI git client without the version manager
		// in its PATH, for example) must not let a commit through unguarded, and
		// "command not found" alone does not say that the guard is what refused
		writeFileSync(path.join(dir, 'bin/node'), '#!/bin/sh\nexit 127\n');
		chmodSync(path.join(dir, 'bin/node'), 0o755);
		git(['init', '--initial-branch=a-topic-branch']);
		const result = runHook();
		expect(result.status).toBe(1);
		expect(result.reachedLintStaged).toBe(false);
		expect(result.stderr).toContain('Could not read the list of guarded branches');
		expect(result.stderr).toContain('is node in the PATH');
		expect(result.stderr).toContain('guarded-branches.mjs run');
	});

	it('lets a commit on a detached HEAD through, which has no branch name (a rebase, for example)', () => {
		git(['init', '--initial-branch=dev']);
		git(['commit', '--allow-empty', '-m', 'first']);
		git(['switch', '--detach', 'HEAD']);
		const result = runHook();
		expect(result.status).toBe(0);
		expect(result.reachedLintStaged).toBe(true);
	});
});
