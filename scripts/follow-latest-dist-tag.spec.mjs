import { spawnSync } from 'node:child_process';
import {
	chmodSync,
	copyFileSync,
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

import {
	collectPackages,
	hasStableVersion,
	packagesToFollow,
} from './follow-latest-dist-tag.mjs';

const scriptPath = fileURLToPath(new URL('follow-latest-dist-tag.mjs', import.meta.url));

describe('collectPackages', () => {
	it('reads the published versions of every package', () => {
		const { packages, failed } = collectPackages(['a', 'b'], (name) => [
			`${name}-1.0.0-alpha.1`,
		]);
		expect(packages).toEqual([
			{ name: 'a', versions: ['a-1.0.0-alpha.1'] },
			{ name: 'b', versions: ['b-1.0.0-alpha.1'] },
		]);
		expect(failed).toEqual([]);
	});

	it('reports a package whose lookup failed and keeps the others', () => {
		const { packages, failed } = collectPackages(['broken', 'fine'], (name) => {
			if (name === 'broken') {
				throw Object.assign(new Error('failed'), { stderr: 'npm error code ECONNRESET' });
			}
			return ['1.0.0-alpha.1'];
		});
		expect(packages).toEqual([{ name: 'fine', versions: ['1.0.0-alpha.1'] }]);
		expect(failed).toEqual(['broken']);
	});

	it('does not take a 404 for a package without versions, which would move latest of a package that has a stable release', () => {
		const { packages, failed } = collectPackages(['a'], () => {
			throw Object.assign(new Error('failed'), { stderr: 'npm error code E404' });
		});
		expect(packages).toEqual([]);
		expect(failed).toEqual(['a']);
	});
});

describe('hasStableVersion', () => {
	it('is false when every version is a prerelease', () => {
		expect(hasStableVersion(['4.0.0-alpha.64', '4.0.0-alpha.77'])).toBe(false);
	});

	it('is true when a stable version has been published', () => {
		expect(hasStableVersion(['3.5.0', '4.0.0-alpha.77'])).toBe(true);
	});

	it('is false for a package that has no versions yet', () => {
		expect(hasStableVersion([])).toBe(false);
	});
});

describe('packagesToFollow', () => {
	const packages = [
		{ name: '@scope/only-v4', versions: ['4.0.0-alpha.1', '4.0.0-alpha.2'] },
		{ name: '@scope/both-lines', versions: ['3.5.0', '4.0.0-alpha.2'] },
		{ name: '@scope/new', versions: [] },
	];

	it('picks the packages that never had a stable release', () => {
		expect(packagesToFollow(packages)).toEqual(['@scope/only-v4', '@scope/new']);
	});

	it('leaves the packages of another line on their own latest', () => {
		expect(packagesToFollow(packages)).not.toContain('@scope/both-lines');
	});
});

describe('the script', () => {
	let dir;

	/**
	 * A workspace of four packages next to a copy of the script, and a stub `npm`
	 * that answers `view` from a table and records every other call.
	 * @param {string} version The version in lerna.json.
	 * @param {Record<string, string[] | null>} published `null` makes `npm view` fail.
	 * @param {string[]} [failingAdd] Packages whose `dist-tag add` fails.
	 */
	function setup(version, published, failingAdd = []) {
		mkdirSync(path.join(dir, 'scripts'));
		copyFileSync(scriptPath, path.join(dir, 'scripts/follow-latest-dist-tag.mjs'));
		writeFileSync(path.join(dir, 'lerna.json'), JSON.stringify({ version }));
		for (const [folder, manifest] of Object.entries({
			a: { name: '@burger-editor/a' },
			b: { name: '@burger-editor/b' },
			c: { name: '@burger-editor/c', private: true },
			d: { name: '@burger-editor/d' },
		})) {
			mkdirSync(path.join(dir, 'packages/@burger-editor', folder), { recursive: true });
			writeFileSync(
				path.join(dir, 'packages/@burger-editor', folder, 'package.json'),
				JSON.stringify(manifest),
			);
		}
		mkdirSync(path.join(dir, 'bin'));
		writeFileSync(
			path.join(dir, 'bin/npm'),
			`#!/usr/bin/env node
const fs = require('node:fs');
const table = ${JSON.stringify({ published, failingAdd })};
const [command, name, third] = process.argv.slice(2);
if (command === 'view') {
	const versions = table.published[name];
	if (!versions) {
		console.error('npm error code ECONNRESET');
		process.exit(1);
	}
	process.stdout.write(JSON.stringify(versions));
} else {
	fs.appendFileSync(${JSON.stringify(path.join(dir, 'calls.log'))}, process.argv.slice(2).join(' ') + '\\n');
	// npm dist-tag add <package>@<version> latest
	if (command === 'dist-tag' && table.failingAdd.some((n) => third.startsWith(n + '@'))) {
		process.exit(1);
	}
}
`,
		);
		chmodSync(path.join(dir, 'bin/npm'), 0o755);
	}

	/**
	 * @param {string[]} args
	 * @returns {{ status: number | null, stdout: string, stderr: string, calls: string[] }}
	 */
	function run(args = []) {
		const result = spawnSync(
			process.execPath,
			[path.join(dir, 'scripts/follow-latest-dist-tag.mjs'), ...args],
			{
				encoding: 'utf8',
				env: { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}` },
			},
		);
		let calls = [];
		try {
			calls = readFileSync(path.join(dir, 'calls.log'), 'utf8')
				.split('\n')
				.filter(Boolean);
		} catch {
			// no call was recorded
		}
		return { status: result.status, stdout: result.stdout, stderr: result.stderr, calls };
	}

	// the registry after the publish of 4.0.0-alpha.2
	const published = {
		'@burger-editor/a': ['4.0.0-alpha.1', '4.0.0-alpha.2'],
		'@burger-editor/b': ['3.5.0', '4.0.0-alpha.2'],
		'@burger-editor/d': ['4.0.0-alpha.1', '4.0.0-alpha.2'],
	};

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), 'bge-follow-latest-'));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it('reads a package that has a single version, which npm prints as a string', () => {
		// `npm view <package> versions --json` prints "4.0.0-alpha.1", not an array
		setup('4.0.0-alpha.2', { ...published, '@burger-editor/a': '4.0.0-alpha.2' });
		const result = run();
		expect(result.status).toBe(0);
		expect(result.calls).toContain('dist-tag add @burger-editor/a@4.0.0-alpha.2 latest');
	});

	it('does not try to move latest onto a version the registry does not have, after a partial publish', () => {
		setup('4.0.0-alpha.2', { ...published, '@burger-editor/a': ['4.0.0-alpha.1'] });
		const result = run();
		expect(result.status).toBe(1);
		expect(result.calls).toEqual(['dist-tag add @burger-editor/d@4.0.0-alpha.2 latest']);
		expect(result.stderr).toContain(
			'@burger-editor/a@4.0.0-alpha.2 is not on the registry',
		);
	});

	it('does nothing for a stable release, which set latest by itself', () => {
		setup('4.0.0', published);
		const result = run();
		expect(result.status).toBe(0);
		expect(result.calls).toEqual([]);
	});

	it('moves latest of the packages without a stable release and skips private ones', () => {
		setup('4.0.0-alpha.2', published);
		const result = run();
		expect(result.status).toBe(0);
		expect(result.calls).toEqual([
			'dist-tag add @burger-editor/a@4.0.0-alpha.2 latest',
			'dist-tag add @burger-editor/d@4.0.0-alpha.2 latest',
		]);
	});

	it('only prints what it would do with --dry-run', () => {
		setup('4.0.0-alpha.2', published);
		const result = run(['--dry-run']);
		expect(result.status).toBe(0);
		expect(result.calls).toEqual([]);
		expect(result.stdout).toContain(
			'[dry-run] npm dist-tag add @burger-editor/a@4.0.0-alpha.2 latest',
		);
	});

	it('keeps going and exits 1 when a dist-tag add fails', () => {
		setup('4.0.0-alpha.2', published, ['@burger-editor/a']);
		const result = run();
		expect(result.status).toBe(1);
		expect(result.calls).toHaveLength(2);
		expect(result.stderr).toContain('@burger-editor/a');
	});

	it('does not move latest of a package whose versions it could not read, and exits 1', () => {
		setup('4.0.0-alpha.2', { ...published, '@burger-editor/a': null });
		const result = run();
		expect(result.status).toBe(1);
		expect(result.calls).toEqual(['dist-tag add @burger-editor/d@4.0.0-alpha.2 latest']);
		expect(result.stderr).toContain('@burger-editor/a');
	});
});
