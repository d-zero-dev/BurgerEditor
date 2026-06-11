import fs from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { clearConfigCache, resolveConfig } from './resolve.js';

// Stash fixtures under the package's own directory so cosmiconfig can find
// them via filesystem walk and the imported config module can `import` from
// the workspace's node_modules.
const FIXTURE_ROOT = path.resolve(import.meta.dirname, '../../.tmp-config-fixture');

beforeAll(async () => {
	await fs.mkdir(FIXTURE_ROOT, { recursive: true });
});

beforeEach(() => {
	// cosmiconfig memoizes "no config at <dir>" hits across calls; without
	// this, later tests that *do* create configs under previously-checked
	// directories would still see null.
	clearConfigCache();
});

afterAll(async () => {
	await fs.rm(FIXTURE_ROOT, { recursive: true, force: true }).catch(() => {});
});

/**
 *
 * @param name
 * @param configContents
 */
async function makeFixture(name: string, configContents: string): Promise<string> {
	const dir = path.join(FIXTURE_ROOT, name);
	await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, 'burgereditor.config.mjs'), configContents, 'utf8');
	return dir;
}

describe('resolveConfig', () => {
	test('loads a burgereditor.config.mjs via cosmiconfig', async () => {
		const dir = await makeFixture(
			'basic',
			`export default {
				documentRoot: './src',
				editableArea: '.content',
			};`,
		);
		const { config, configPath } = await resolveConfig(dir);
		expect(configPath).toBe(path.join(dir, 'burgereditor.config.mjs'));
		expect(config.documentRoot).toBe(path.join(dir, 'src'));
		expect(config.editableArea).toBe('.content');
	});

	test('returns the cosmiconfig defaults when no overrides are given', async () => {
		const dir = await makeFixture('defaults', `export default {};`);
		const { config } = await resolveConfig(dir);
		// Documented package defaults — pin them so we notice drift.
		expect(config.port).toBe(5255);
		expect(config.host).toBe('localhost');
		expect(config.lang).toBe('en');
		expect(config.indexFileName).toBe('index.html');
		expect(config.virtualTree).toEqual({ enabled: false, pathKey: 'path' });
		expect(config.healthCheck).toEqual({
			enabled: true,
			interval: 10_000,
			retryCount: 3,
		});
		expect(config.catalog).toBeDefined();
	});

	test('walks up parent directories to locate a config', async () => {
		const dir = await makeFixture(
			'parent',
			`export default { documentRoot: './pages' };`,
		);
		const deep = path.join(dir, 'a', 'b', 'c');
		await fs.mkdir(deep, { recursive: true });
		const { configPath } = await resolveConfig(deep);
		expect(configPath).toBe(path.join(dir, 'burgereditor.config.mjs'));
	});

	test('resolves a relative documentRoot against the config file directory', async () => {
		const dir = await makeFixture(
			'relative',
			`export default { documentRoot: 'pages' };`,
		);
		const { config } = await resolveConfig(dir);
		expect(config.documentRoot).toBe(path.join(dir, 'pages'));
	});

	test('keeps an absolute documentRoot verbatim', async () => {
		const absoluteRoot = path.join(FIXTURE_ROOT, '_absolute-target');
		await fs.mkdir(absoluteRoot, { recursive: true });
		const dir = await makeFixture(
			'absolute',
			`export default { documentRoot: ${JSON.stringify(absoluteRoot)} };`,
		);
		const { config } = await resolveConfig(dir);
		expect(config.documentRoot).toBe(absoluteRoot);
	});

	test('trims newFileContent', async () => {
		const dir = await makeFixture(
			'newfile',
			`export default {
				newFileContent: '\\n\\n<div class="content"></div>\\n\\n',
			};`,
		);
		const { config } = await resolveConfig(dir);
		expect(config.newFileContent).toBe('<div class="content"></div>');
	});

	test('expands a string filesDir into the same paths for every FileType', async () => {
		const dir = await makeFixture(
			'filesdir-string',
			`export default { filesDir: 'media' };`,
		);
		const { config } = await resolveConfig(dir);
		const expectedServer = path.join(dir, 'media');
		expect(config.filesDir.image.serverPath).toBe(expectedServer);
		expect(config.filesDir.pdf.serverPath).toBe(expectedServer);
		expect(config.filesDir.video.serverPath).toBe(expectedServer);
		expect(config.filesDir.audio.serverPath).toBe(expectedServer);
		expect(config.filesDir.other.serverPath).toBe(expectedServer);
	});

	test('falls back to "other" filesDir entry when a specific type is missing', async () => {
		const dir = await makeFixture(
			'filesdir-partial',
			`export default { filesDir: { other: 'all', image: 'images' } };`,
		);
		const { config } = await resolveConfig(dir);
		expect(config.filesDir.image.serverPath).toBe(path.join(dir, 'images'));
		expect(config.filesDir.pdf.serverPath).toBe(path.join(dir, 'all'));
		expect(config.filesDir.video.serverPath).toBe(path.join(dir, 'all'));
	});

	test('exposes virtualTree overrides verbatim', async () => {
		const dir = await makeFixture(
			'virtual',
			`export default { virtualTree: { enabled: true, pathKey: 'slug' } };`,
		);
		const { config } = await resolveConfig(dir);
		expect(config.virtualTree).toEqual({ enabled: true, pathKey: 'slug' });
	});
});
