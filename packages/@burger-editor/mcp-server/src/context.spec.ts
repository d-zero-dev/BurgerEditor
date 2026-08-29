import fs from 'node:fs/promises';
import path from 'node:path';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { __resetV4ContextCache, getContext } from './context.js';

let stack: AsyncDisposableStack;
let brokenProject: string;
let validProject: string;

const VALID_CONFIG = `import { defaultCatalog } from '@burger-editor/blocks';
export default {
	documentRoot: './src',
	assetsRoot: './src',
	editableArea: '.content',
	catalog: defaultCatalog,
	newFileContent: '<div class="content"></div>',
};
`;

// Two sibling fixtures rather than one file rewritten in place: Node caches
// an ES module by URL (a failed evaluation included), so a config that
// threw once keeps throwing from the loader's cache no matter what is on
// disk. Moving cwd to a project whose config loads is the way "the user
// fixed the cause" can be observed by getContext().
beforeAll(async () => {
	stack = new AsyncDisposableStack();
	const originalCwd = process.cwd();
	const tmp = await mkdtempDisposable(
		path.join(path.resolve(import.meta.dirname, '../../'), '.tmp-context-spec-'),
	);
	stack.use(tmp);
	stack.defer(() => {
		process.chdir(originalCwd);
		__resetV4ContextCache();
	});

	brokenProject = path.join(tmp.path, 'broken');
	await fs.mkdir(path.join(brokenProject, 'src'), { recursive: true });
	await fs.writeFile(
		path.join(brokenProject, 'burgereditor.config.mjs'),
		`throw new Error('config file is broken');\n`,
		'utf8',
	);

	validProject = path.join(tmp.path, 'valid');
	await fs.mkdir(path.join(validProject, 'src'), { recursive: true });
	await fs.writeFile(
		path.join(validProject, 'burgereditor.config.mjs'),
		VALID_CONFIG,
		'utf8',
	);
});

afterAll(async () => {
	await stack.disposeAsync();
});

beforeEach(() => {
	__resetV4ContextCache();
});

describe('getContext', () => {
	test('a failed load is not cached: once the cause is fixed, the next call succeeds without a reset', async () => {
		process.chdir(brokenProject);
		await expect(getContext()).rejects.toThrow('config file is broken');

		process.chdir(validProject);
		const ctx = await getContext();
		expect(ctx.configPath).toBe(path.join(validProject, 'burgereditor.config.mjs'));
		expect(ctx.config.documentRoot).toBe(path.join(validProject, 'src'));
	});

	test('a failed load keeps failing while the cause persists (no stale success is served either)', async () => {
		process.chdir(brokenProject);
		await expect(getContext()).rejects.toThrow('config file is broken');
		await expect(getContext()).rejects.toThrow('config file is broken');
	});

	test('a successful load is cached: repeated calls resolve to the same context object', async () => {
		process.chdir(validProject);
		const first = await getContext();
		const second = await getContext();
		expect(second).toBe(first);
	});
});
