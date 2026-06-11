import type { CliContext } from './context.js';
import type { BlockCatalog } from '@burger-editor/core';
import type { BurgerEditorConfig } from '@burger-editor/file-io';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { defaultCatalog } from '@burger-editor/blocks';
// dom-shim side-effect — must come before any handler call that touches DOMParser.
import '@burger-editor/file-io';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	blockDelete,
	blockGet,
	blockInsert,
	blockList,
	blockMove,
	blockReplace,
	catalogGet,
	catalogList,
	configResolve,
	containerOptionsList,
	frontMatterGet,
	frontMatterSet,
	itemList,
	itemSchema,
	pageConcat,
	pageCopy,
	pageCreate,
	pageDelete,
	pageGet,
	pageList,
	pageRename,
	styleOptionsList,
} from './handlers.js';

const EDITABLE_AREA = '.content';

// Fragment-style page with two blocks under `.content`.
/**
 *
 */
function samplePageHtml(): string {
	return `---
title: 'Test Page'
---
<div class="content">
	<div data-bge-name="h2" data-bge-container="inline:immutable">
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item>
					<div data-bgi="title-h2" data-bgi-ver="0.0.0"><h2 data-bge="title-h2">最初の見出し</h2></div>
				</div>
			</div>
		</div>
	</div>
	<div data-bge-name="wysiwyg" data-bge-container="grid:1">
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item>
					<div data-bgi="wysiwyg" data-bgi-ver="0.0.0"><div data-bge="wysiwyg"><p>本文1</p></div></div>
				</div>
			</div>
		</div>
	</div>
</div>`;
}

/**
 *
 * @param documentRoot
 * @param assetsRoot
 * @param overrides
 */
function makeConfig(
	documentRoot: string,
	assetsRoot: string,
	overrides: Partial<BurgerEditorConfig> = {},
): BurgerEditorConfig {
	const catalog: BlockCatalog = overrides.catalog ?? defaultCatalog;
	return {
		version: 'test',
		port: 0,
		host: 'localhost',
		documentRoot,
		assetsRoot,
		lang: 'en',
		stylesheets: [],
		classList: [],
		editableArea: EDITABLE_AREA,
		indexFileName: 'index.html',
		filesDir: {
			image: { serverPath: assetsRoot, clientPath: '/' },
			pdf: { serverPath: assetsRoot, clientPath: '/' },
			video: { serverPath: assetsRoot, clientPath: '/' },
			audio: { serverPath: assetsRoot, clientPath: '/' },
			other: { serverPath: assetsRoot, clientPath: '/' },
		},
		sampleImagePath: '/sample.png',
		sampleFilePath: '/sample.pdf',
		googleMapsApiKey: null,
		open: false,
		newFileContent: `---
title: 'New Page'
---
<div class="content"></div>`,
		catalog,
		enableImportBlock: false,
		healthCheck: { enabled: false, interval: 0, retryCount: 0 },
		virtualTree: { enabled: false, pathKey: 'path' },
		...overrides,
	};
}

let tmpRoot = '';
let docRoot = '';
let assetsRoot = '';
let ctx: CliContext = {} as CliContext;

beforeEach(async () => {
	tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bge-cli-handlers-'));
	docRoot = path.join(tmpRoot, 'src');
	assetsRoot = path.join(tmpRoot, 'public');
	await fs.mkdir(docRoot, { recursive: true });
	await fs.mkdir(assetsRoot, { recursive: true });
	await fs.writeFile(path.join(docRoot, 'about.html'), samplePageHtml(), 'utf8');
	ctx = {
		config: makeConfig(docRoot, assetsRoot),
		configPath: null,
		resolverState: null,
	};
});

afterEach(async () => {
	await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
});

describe('catalog handlers', () => {
	test('catalogList returns every block definition with its category and label', () => {
		const result = catalogList(ctx);
		expect(result.catalogs.length).toBeGreaterThan(0);
		const h2 = result.catalogs.find((c) => c.name === 'h2');
		expect(h2).toBeDefined();
		expect(h2?.category).toBe('見出し');
		expect(h2?.label).toBe('大見出し');
	});

	test('catalogGet returns a single definition by name', () => {
		const result = catalogGet(ctx, 'wysiwyg');
		expect(result.definition.name).toBe('wysiwyg');
		expect(result.label).toBe('テキスト');
	});

	test('catalogGet throws on an unknown catalog name', () => {
		expect(() => catalogGet(ctx, 'nope')).toThrow(/Unknown catalog block name: "nope"/);
	});
});

describe('item handlers', () => {
	test('itemList returns the canonical item name set', () => {
		const result = itemList();
		expect(result.items).toContain('title-h2');
		expect(result.items).toContain('wysiwyg');
		expect(result.items).toContain('image');
	});

	test('itemSchema returns template and editor for a known item', () => {
		const result = itemSchema('title-h2');
		expect(result.name).toBe('title-h2');
		expect(result.template).toContain('data-bge="title-h2"');
		expect(result.editor).toContain('name="bge-title-h2"');
	});

	test('itemSchema throws on an unknown item name', () => {
		expect(() => itemSchema('nonexistent')).toThrow(/Unknown item: "nonexistent"/);
	});
});

describe('config handler', () => {
	test('configResolve summarises the active config', () => {
		const result = configResolve(ctx);
		expect(result.documentRoot).toBe(docRoot);
		expect(result.editableArea).toBe(EDITABLE_AREA);
		expect(result.virtualTree.enabled).toBe(false);
	});
});

describe('container options handler', () => {
	test('containerOptionsList enumerates the static container layout vocabulary', () => {
		const result = containerOptionsList();
		expect(result.types).toEqual(['grid', 'inline', 'float']);
		expect(result.gridOptions.columns).toEqual([1, 2, 3, 4, 5]);
		expect(result.inlineOptions.justify).toContain('center');
	});
});

describe('page handlers', () => {
	test('pageList returns a tree rooted at documentRoot', async () => {
		const result = await pageList(ctx);
		expect(result.documentRoot).toBe(docRoot);
		const names = result.tree.map((e) => e.name);
		expect(names).toContain('about.html');
	});

	test('pageGet returns Front Matter and content', async () => {
		const result = await pageGet(ctx, 'about.html');
		expect(result.frontMatter.title).toBe('Test Page');
		expect(result.hasFrontMatter).toBe(true);
		expect(result.content).toContain('class="content"');
	});

	test('pageCreate writes a new file from the configured template', async () => {
		await pageCreate(ctx, 'fresh.html', { frontMatter: { title: 'Fresh' } });
		const raw = await fs.readFile(path.join(docRoot, 'fresh.html'), 'utf8');
		expect(raw).toContain('title: Fresh');
		expect(raw).toContain('class="content"');
	});

	test('pageCreate refuses to overwrite an existing page', async () => {
		await expect(pageCreate(ctx, 'about.html')).rejects.toThrow(/already exists/);
	});

	test('pageCreate is atomic — concurrent calls produce exactly one success', async () => {
		// Pins the fs.writeFile flag:'wx' fix. The previous access-then-write
		// implementation could let two concurrent calls both pass the check
		// and silently overwrite each other.
		const results = await Promise.allSettled([
			pageCreate(ctx, 'race.html', { frontMatter: { title: 'A' } }),
			pageCreate(ctx, 'race.html', { frontMatter: { title: 'B' } }),
		]);
		const fulfilled = results.filter((r) => r.status === 'fulfilled');
		const rejected = results.filter((r) => r.status === 'rejected');
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);
		expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(Error);
		expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(
			/already exists/,
		);
	});

	test('pageCreate seeds the page with the supplied initial blocks', async () => {
		await pageCreate(ctx, 'seeded.html', {
			blocks: [
				{
					catalog: 'h2',
					items: [[{ name: 'title-h2', data: { titleH2: 'シード見出し' } }]],
				},
			],
		});
		const raw = await fs.readFile(path.join(docRoot, 'seeded.html'), 'utf8');
		expect(raw).toContain('data-bge-name="h2"');
		expect(raw).toContain('シード見出し');
	});

	test('pageDelete removes the file', async () => {
		await pageDelete(ctx, 'about.html');
		await expect(fs.access(path.join(docRoot, 'about.html'))).rejects.toThrow();
	});

	test('pageRename moves the file to a new path', async () => {
		await pageRename(ctx, 'about.html', 'company/about.html');
		await expect(fs.access(path.join(docRoot, 'about.html'))).rejects.toThrow();
		await expect(
			fs.access(path.join(docRoot, 'company/about.html')),
		).resolves.toBeUndefined();
	});

	test('pageRename cleans up freshly-created target directories when rename fails', async () => {
		// chmod 0o555 makes the parent dir read+execute-only — mkdir succeeds
		// (we create children of THAT parent's children, which is allowed
		// because mkdir checks ancestor permission), but rename INTO a path
		// under the readonly tree fails with EACCES. Verifies rollback even
		// in the EACCES branch (not just EXDEV).
		const readonlyParent = path.join(docRoot, 'readonly');
		await fs.mkdir(readonlyParent);
		await fs.chmod(readonlyParent, 0o555);
		try {
			await expect(
				pageRename(ctx, 'about.html', 'readonly/nested/deeper/new.html'),
			).rejects.toThrow();
			// `readonly/nested/deeper` must NOT remain on disk.
			await expect(fs.access(path.join(readonlyParent, 'nested'))).rejects.toMatchObject({
				code: 'ENOENT',
			});
		} finally {
			await fs.chmod(readonlyParent, 0o755);
		}
	});

	test('pageCopy duplicates the file', async () => {
		await pageCopy(ctx, 'about.html', 'about-copy.html');
		const original = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		const copy = await fs.readFile(path.join(docRoot, 'about-copy.html'), 'utf8');
		expect(copy).toBe(original);
	});

	test('pageConcat rejects an empty sources array to match the MCP page_concat schema', async () => {
		await expect(pageConcat(ctx, 'about.html', [])).rejects.toThrow(
			/at least one source/,
		);
	});

	test('pageConcat rejects when a source path does not exist and does NOT auto-create it', async () => {
		// loadContent would silently create missing files via newFileContent —
		// fine for target, dangerous for source. The handler must reject AND
		// leave no stray file on disk.
		await expect(pageConcat(ctx, 'about.html', ['no-such-source.html'])).rejects.toThrow(
			/source does not exist/,
		);
		await expect(
			fs.access(path.join(docRoot, 'no-such-source.html')),
		).rejects.toMatchObject({ code: 'ENOENT' });
	});

	test('pageConcat appends source editable content onto the target', async () => {
		// Set up a second page with one h2 block.
		await pageCreate(ctx, 'extra.html', {
			frontMatter: { title: 'Extra' },
			blocks: [
				{
					catalog: 'h2',
					items: [[{ name: 'title-h2', data: { titleH2: '追加見出し' } }]],
				},
			],
		});

		await pageConcat(ctx, 'about.html', ['extra.html']);
		const blocks = await blockList(ctx, 'about.html');
		const names = blocks.blocks.map((b) => b.data.name);
		// Original target had [h2, wysiwyg]; after concat we expect the
		// source's h2 appended → [h2, wysiwyg, h2].
		expect(names).toEqual(['h2', 'wysiwyg', 'h2']);
	});
});

describe('front matter handlers', () => {
	test('frontMatterGet returns the parsed Front Matter', async () => {
		const result = await frontMatterGet(ctx, 'about.html');
		expect(result.frontMatter).toEqual({ title: 'Test Page' });
	});

	test('frontMatterSet merges by default', async () => {
		await frontMatterSet(ctx, 'about.html', { description: 'desc' }, true);
		const got = await frontMatterGet(ctx, 'about.html');
		expect(got.frontMatter).toEqual({ title: 'Test Page', description: 'desc' });
	});

	test('frontMatterSet replaces entirely when merge=false', async () => {
		await frontMatterSet(ctx, 'about.html', { description: 'desc' }, false);
		const got = await frontMatterGet(ctx, 'about.html');
		expect(got.frontMatter).toEqual({ description: 'desc' });
	});
});

describe('block handlers', () => {
	test('blockList returns metadata + parsed item data per block', async () => {
		const result = await blockList(ctx, 'about.html');
		expect(result.blocks).toHaveLength(2);
		expect(result.blocks[0]!.data.name).toBe('h2');
		expect(result.blocks[0]!.data.items[0]![0]).toMatchObject({
			name: 'title-h2',
			data: { titleH2: '最初の見出し' },
		});
		expect(result.blocks[1]!.data.name).toBe('wysiwyg');
	});

	test('blockGet returns a single block by index', async () => {
		const result = await blockGet(ctx, 'about.html', 1);
		expect(result.block.data.name).toBe('wysiwyg');
	});

	test('blockInsert at index 0 prepends a block', async () => {
		await blockInsert(ctx, 'about.html', 0, {
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '挿入見出し' } }]],
		});
		const result = await blockList(ctx, 'about.html');
		expect(result.blocks).toHaveLength(3);
		expect(result.blocks[0]!.data.items[0]![0]).toMatchObject({
			data: { titleH2: '挿入見出し' },
		});
	});

	test('blockInsert at a large index appends a block', async () => {
		await blockInsert(ctx, 'about.html', 999, {
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '末尾見出し' } }]],
		});
		const result = await blockList(ctx, 'about.html');
		expect(result.blocks.at(-1)!.data.items[0]![0]).toMatchObject({
			data: { titleH2: '末尾見出し' },
		});
	});

	test('blockReplace substitutes the targeted block', async () => {
		await blockReplace(ctx, 'about.html', 0, {
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '差し替え見出し' } }]],
		});
		const result = await blockList(ctx, 'about.html');
		expect(result.blocks).toHaveLength(2);
		expect(result.blocks[0]!.data.items[0]![0]).toMatchObject({
			data: { titleH2: '差し替え見出し' },
		});
	});

	test('blockDelete removes the targeted block', async () => {
		await blockDelete(ctx, 'about.html', 0);
		const result = await blockList(ctx, 'about.html');
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]!.data.name).toBe('wysiwyg');
	});

	test('blockMove reorders blocks', async () => {
		await blockMove(ctx, 'about.html', 0, 1);
		const result = await blockList(ctx, 'about.html');
		expect(result.blocks.map((b) => b.data.name)).toEqual(['wysiwyg', 'h2']);
	});
});

describe('style options handler', () => {
	test('styleOptionsList extracts every --bge-options-<axis>--<variant> pair', async () => {
		const css = `
			:root {
				--bge-options-margin--small: 1rem;
				--bge-options-margin--large: 3rem;
				--bge-options-bgcolor--blue: #00f;
				--unrelated: 0;
			}
		`;
		await fs.writeFile(path.join(assetsRoot, 'style.css'), css, 'utf8');
		const ctxWithCss: CliContext = {
			...ctx,
			config: makeConfig(docRoot, assetsRoot, { stylesheets: ['/style.css'] }),
		};
		const result = await styleOptionsList(ctxWithCss);
		expect(result.axes).toEqual({
			margin: ['large', 'small'],
			bgcolor: ['blue'],
		});
	});

	test('styleOptionsList returns an empty record when no stylesheets exist', async () => {
		const result = await styleOptionsList(ctx);
		expect(result.axes).toEqual({});
	});

	test('styleOptionsList skips axes that have hyphenated variant names with a stray --', async () => {
		// Defensive case: the regex requires word-only segments separated by
		// single hyphens, so `--bge-options-margin--x-large` parses as
		// axis=margin variant=x-large but ambiguous patterns like
		// `--bge-options-foo--bar--baz` (double `--` inside a variant) MUST NOT
		// parse — we treat them as malformed and skip.
		const css = `
			:root {
				--bge-options-margin--x-large: 5rem;
				--bge-options-foo--bar--baz: nope;
			}
		`;
		await fs.writeFile(path.join(assetsRoot, 'odd.css'), css, 'utf8');
		const ctxWithCss: CliContext = {
			...ctx,
			config: makeConfig(docRoot, assetsRoot, { stylesheets: ['/odd.css'] }),
		};
		const result = await styleOptionsList(ctxWithCss);
		expect(result.axes).toEqual({ margin: ['x-large'] });
	});
});
