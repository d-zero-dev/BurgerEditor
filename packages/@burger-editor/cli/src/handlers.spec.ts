import type { CliContext } from './context.js';
import type { BlockCatalog } from '@burger-editor/core';
import type { BurgerEditorConfig } from '@burger-editor/file-io';

import fs from 'node:fs/promises';
import path from 'node:path';

import { defaultCatalog } from '@burger-editor/blocks';
import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
// dom-shim side-effect — must come before any handler call that touches DOMParser.
import '@burger-editor/file-io';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { chmodScoped } from './__tests__/disposables.js';
import {
	PageAlreadyExistsError,
	blockDelete,
	blockDuplicate,
	blockEnsureId,
	blockGet,
	blockInsert,
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
	itemUpdate,
	pageConcat,
	pageCopy,
	pageCreate,
	pageDelete,
	pageGet,
	pageList,
	pageRename,
	readBlocks,
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
		agent: { enabled: true },
		...overrides,
	};
}

let tmp: ({ path: string } & AsyncDisposable) | null = null;
let docRoot = '';
let assetsRoot = '';
let ctx: CliContext = {} as CliContext;

beforeEach(async () => {
	tmp = await mkdtempDisposable('bge-cli-handlers-');
	docRoot = path.join(tmp.path, 'src');
	assetsRoot = path.join(tmp.path, 'public');
	await fs.mkdir(docRoot, { recursive: true });
	await fs.mkdir(assetsRoot, { recursive: true });
	await fs.writeFile(path.join(docRoot, 'about.html'), samplePageHtml(), 'utf8');
	ctx = {
		config: makeConfig(docRoot, assetsRoot),
		configPath: null,
		resolverState: null,
		invalidPages: [],
	};
});

afterEach(async () => {
	await tmp?.[Symbol.asyncDispose]();
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

	test('catalogGet includes a ready-to-insert template with expanded items and data shape', () => {
		// The raw `definition.items` is just item names; the `template`
		// field expands each to `{name, data: {<camelKey>: ""}}` so an
		// agent can pass it straight to `block-insert --spec` without
		// reverse-engineering the dataKeys.
		const result = catalogGet(ctx, 'h2');
		expect(result.template).toMatchObject({
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '' } }]],
		});
		expect(result.template.containerProps).toBeDefined();
	});

	test('catalogGet template for the `wysiwyg` catalog expands the wysiwyg data slot (regression)', () => {
		// Was broken in the editor-regex era: dataKeys for wysiwyg returned []
		// because <bge-wysiwyg-editor> isn't <input|select|textarea>, so the
		// template included `data: {}` and the agent's `block-insert --spec
		// <template>` rendered an empty body.
		const result = catalogGet(ctx, 'wysiwyg');
		expect(result.template.items).toEqual([[{ name: 'wysiwyg', data: { wysiwyg: '' } }]]);
	});

	test('catalogGet template for the `image` catalog expands ALL image data-bge slots, no `[]` suffix', () => {
		// Was broken: editor.html has name="bge-path[]" etc. and the old
		// kebabToCamel preserved the brackets. Now driven by template
		// data-bge, the data shape is the full frozen-patty key set.
		const result = catalogGet(ctx, 'image');
		const item = result.template.items[0]![0] as {
			name: string;
			data: Record<string, unknown>;
		};
		expect(item.name).toBe('image');
		expect(Object.keys(item.data).toSorted()).toEqual([
			'alt',
			'aspectRatio',
			'caption',
			'command',
			'height',
			'href',
			'loading',
			'media',
			'node',
			'path',
			'scale',
			'scaleType',
			'style',
			'target',
			'width',
		]);
		// No bracket suffix on any key — pin the format too.
		expect(Object.keys(item.data).some((k) => k.includes('['))).toBe(false);
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

	test('itemSchema returns template and data fields for a known item', () => {
		const result = itemSchema('title-h2');
		expect(result.name).toBe('title-h2');
		expect(result.template).toContain('data-bge="title-h2"');
		expect(result.fields).toContain('titleH2');
	});

	test('itemSchema dataKeys derives from template data-bge attrs (the runtime contract)', () => {
		// Pin the template-based derivation. For simple items editor.name and
		// template.data-bge agree; for wysiwyg / image / details they diverge,
		// and template is the source of truth.
		expect(itemSchema('title-h2').dataKeys).toEqual(['titleH2']);
		expect(itemSchema('hr').dataKeys).toEqual(['kind']);
	});

	test('itemSchema wysiwyg.dataKeys uses the template, not the <bge-wysiwyg-editor> custom element in editor.html', () => {
		// Regression: the old editor-regex implementation matched only
		// <input|select|textarea>, so wysiwyg.dataKeys was [] even though the
		// runtime data key is 'wysiwyg' per <div data-bge="wysiwyg">.
		const result = itemSchema('wysiwyg');
		expect(result.dataKeys).toEqual(['wysiwyg']);
	});

	test('itemSchema image.dataKeys pins the exact frozen-patty key set (no `[]`, no missing slots)', () => {
		// Regression: editor.html has name="bge-path[]" / "bge-alt[]" etc.;
		// the old kebabToCamel preserved the literal `[]` suffix, producing
		// invalid keys like 'path[]'. Pin the EXACT set so future frozen-patty
		// changes that drop a key (or add a stray one) are caught.
		const result = itemSchema('image');
		expect([...result.dataKeys].toSorted()).toEqual([
			'alt',
			'aspectRatio',
			'caption',
			'command',
			'height',
			'href',
			'loading',
			'media',
			'node',
			'path',
			'scale',
			'scaleType',
			'style',
			'target',
			'width',
		]);
	});

	test('itemSchema details.dataKeys captures the bge-wysiwyg-editor content slot', () => {
		// Regression: details has <bge-wysiwyg-editor name="bge-content"> which
		// the old regex missed. Template-derived keys include 'content'.
		const result = itemSchema('details');
		expect(result.dataKeys).toContain('open');
		expect(result.dataKeys).toContain('summary');
		expect(result.dataKeys).toContain('content');
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

	test('pageList surfaces invalidPages from the resolver context', async () => {
		const ctxWithInvalid = {
			...ctx,
			invalidPages: [
				{
					file: '310010.html',
					reason: 'missing-key' as const,
					message: 'Front matter "path" missing in 310010.html',
				},
			],
		};
		const result = await pageList(ctxWithInvalid);
		expect(result.invalidPages).toHaveLength(1);
		expect(result.invalidPages[0]!.file).toBe('310010.html');
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

	// chmod 0o555 has no effect for the root user (CI runs as root in some
	// containers), so the rename would succeed instead of throwing EACCES.
	// Skip this OS-permission-dependent check in that case — the same rethrow
	// branch is covered independent of OS permissions by the fs.link-mocked
	// test below ('rethrows a non-EEXIST/EXDEV error from fs.link as-is').
	const isRoot = process.getuid?.() === 0;
	test.skipIf(isRoot)(
		'pageRename cleans up freshly-created target directories when rename fails',
		async () => {
			// chmod 0o555 makes the parent dir read+execute-only — mkdir succeeds
			// (we create children of THAT parent's children, which is allowed
			// because mkdir checks ancestor permission), but renameNoClobber's
			// fs.link INTO a path under the readonly tree fails with EACCES.
			// Verifies rollback on a real OS-level rethrown error, not just the
			// mocked one below.
			const readonlyParent = path.join(docRoot, 'readonly');
			await fs.mkdir(readonlyParent);
			await using _ = await chmodScoped(readonlyParent, 0o555);
			await expect(
				pageRename(ctx, 'about.html', 'readonly/nested/deeper/new.html'),
			).rejects.toThrow();
			// `readonly/nested/deeper` must NOT remain on disk.
			await expect(fs.access(path.join(readonlyParent, 'nested'))).rejects.toMatchObject({
				code: 'ENOENT',
			});
		},
	);

	test('pageRename rethrows a non-EEXIST/EXDEV error from fs.link as-is (permission-independent)', async () => {
		// Independent of OS/root permissions (unlike the chmod-based test above):
		// mock fs.link directly so this rethrow branch is always exercised, in
		// CI containers that run as root too.
		const linkSpy = vi.spyOn(fs, 'link').mockImplementationOnce(() => {
			return Promise.reject(Object.assign(new Error('mocked EPERM'), { code: 'EPERM' }));
		});
		try {
			await expect(pageRename(ctx, 'about.html', 'moved.html')).rejects.toMatchObject({
				code: 'EPERM',
			});
			// Nothing renamed — the source must still be exactly where it was.
			await expect(fs.access(path.join(docRoot, 'about.html'))).resolves.toBeUndefined();
		} finally {
			linkSpy.mockRestore();
		}
	});

	test('pageRename falls back to check-then-rename on EXDEV (cross-device) and still moves the file', async () => {
		const linkSpy = vi.spyOn(fs, 'link').mockImplementationOnce(() => {
			return Promise.reject(Object.assign(new Error('mocked EXDEV'), { code: 'EXDEV' }));
		});
		try {
			await pageRename(ctx, 'about.html', 'moved-cross-device.html');
			await expect(fs.access(path.join(docRoot, 'about.html'))).rejects.toThrow();
			await expect(
				fs.access(path.join(docRoot, 'moved-cross-device.html')),
			).resolves.toBeUndefined();
		} finally {
			linkSpy.mockRestore();
		}
	});

	test('pageRename EXDEV fallback still refuses to clobber an existing destination', async () => {
		await pageCreate(ctx, 'taken-cross-device.html');
		const linkSpy = vi.spyOn(fs, 'link').mockImplementationOnce(() => {
			return Promise.reject(Object.assign(new Error('mocked EXDEV'), { code: 'EXDEV' }));
		});
		try {
			await expect(
				pageRename(ctx, 'about.html', 'taken-cross-device.html'),
			).rejects.toThrow(PageAlreadyExistsError);
		} finally {
			linkSpy.mockRestore();
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
		const blocks = await readBlocks(ctx, 'about.html');
		const names = blocks.map((b) => b.data.name);
		// Original target had [h2, wysiwyg]; after concat we expect the
		// source's h2 appended → [h2, wysiwyg, h2].
		expect(names).toEqual(['h2', 'wysiwyg', 'h2']);
	});

	test('pageRename refuses to clobber an existing destination', async () => {
		await pageCreate(ctx, 'taken.html');
		await expect(pageRename(ctx, 'about.html', 'taken.html')).rejects.toThrow(
			PageAlreadyExistsError,
		);
		// Neither file changed.
		await expect(fs.access(path.join(docRoot, 'about.html'))).resolves.toBeUndefined();
	});

	test('pageCopy refuses to clobber an existing destination', async () => {
		await pageCreate(ctx, 'taken.html');
		await expect(pageCopy(ctx, 'about.html', 'taken.html')).rejects.toThrow(
			PageAlreadyExistsError,
		);
	});

	test('pageCreate refusal is a PageAlreadyExistsError', async () => {
		await expect(pageCreate(ctx, 'about.html')).rejects.toThrow(PageAlreadyExistsError);
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

	test('frontMatterSet rejects an array patch — bin.ts gate is not the only line of defense', async () => {
		// MCP / programmatic callers bypass bin.ts. The handler itself must
		// refuse arrays, otherwise the merge would silently write numeric-
		// index keys ('0', '1', ...) into Front Matter.
		await expect(
			frontMatterSet(
				ctx,
				'about.html',
				['a', 'b'] as unknown as Record<string, unknown>,
				true,
			),
		).rejects.toThrow(/array/i);
		// File must be untouched on rejection.
		const got = await frontMatterGet(ctx, 'about.html');
		expect(got.frontMatter).toEqual({ title: 'Test Page' });
	});
});

describe('block handlers', () => {
	test('readBlocks returns metadata + parsed item data per block', async () => {
		const result = await readBlocks(ctx, 'about.html');
		expect(result).toHaveLength(2);
		expect(result[0]!.data.name).toBe('h2');
		expect(result[0]!.data.items[0]![0]).toMatchObject({
			name: 'title-h2',
			data: { titleH2: '最初の見出し' },
		});
		expect(result[1]!.data.name).toBe('wysiwyg');
	});

	test('blockGet returns a single block by index target', async () => {
		const result = await blockGet(ctx, 'about.html', { index: 1 });
		expect(result.block.data.name).toBe('wysiwyg');
	});

	test('blockGet resolves an id target to the block carrying that id', async () => {
		const ensured = await blockEnsureId(ctx, 'about.html', { index: 1 });
		const result = await blockGet(ctx, 'about.html', { id: ensured.id });
		expect(result.block.data.name).toBe('wysiwyg');
	});

	test('blockGet throws when neither index nor id is given', async () => {
		await expect(blockGet(ctx, 'about.html', {})).rejects.toThrow(/index.*id/);
	});

	test('blockGet throws when an id target matches no block', async () => {
		await expect(blockGet(ctx, 'about.html', { id: 'bge-nope' })).rejects.toThrow(
			/No block with id/,
		);
	});

	test('blockInsert at index 0 prepends a block', async () => {
		await blockInsert(ctx, 'about.html', 0, {
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '挿入見出し' } }]],
		});
		const result = await readBlocks(ctx, 'about.html');
		expect(result).toHaveLength(3);
		expect(result[0]!.data.items[0]![0]).toMatchObject({
			data: { titleH2: '挿入見出し' },
		});
	});

	test('blockInsert at a large index appends a block', async () => {
		await blockInsert(ctx, 'about.html', 999, {
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '末尾見出し' } }]],
		});
		const result = await readBlocks(ctx, 'about.html');
		expect(result.at(-1)!.data.items[0]![0]).toMatchObject({
			data: { titleH2: '末尾見出し' },
		});
	});

	test('blockReplace substitutes the targeted block (index target)', async () => {
		await blockReplace(
			ctx,
			'about.html',
			{ index: 0 },
			{
				catalog: 'h2',
				items: [[{ name: 'title-h2', data: { titleH2: '差し替え見出し' } }]],
			},
		);
		const result = await readBlocks(ctx, 'about.html');
		expect(result).toHaveLength(2);
		expect(result[0]!.data.items[0]![0]).toMatchObject({
			data: { titleH2: '差し替え見出し' },
		});
	});

	test('blockReplace substitutes the targeted block (id target)', async () => {
		const ensured = await blockEnsureId(ctx, 'about.html', { index: 0 });
		await blockReplace(
			ctx,
			'about.html',
			{ id: ensured.id },
			{
				catalog: 'h2',
				items: [[{ name: 'title-h2', data: { titleH2: 'idで差し替え' } }]],
			},
		);
		const result = await readBlocks(ctx, 'about.html');
		expect(result[0]!.data.items[0]![0]).toMatchObject({
			data: { titleH2: 'idで差し替え' },
		});
	});

	test('blockDelete removes the targeted block', async () => {
		await blockDelete(ctx, 'about.html', { index: 0 });
		const result = await readBlocks(ctx, 'about.html');
		expect(result).toHaveLength(1);
		expect(result[0]!.data.name).toBe('wysiwyg');
	});

	test('blockMove reorders blocks', async () => {
		await blockMove(ctx, 'about.html', { index: 0 }, 1);
		const result = await readBlocks(ctx, 'about.html');
		expect(result.map((b) => b.data.name)).toEqual(['wysiwyg', 'h2']);
	});

	test('blockDuplicate inserts a copy right after the original, without its id', async () => {
		await blockEnsureId(ctx, 'about.html', { index: 0 });
		await blockDuplicate(ctx, 'about.html', { index: 0 });
		const result = await readBlocks(ctx, 'about.html');
		expect(result).toHaveLength(3);
		expect(result[0]!.data.name).toBe('h2');
		expect(result[1]!.data.name).toBe('h2');
		expect(result[1]!.data.id).toBeFalsy();
	});

	test('blockEnsureId assigns a bge-<n> id to an id-less block', async () => {
		const result = await blockEnsureId(ctx, 'about.html', { index: 0 });
		expect(result.created).toBe(true);
		expect(result.id).toMatch(/^bge-\d+$/);
		const blocks = await readBlocks(ctx, 'about.html');
		// blocks[].data.id has the `bge-` prefix stripped (BlockData's own
		// convention) — result.id is the full DOM id agents address blocks by.
		expect(`bge-${blocks[0]!.data.id}`).toBe(result.id);
	});

	test('blockEnsureId is idempotent — a second call returns the same id and does not reassign', async () => {
		const first = await blockEnsureId(ctx, 'about.html', { index: 0 });
		const second = await blockEnsureId(ctx, 'about.html', { index: 0 });
		expect(second.created).toBe(false);
		expect(second.id).toBe(first.id);
	});

	test('blockEnsureId picks a fresh id that does not collide with an existing one', async () => {
		await blockEnsureId(ctx, 'about.html', { index: 0 }); // -> bge-1
		const second = await blockEnsureId(ctx, 'about.html', { index: 1 });
		expect(second.id).not.toBe('bge-1');
	});

	test('itemUpdate merges new data into the targeted item, preserving other fields', async () => {
		await itemUpdate(ctx, 'about.html', { index: 1 }, 0, { wysiwyg: '<p>更新後</p>' });
		const result = await readBlocks(ctx, 'about.html');
		expect(result[1]!.data.items[0]![0]).toMatchObject({
			name: 'wysiwyg',
			data: { wysiwyg: '<p>更新後</p>' },
		});
	});

	test('itemUpdate throws when itemIndex is out of range', async () => {
		await expect(itemUpdate(ctx, 'about.html', { index: 0 }, 5, {})).rejects.toThrow(
			/Item index 5 out of range/,
		);
	});

	test('itemUpdate itemIndex stays aligned with page_blocks/parseHTMLToBlockData item counting, even past an item with no data-bgi wrapper', async () => {
		// Regression: getItemWrapperElements used to filter out items lacking a
		// [data-bgi] wrapper, knocking its itemIndex out of sync with the count
		// core's parseHTMLToBlockData reports for the same block (which
		// page_blocks / block_get expose). A page_blocks-derived itemIndex of 1 must not
		// silently land on the wrapper-less item 0's slot.
		const mixedPage = `<div class="content">
			<div data-bge-name="mixed" data-bge-container="grid:1">
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>raw content, no data-bgi wrapper here</div>
						<div data-bge-item>
							<div data-bgi="wysiwyg" data-bgi-ver="0.0.0"><div data-bge="wysiwyg"><p>本文2</p></div></div>
						</div>
					</div>
				</div>
			</div>
		</div>`;
		await fs.writeFile(path.join(docRoot, 'mixed.html'), mixedPage, 'utf8');

		// itemIndex 1 is the real (wrapped) item — must succeed and update it.
		await itemUpdate(ctx, 'mixed.html', { index: 0 }, 1, { wysiwyg: '<p>更新済み</p>' });
		const blocks = await readBlocks(ctx, 'mixed.html');
		expect(blocks[0]!.data.items[0]![1]).toMatchObject({
			name: 'wysiwyg',
			data: { wysiwyg: '<p>更新済み</p>' },
		});

		// itemIndex 0 is in range but has no data-bgi wrapper — must reject
		// clearly, not silently write into item 1's slot.
		await expect(itemUpdate(ctx, 'mixed.html', { index: 0 }, 0, {})).rejects.toThrow(
			/no data-bgi wrapper/,
		);
	});
});

describe('mutation dry-run', () => {
	test('blockInsert dry-run returns previewContent without writing to disk', async () => {
		const before = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		const result = await blockInsert(
			ctx,
			'about.html',
			0,
			{
				catalog: 'h2',
				items: [[{ name: 'title-h2', data: { titleH2: 'プレビュー' } }]],
			},
			{ dryRun: true },
		);
		expect(result.dryRun).toBe(true);
		expect((result as { previewContent?: string }).previewContent).toContain(
			'プレビュー',
		);
		// File on disk MUST be unchanged.
		const after = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		expect(after).toBe(before);
	});

	test('blockReplace dry-run preview shows the replacement but file is untouched', async () => {
		const before = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		const result = await blockReplace(
			ctx,
			'about.html',
			{ index: 0 },
			{
				catalog: 'h2',
				items: [[{ name: 'title-h2', data: { titleH2: 'preview-replace' } }]],
			},
			{ dryRun: true },
		);
		expect(result.dryRun).toBe(true);
		expect((result as { previewContent?: string }).previewContent).toContain(
			'preview-replace',
		);
		const after = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		expect(after).toBe(before);
	});

	test('blockDelete dry-run preview omits the targeted block but file is untouched', async () => {
		const before = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		const result = await blockDelete(ctx, 'about.html', { index: 0 }, { dryRun: true });
		expect(result.dryRun).toBe(true);
		// No `deleted` field on the result — the previous `deleted: !dryRun`
		// shape lied about a successful preview.
		expect((result as { deleted?: boolean }).deleted).toBeUndefined();
		expect((result as { previewContent?: string }).previewContent).not.toContain(
			'最初の見出し',
		);
		const after = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		expect(after).toBe(before);
	});

	test('blockMove dry-run preview reorders but file is untouched', async () => {
		const before = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		const result = await blockMove(ctx, 'about.html', { index: 0 }, 1, { dryRun: true });
		expect(result.dryRun).toBe(true);
		// No `moved` field — symmetric to blockDelete's removal of `deleted`.
		expect((result as { moved?: boolean }).moved).toBeUndefined();
		const after = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		expect(after).toBe(before);
	});

	test('dry-run on a non-existent page throws (must not create the file as a side effect)', async () => {
		const newPath = path.join(docRoot, 'never-existed.html');
		await expect(
			blockInsert(
				ctx,
				'never-existed.html',
				0,
				{ catalog: 'h2', items: [[{ name: 'title-h2', data: { titleH2: 'x' } }]] },
				{ dryRun: true },
			),
		).rejects.toThrow(/non-existent page/);
		await expect(fs.access(newPath)).rejects.toThrow();
	});

	test('dry-run defaults to false so existing callers keep writing', async () => {
		const result = await blockInsert(ctx, 'about.html', 0, {
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '実書き込み' } }]],
		});
		expect(result.dryRun).toBe(false);
		// previewContent is not included on the success path.
		expect((result as { previewContent?: string }).previewContent).toBeUndefined();
		// Verify the file was actually written.
		const after = await fs.readFile(path.join(docRoot, 'about.html'), 'utf8');
		expect(after).toContain('実書き込み');
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
