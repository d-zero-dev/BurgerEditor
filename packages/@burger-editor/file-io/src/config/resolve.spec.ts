import fs from 'node:fs/promises';
import path from 'node:path';

import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from 'vitest';

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
	// A BGE_CONFIG exported in the developer's shell would otherwise bypass
	// the search every case below relies on.
	// eslint-disable-next-line unicorn/no-useless-undefined -- `undefined` is how vi.stubEnv removes a variable; the argument is required
	vi.stubEnv('BGE_CONFIG', undefined);
});

afterEach(() => {
	vi.unstubAllEnvs();
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

describe('resolveConfig — a config file named explicitly', () => {
	/**
	 * A project holding a main config (found by the search) and a sub-site
	 * config under a non-standard name (reachable only when named).
	 * @param name
	 */
	async function makeTwoSiteFixture(name: string) {
		const dir = await makeFixture(name, `export default { documentRoot: './main' };`);
		const childPath = path.join(dir, 'burgereditor.child.config.mjs');
		await fs.writeFile(childPath, `export default { documentRoot: './child' };`, 'utf8');
		return { dir, childPath };
	}

	test('loads a file under any name given as configPath, resolving its relative paths against that file', async () => {
		const { dir, childPath } = await makeTwoSiteFixture('explicit-basic');
		const { config, configPath } = await resolveConfig(undefined, {
			configPath: childPath,
		});
		expect(configPath).toBe(childPath);
		expect(config.documentRoot).toBe(path.join(dir, 'child'));
	});

	test('configPath wins over the config the search from searchFrom would find', async () => {
		const { dir, childPath } = await makeTwoSiteFixture('explicit-over-search');
		const { configPath } = await resolveConfig(dir, { configPath: childPath });
		expect(configPath).toBe(childPath);
	});

	test('a relative configPath resolves against process.cwd(), not searchFrom', async () => {
		const { childPath } = await makeTwoSiteFixture('explicit-relative');
		const relative = path.relative(process.cwd(), childPath);
		const { configPath } = await resolveConfig(FIXTURE_ROOT, { configPath: relative });
		expect(configPath).toBe(childPath);
	});

	test('BGE_CONFIG names the file when configPath is omitted', async () => {
		const { dir, childPath } = await makeTwoSiteFixture('explicit-env');
		vi.stubEnv('BGE_CONFIG', childPath);
		const { configPath } = await resolveConfig(dir);
		expect(configPath).toBe(childPath);
	});

	test('configPath wins over BGE_CONFIG', async () => {
		const { dir, childPath } = await makeTwoSiteFixture('explicit-option-over-env');
		vi.stubEnv('BGE_CONFIG', path.join(dir, 'burgereditor.config.mjs'));
		const { configPath } = await resolveConfig(dir, { configPath: childPath });
		expect(configPath).toBe(childPath);
	});

	test('rejects a configPath that does not exist instead of falling back to defaults', async () => {
		const missing = path.join(FIXTURE_ROOT, 'no-such.config.mjs');
		await expect(resolveConfig(undefined, { configPath: missing })).rejects.toThrow(
			`Config file not found: ${missing}`,
		);
	});

	test('names BGE_CONFIG in the error when the missing file came from it', async () => {
		const missing = path.join(FIXTURE_ROOT, 'no-such-env.config.mjs');
		vi.stubEnv('BGE_CONFIG', missing);
		await expect(resolveConfig()).rejects.toThrow(
			`Config file not found: ${missing} (from BGE_CONFIG=${missing})`,
		);
	});

	test('rejects a configPath that names a directory, saying so rather than "not found"', async () => {
		const { dir } = await makeTwoSiteFixture('explicit-directory');
		await expect(resolveConfig(undefined, { configPath: dir })).rejects.toThrow(
			`Config path is not a file: ${dir}`,
		);
	});

	test('a missing parent directory is reported as not found', async () => {
		const { childPath } = await makeTwoSiteFixture('explicit-under-file');
		// A path *through* a file (ENOTDIR), e.g. a typo'd directory segment.
		const through = path.join(childPath, 'burgereditor.config.mjs');
		await expect(resolveConfig(undefined, { configPath: through })).rejects.toThrow(
			`Config file not found: ${through}`,
		);
	});

	test('an empty BGE_CONFIG is ignored and the search runs', async () => {
		const { dir } = await makeTwoSiteFixture('explicit-empty-env');
		vi.stubEnv('BGE_CONFIG', '');
		const { configPath } = await resolveConfig(dir);
		expect(configPath).toBe(path.join(dir, 'burgereditor.config.mjs'));
	});
});
