import { items } from '@burger-editor/blocks';
import { itemImport, listBlocks, NoEditableAreaError } from '@burger-editor/core';
import { describe, expect, test } from 'vitest';

import { BROWSER_APPLICABLE_TOOLS, buildBrowserOps } from './block-op-builder.js';

/**
 * @param text
 * @param id
 */
function blockHtml(text: string, id?: string): string {
	const idAttr = id ? ` id="${id}"` : '';
	return `<div data-bge-name="text" data-bge-container="grid:1"${idAttr}><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item=""><div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>${text}</p></div></div></div></div></div></div>`;
}

const THREE_BLOCKS = [blockHtml('a', 'bge-1'), blockHtml('b'), blockHtml('c')].join('');

/**
 *
 */
function blocks() {
	const result = listBlocks(THREE_BLOCKS, null);
	if (result instanceof NoEditableAreaError) {
		throw result;
	}
	return result;
}

describe('BROWSER_APPLICABLE_TOOLS', () => {
	test('lists exactly the tools that have a BlockOp equivalent', () => {
		expect([...BROWSER_APPLICABLE_TOOLS].toSorted()).toEqual(
			[
				'block_insert',
				'block_replace',
				'block_delete',
				'block_move',
				'block_duplicate',
				'item_update',
				'page_update',
			].toSorted(),
		);
	});
});

describe('buildBrowserOps — page_update insert / replace', () => {
	// The browser saves the blockHtml it is sent as it is. Normalizing it here,
	// where the project config is known, gives the same result as the disk path.
	const imageBlock =
		'<div data-bge-name="image" data-bge-container="grid:1"><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item="">' +
		`<div data-bgi="image" data-bgi-ver="0.0.0">${itemImport(items['image']!.template, {
			path: ['/img/pc.png', '/img/sp.png'],
			width: [400, 300],
			height: [300, 200],
			media: ['', ''],
		})}</div></div></div></div></div>`;

	test('fills the empty media of an image in an insert op with the default media query', () => {
		const ops = buildBrowserOps(
			'page_update',
			{ ops: [{ op: 'insert', index: 0, blockHtml: imageBlock }] },
			blocks(),
			'/a.html',
		);

		expect((ops[0] as { blockHtml: string }).blockHtml).toContain(
			'media="(max-width: 767px)"',
		);
	});

	test('uses the first entry of the given config.mediaQueries for a replace op', () => {
		const ops = buildBrowserOps(
			'page_update',
			{ ops: [{ op: 'replace', index: 0, blockHtml: imageBlock }] },
			blocks(),
			'/a.html',
			undefined,
			{ mediaQueries: ['(max-width: 599px)'] },
		);

		expect((ops[0] as { blockHtml: string }).blockHtml).toContain(
			'media="(max-width: 599px)"',
		);
	});

	test('passes the other ops through unchanged', () => {
		const args = { ops: [{ op: 'delete', index: 1 }] };

		expect(buildBrowserOps('page_update', args, blocks(), '/a.html')).toEqual(args.ops);
	});
});

describe('buildBrowserOps', () => {
	test('block_insert becomes an insert op at the given index', () => {
		const ops = buildBrowserOps(
			'block_insert',
			{ index: 1 },
			blocks(),
			'/a.html',
			'<div>new</div>',
		);
		expect(ops).toEqual([{ op: 'insert', index: 1, blockHtml: '<div>new</div>' }]);
	});

	test('block_replace resolves an {id} target to its current index', () => {
		const ops = buildBrowserOps(
			'block_replace',
			{ target: { id: 'bge-1' } },
			blocks(),
			'/a.html',
			'<div>replaced</div>',
		);
		expect(ops).toEqual([{ op: 'replace', index: 0, blockHtml: '<div>replaced</div>' }]);
	});

	test('block_delete resolves an {index} target', () => {
		const ops = buildBrowserOps(
			'block_delete',
			{ target: { index: 2 } },
			blocks(),
			'/a.html',
		);
		expect(ops).toEqual([{ op: 'delete', index: 2 }]);
	});

	test('block_move carries the target as `from` and args.to as `to`', () => {
		const ops = buildBrowserOps(
			'block_move',
			{ target: { index: 0 }, to: 2 },
			blocks(),
			'/a.html',
		);
		expect(ops).toEqual([{ op: 'move', from: 0, to: 2 }]);
	});

	test('block_duplicate resolves its target to an index', () => {
		const ops = buildBrowserOps(
			'block_duplicate',
			{ target: { index: 1 } },
			blocks(),
			'/a.html',
		);
		expect(ops).toEqual([{ op: 'duplicate', index: 1 }]);
	});

	test('item_update carries itemIndex and data alongside the resolved index', () => {
		const ops = buildBrowserOps(
			'item_update',
			{ target: { index: 1 }, itemIndex: 0, data: { wysiwyg: '<p>x</p>' } },
			blocks(),
			'/a.html',
		);
		expect(ops).toEqual([
			{ op: 'update-item', index: 1, itemIndex: 0, data: { wysiwyg: '<p>x</p>' } },
		]);
	});

	test('page_update passes its ops array through unchanged', () => {
		const ops = [{ op: 'delete', index: 0 }];
		const result = buildBrowserOps('page_update', { ops }, blocks(), '/a.html');
		expect(result).toBe(ops);
	});

	test('an unknown tool name yields no ops', () => {
		expect(buildBrowserOps('page_create', {}, blocks(), '/a.html')).toEqual([]);
	});
});
