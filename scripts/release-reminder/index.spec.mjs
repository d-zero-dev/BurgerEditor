// Runs scripts/release-reminder/index.mjs against a throwaway repository with
// a stub `gh`, because the script has side effects on GitHub Issues and its
// main safety property (a dry run never touches them) cannot be seen from the
// functions of report.mjs.

import { execFileSync, spawnSync } from 'node:child_process';
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const indexPath = fileURLToPath(new URL('index.mjs', import.meta.url));
const DAY = 86_400_000;

let dir;
let repo;

/**
 * @param {string[]} args
 * @param {string} date The author and committer date.
 */
function git(args, date) {
	execFileSync('git', args, {
		cwd: repo,
		stdio: 'ignore',
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
}

/**
 * @param {string} file
 * @param {string} content
 * @param {string} message
 * @param {string} date
 */
function commit(file, content, message, date) {
	mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
	writeFileSync(path.join(repo, file), content);
	git(['add', '--all'], date);
	git(['commit', '-m', message], date);
}

/**
 * The ISO date of a change that landed `days` days ago.
 * @param days
 */
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

beforeEach(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'bge-reminder-index-'));
	repo = path.join(dir, 'repo');
	mkdirSync(repo);
	// Only `dev` exists: the other line of lines.mjs (`v3`) has no branch here
	git(['init', '--initial-branch=dev'], daysAgo(30));
	commit(
		'packages/@burger-editor/foo/package.json',
		JSON.stringify({ name: '@burger-editor/foo', files: ['dist'] }),
		'chore: first release',
		daysAgo(30),
	);
	git(['tag', 'v4.0.0-alpha.1'], daysAgo(30));
	commit(
		'packages/@burger-editor/foo/src/index.ts',
		'export const a = 1;\n',
		'feat: a change',
		daysAgo(10),
	);

	// A stub `gh`: `api` lists the open Issues of $GH_ISSUES (one JSON object per
	// line); every other call is recorded with its standard input in $GH_LOG
	mkdirSync(path.join(dir, 'bin'));
	writeFileSync(
		path.join(dir, 'bin/gh'),
		`#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'api') {
	process.stdout.write(fs.readFileSync(process.env.GH_ISSUES, 'utf8'));
	process.exit(0);
}
const stdin = args.includes('--body-file') ? fs.readFileSync(0, 'utf8') : '';
fs.appendFileSync(process.env.GH_LOG, JSON.stringify({ args, stdin }) + '\\n');
`,
	);
	chmodSync(path.join(dir, 'bin/gh'), 0o755);
	writeFileSync(path.join(dir, 'issues'), '');
	writeFileSync(path.join(dir, 'gh.log'), '');
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

/**
 * @param {string[]} args
 * @param {object[]} [issues] The open Issues the stub `gh` reports.
 * @returns {{ status: number | null, stdout: string, stderr: string, calls: { args: string[], stdin: string }[], summary: string }}
 */
function run(args = [], issues = []) {
	writeFileSync(
		path.join(dir, 'issues'),
		issues.map((issue) => JSON.stringify(issue)).join('\n'),
	);
	writeFileSync(path.join(dir, 'gh.log'), '');
	writeFileSync(path.join(dir, 'summary.md'), '');
	const result = spawnSync(process.execPath, [indexPath, ...args], {
		cwd: repo,
		encoding: 'utf8',
		env: {
			...process.env,
			PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`,
			GH_ISSUES: path.join(dir, 'issues'),
			GH_LOG: path.join(dir, 'gh.log'),
			GITHUB_STEP_SUMMARY: path.join(dir, 'summary.md'),
		},
	});
	return {
		status: result.status,
		stdout: result.stdout,
		stderr: result.stderr,
		calls: readFileSync(path.join(dir, 'gh.log'), 'utf8')
			.split('\n')
			.filter(Boolean)
			.map((line) => JSON.parse(line)),
		summary: readFileSync(path.join(dir, 'summary.md'), 'utf8'),
	};
}

describe('release-reminder/index.mjs', () => {
	it('never touches GitHub in a dry run, and prints the report and the Issue body', () => {
		const result = run();
		expect(result.status).toBe(0);
		expect(result.calls).toEqual([]);
		expect(result.stdout).toContain('通知の対象: はい');
		expect(result.stdout).toContain('<!-- release-reminder:v4 -->');
	});

	it('appends the report to the job summary', () => {
		const result = run();
		expect(result.summary).toContain('## v4（dev）');
	});

	it('skips a line whose branch does not exist, without failing the others', () => {
		const result = run();
		expect(result.status).toBe(0);
		expect(result.stderr).toContain('ブランチ v3 が見つからない');
		expect(result.stdout).toContain('## v3');
		expect(result.stdout).toContain('判定しませんでした');
	});

	describe('with --apply', () => {
		it('opens an Issue for a line that is due, marked on its first line', () => {
			const result = run(['--apply']);
			expect(result.status).toBe(0);
			expect(result.calls).toHaveLength(1);
			const [call] = result.calls;
			expect(call.args.slice(0, 2)).toEqual(['issue', 'create']);
			expect(call.stdin.split('\n')[0]).toBe('<!-- release-reminder:v4 -->');
		});

		it('leaves an Issue that already says the same, even when GitHub returns CRLF line endings', () => {
			const created = run(['--apply']).calls[0];
			const result = run(
				['--apply'],
				[
					{
						number: 7,
						title: created.args[created.args.indexOf('--title') + 1],
						body: created.stdin.replaceAll('\n', '\r\n'),
					},
				],
			);
			expect(result.status).toBe(0);
			expect(result.calls).toEqual([]);
		});

		it('edits the Issue of the line when the report changed', () => {
			const result = run(
				['--apply'],
				[
					{
						number: 7,
						title: 'old title',
						body: '<!-- release-reminder:v4 -->\nold body\n',
					},
				],
			);
			expect(result.calls).toHaveLength(1);
			expect(result.calls[0].args.slice(0, 3)).toEqual(['issue', 'edit', '7']);
		});

		it('does not take an Issue of another line or without the marker for its own', () => {
			const result = run(
				['--apply'],
				[
					{ number: 3, title: 'other', body: '<!-- release-reminder:v3 -->\nbody\n' },
					{ number: 4, title: 'unrelated', body: 'no marker\n' },
				],
			);
			expect(result.calls).toHaveLength(1);
			expect(result.calls[0].args.slice(0, 2)).toEqual(['issue', 'create']);
		});

		it('closes the Issue once the line is no longer due', () => {
			// a moment before the change has waited for the reminder period
			const result = run(
				['--apply', '--now', daysAgo(10)],
				[{ number: 7, title: 'v4', body: '<!-- release-reminder:v4 -->\nbody\n' }],
			);
			expect(result.status).toBe(0);
			expect(result.calls).toHaveLength(1);
			expect(result.calls[0].args.slice(0, 3)).toEqual(['issue', 'close', '7']);
		});

		it('does nothing when the line is not due and has no Issue', () => {
			const result = run(['--apply', '--now', daysAgo(10)]);
			expect(result.calls).toEqual([]);
		});
	});

	describe('--now', () => {
		it('refuses a value that is not a date, which would make every line not due and close the Issues', () => {
			const result = run(['--apply', '--now', 'garbage']);
			expect(result.status).toBe(2);
			expect(result.stderr).toContain('--now');
			expect(result.calls).toEqual([]);
		});

		it('refuses a missing value', () => {
			const result = run(['--now']);
			expect(result.status).toBe(2);
		});
	});
});
