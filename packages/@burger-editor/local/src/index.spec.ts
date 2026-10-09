import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// Drives the built bin end to end (argv → parseCliArgs → run*Command →
// getUserConfig → resolveConfig), the same way mcp-server's
// startup-log.spec.ts does; CI runs `yarn build` before `yarn test`.
const BIN_PATH = path.resolve(import.meta.dirname, '..', 'server', 'index.js');

interface BinResult {
	readonly code: number | null;
	readonly stdout: string;
	readonly stderr: string;
}

/**
 * Run `bge` in `cwd` and collect its output. With `until`, the child is
 * killed as soon as stdout matches it (the server never exits on its own).
 * @param args CLI arguments after the bin path
 * @param cwd working directory for the child
 * @param options
 * @param options.until stop the child once stdout matches this
 * @param options.timeoutMs hard cap so a hung child can't hang the suite
 */
function runBin(
	args: readonly string[],
	cwd: string,
	{ until, timeoutMs = 15_000 }: { until?: RegExp; timeoutMs?: number } = {},
): Promise<BinResult> {
	return new Promise((resolve, reject) => {
		const env = { ...process.env };
		// A value exported in the developer's shell would override the
		// search these cases set up.
		delete env.BGE_CONFIG;
		delete env.DEV_MODE;
		const child = spawn(process.execPath, [BIN_PATH, ...args], { cwd, env });
		let stdout = '';
		let stderr = '';
		const timer = setTimeout(() => child.kill(), timeoutMs);
		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString('utf8');
			if (until?.test(stripVTControlCharacters(stdout))) {
				child.kill();
			}
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf8');
		});
		child.on('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			resolve({
				code,
				stdout: stripVTControlCharacters(stdout),
				stderr: stripVTControlCharacters(stderr),
			});
		});
	});
}

// Shared by both configs: never open a browser, bind an ephemeral loopback
// port, and skip the Agent Hub (no token file, no fs watcher).
const SERVER_SETTINGS = `port: 0, host: '127.0.0.1', open: false, agent: { enabled: false }`;

describe('bge --config (built bin)', () => {
	let tmp: { path: string } & AsyncDisposable;

	// Two sites in one project: the cwd search finds `burgereditor.config.mjs`
	// (whose pages have no match), so only a correctly forwarded `--config`
	// reaches `site.config.mjs` and its matching page.
	beforeEach(async () => {
		tmp = await mkdtempDisposable('bge-bin-config-');
		await fs.mkdir(path.join(tmp.path, 'main'));
		await fs.writeFile(path.join(tmp.path, 'main', 'index.html'), '<div></div>', 'utf8');
		await fs.writeFile(
			path.join(tmp.path, 'burgereditor.config.mjs'),
			`export default { documentRoot: './main', ${SERVER_SETTINGS} };\n`,
			'utf8',
		);
		await fs.mkdir(path.join(tmp.path, 'site'));
		await fs.writeFile(
			path.join(tmp.path, 'site', 'match.html'),
			'<div data-bge-container style="--bge-options-margin: var(--bge-options-margin--none);"></div>',
			'utf8',
		);
		await fs.writeFile(
			path.join(tmp.path, 'site.config.mjs'),
			`export default { documentRoot: './site', ${SERVER_SETTINGS} };\n`,
			'utf8',
		);
	});

	afterEach(async () => {
		await tmp[Symbol.asyncDispose]();
	});

	test('bge search --config searches under the named config, not the one the cwd search finds', async () => {
		const result = await runBin(
			['search', '--config', './site.config.mjs', 'margin=none'],
			tmp.path,
		);
		expect(result.code).toBe(0);
		expect(result.stdout).toContain('match.html');
	}, 20_000);

	test('bge --config boots with the named config and names it in the banner', async () => {
		const result = await runBin(['--config', './site.config.mjs'], tmp.path, {
			until: /Enjoy Developing/,
		});
		expect(result.stdout).toContain('Config: ./site.config.mjs');
		expect(result.stdout).toContain('DocumentRoot: ./site');
	}, 20_000);

	test('a bare --config exits 1 with a message instead of starting the server', async () => {
		const result = await runBin(['--config'], tmp.path);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain('--config requires a path to a config file.');
		expect(result.stdout).not.toContain('BurgerEditor Local App');
	}, 20_000);

	test('a 0.0.0.0 host exits 1 with the explanation alone on stderr, without booting (regression: #1001)', async () => {
		await fs.writeFile(
			path.join(tmp.path, 'wildcard.config.mjs'),
			`export default { documentRoot: './site', port: 0, host: '0.0.0.0', open: false };\n`,
			'utf8',
		);
		const result = await runBin(['--config', './wildcard.config.mjs'], tmp.path);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Invalid host "0.0.0.0" in the BurgerEditor config.');
		expect(result.stderr).toContain('Chrome and Safari block requests to 0.0.0.0.');
		expect(result.stderr).not.toMatch(/^\s+at\s/m);
		expect(result.stdout).not.toContain('BurgerEditor Local App');
	}, 20_000);

	test('--config naming a missing file exits 1 instead of booting with defaults', async () => {
		const result = await runBin(['--config', './missing.config.mjs'], tmp.path);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Config file not found:');
		expect(result.stdout).not.toContain('BurgerEditor Local App');
	}, 20_000);
});
