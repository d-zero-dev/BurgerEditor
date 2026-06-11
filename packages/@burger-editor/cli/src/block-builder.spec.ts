import type { BlockCatalog } from '@burger-editor/core';
import type { BurgerEditorConfig } from '@burger-editor/file-io';

import { defaultCatalog } from '@burger-editor/blocks';
// dom-shim must run before render() touches DOMParser.
import '@burger-editor/file-io';
import { describe, expect, test } from 'vitest';

import {
	buildBlockData,
	findCatalogDefinition,
	renderBlockHtml,
} from './block-builder.js';

const SMALL_CATALOG: BlockCatalog = {
	見出し: [
		{
			label: '大見出し',
			definition: {
				name: 'h2',
				svg: '<svg/>',
				containerProps: { immutable: true },
				items: [['title-h2']],
			},
		},
	],
	基本: [
		{
			label: 'テキスト',
			definition: {
				name: 'wysiwyg',
				svg: '<svg/>',
				containerProps: { type: 'grid', columns: 1 },
				items: [['wysiwyg']],
			},
		},
	],
};

/**
 *
 * @param catalog
 */
function makeConfig(catalog: BlockCatalog): BurgerEditorConfig {
	return {
		version: 'test',
		port: 0,
		host: 'localhost',
		documentRoot: '/tmp',
		assetsRoot: '/tmp',
		lang: 'en',
		stylesheets: [],
		classList: [],
		editableArea: null,
		indexFileName: 'index.html',
		filesDir: {
			image: { serverPath: '', clientPath: '/' },
			pdf: { serverPath: '', clientPath: '/' },
			video: { serverPath: '', clientPath: '/' },
			audio: { serverPath: '', clientPath: '/' },
			other: { serverPath: '', clientPath: '/' },
		},
		sampleImagePath: '/s.png',
		sampleFilePath: '/s.pdf',
		googleMapsApiKey: null,
		open: false,
		newFileContent: '',
		catalog,
		enableImportBlock: false,
		healthCheck: { enabled: false, interval: 0, retryCount: 0 },
		virtualTree: { enabled: false, pathKey: 'path' },
	};
}

describe('findCatalogDefinition', () => {
	test('returns the definition matching the given name', () => {
		const def = findCatalogDefinition(SMALL_CATALOG, 'h2');
		expect(def?.name).toBe('h2');
		expect(def?.containerProps.immutable).toBe(true);
	});

	test('returns null for unknown catalog name', () => {
		expect(findCatalogDefinition(SMALL_CATALOG, 'nonexistent')).toBeNull();
	});

	test('finds a definition across categories', () => {
		const def = findCatalogDefinition(SMALL_CATALOG, 'wysiwyg');
		expect(def?.name).toBe('wysiwyg');
		expect(def?.containerProps.type).toBe('grid');
	});
});

describe('buildBlockData', () => {
	test('builds BlockData from a catalog name with template defaults', () => {
		const data = buildBlockData({ catalog: 'wysiwyg' }, SMALL_CATALOG);
		expect(data.name).toBe('wysiwyg');
		expect(data.containerProps).toEqual({ type: 'grid', columns: 1 });
		expect(data.items).toEqual([['wysiwyg']]);
	});

	test('user containerProps override the catalog template', () => {
		const data = buildBlockData(
			{ catalog: 'wysiwyg', containerProps: { type: 'inline' } },
			SMALL_CATALOG,
		);
		expect(data.containerProps).toEqual({ type: 'inline' });
	});

	test('user items override the catalog template', () => {
		const items = [[{ name: 'wysiwyg', data: { wysiwyg: '<p>hello</p>' } }]];
		const data = buildBlockData({ catalog: 'wysiwyg', items }, SMALL_CATALOG);
		expect(data.items).toBe(items);
	});

	test('throws when catalog name is unknown', () => {
		expect(() => buildBlockData({ catalog: 'nope' }, SMALL_CATALOG)).toThrow(
			/Unknown catalog block name: "nope"/,
		);
	});

	test('falls back to spec.name when no catalog is given', () => {
		const data = buildBlockData(
			{ name: 'custom', containerProps: {}, items: [] },
			SMALL_CATALOG,
		);
		expect(data.name).toBe('custom');
	});

	test('throws when neither name nor catalog is provided', () => {
		expect(() => buildBlockData({}, SMALL_CATALOG)).toThrow(
			/must include "name" or "catalog"/,
		);
	});
});

describe('renderBlockHtml', () => {
	test('renders an h2 block from the default catalog with the supplied title', async () => {
		// frozen-patty camel-cases the slot name from data-bge="title-h2" into
		// the data key `titleH2`. See @burger-editor/frozen-patty's toJSON()
		// output — the runtime data shape is camelCase, NOT kebab-case.
		const html = await renderBlockHtml(
			{
				catalog: 'h2',
				items: [[{ name: 'title-h2', data: { titleH2: '会社概要' } }]],
			},
			makeConfig(defaultCatalog),
		);
		expect(html).toContain('data-bge-container');
		expect(html).toContain('data-bge-name="h2"');
		expect(html).toContain('会社概要');
	});

	test('respects user-supplied classList', async () => {
		const html = await renderBlockHtml(
			{
				catalog: 'wysiwyg',
				items: [[{ name: 'wysiwyg', data: { wysiwyg: '<p>x</p>' } }]],
				classList: ['my-block'],
			},
			makeConfig(defaultCatalog),
		);
		expect(html).toContain('my-block');
	});
});
