import type { ChildProcess } from 'node:child_process';

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// cspell:ignore burgereditorrc

const require = createRequire(import.meta.url);
const tsxPkgJson = require.resolve('tsx/package.json');
const tsxCli = path.join(path.dirname(tsxPkgJson), 'dist/cli.mjs');
const cliEntry = path.resolve(import.meta.dirname, '..', 'index.ts');

type CliResult = {
	code: number | null;
	signal: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
};

/**
 * Spawn the local CLI in `cwd` and resolve once it exits. Used to drive
 * `runServerCommand` end-to-end as the user would experience it: a `node`
 * subprocess reading the on-disk config and producing real stderr/exit-code
 * signals. {@link tsxCli} lets us run the source `.ts` entry without first
 * building, so the test stays self-contained.
 * @param cwd
 * @param timeoutMs
 */
function runCli(cwd: string, timeoutMs = 8000): Promise<CliResult> {
	return new Promise<CliResult>((resolve, reject) => {
		const child: ChildProcess = spawn(process.execPath, [tsxCli, cliEntry], {
			cwd,
			env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
		child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));
		const timer = setTimeout(() => {
			child.kill('SIGKILL');
			reject(
				new Error(
					`CLI did not exit within ${timeoutMs}ms\nstderr=${stderr}\nstdout=${stdout}`,
				),
			);
		}, timeoutMs);
		child.on('exit', (code, signal) => {
			clearTimeout(timer);
			resolve({ code, signal, stdout, stderr });
		});
		child.on('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

describe('runServerCommand boot (virtualTree)', () => {
	let documentRoot: string;

	beforeEach(async () => {
		documentRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bge-boot-'));
	});

	afterEach(async () => {
		await fs.rm(documentRoot, { recursive: true, force: true });
	});

	test('exits 1 with formatted stderr listing conflicting files (regression: #754)', async () => {
		// Two files claim the same logical path → loadResolverState rejects with
		// PathConflictError. Without the loadResolverStateOrExit wrapper the
		// process would still exit non-zero, but Node's default uncaught
		// handler prints `Error:` + stack trace, hiding the file names. We
		// assert that the human-readable form reaches stderr instead.
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>One</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(documentRoot, '2.html'),
			'---\npath: about.html\n---\n<h1>Two</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(documentRoot, '.burgereditorrc.json'),
			JSON.stringify({
				virtualTree: { enabled: true, pathKey: 'path' },
				port: 0,
				host: 'localhost',
				open: false,
			}),
			'utf8',
		);

		const result = await runCli(documentRoot);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Conflicting logical paths');
		expect(result.stderr).toContain('about.html');
		expect(result.stderr).toContain('1.html');
		expect(result.stderr).toContain('2.html');
		expect(result.stderr).toContain('Fix the conflicting front matter "path" values');
		// The formatted message is what the operator should see — Node's
		// default uncaught handler (which emits `PathConflictError:` and
		// stack frames) must not be the source of the output.
		expect(result.stderr).not.toContain('PathConflictError:');
		expect(result.stderr).not.toMatch(/^\s+at\s/m);
	}, 15_000);

	test('exits 1 with file name when a frontmatter pathKey is missing (regression: #754)', async () => {
		await fs.writeFile(
			path.join(documentRoot, '7.html'),
			'<h1>no front matter</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(documentRoot, '.burgereditorrc.json'),
			JSON.stringify({
				virtualTree: { enabled: true, pathKey: 'path' },
				port: 0,
				host: 'localhost',
				open: false,
			}),
			'utf8',
		);

		const result = await runCli(documentRoot);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Failed to load virtualTree resolver state');
		expect(result.stderr).toContain('7.html');
	}, 15_000);
});
