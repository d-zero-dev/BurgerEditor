// dom-shim side-effect — must come before anything that touches DOMParser.
import '@burger-editor/file-io';

import { type NoEditableAreaError, listBlocks } from '@burger-editor/core';
import { describe, expect, test } from 'vitest';

import { applyBlockOpToHtml } from './apply-block-op.js';

/**
 * Minimal block markup: one wysiwyg item whose paragraph carries a text marker.
 * @param marker
 * @param id
 */
function block(marker: string, id = ''): string {
	const idAttr = id ? ` id="${id}"` : '';
	return (
		`<div${idAttr} data-bge-name="wysiwyg" data-bge-container="grid:1">` +
		'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
		`<div data-bgi="wysiwyg" data-bgi-ver="0.0.0"><div data-bge="wysiwyg"><p>${marker}</p></div></div>` +
		'</div></div></div></div>'
	);
}

const THREE_BLOCKS = block('A') + block('B') + block('C');

/**
 * Block order as a marker list, e.g. ['A', 'B', 'C'].
 * @param html
 */
function markers(html: string | NoEditableAreaError): string[] {
	const blocks = listBlocks(html as string, null) as { html: string }[];
	return blocks.map((b) => /<p>([^<]*)<\/p>/.exec(b.html)![1]!);
}

describe('applyBlockOpToHtml insert', () => {
	test('index 0 prepends the block', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 0,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['N', 'A', 'B', 'C']);
	});

	test('a middle index inserts before the block currently at that index', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 1,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['A', 'N', 'B', 'C']);
	});

	test('an index >= length appends instead of throwing', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 99,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['A', 'B', 'C', 'N']);
	});
});

describe('applyBlockOpToHtml replace', () => {
	test('swaps the block at index and keeps the neighbours', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'replace',
			index: 1,
			blockHtml: block('R'),
		});
		expect(markers(result)).toEqual(['A', 'R', 'C']);
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, {
				op: 'replace',
				index: 3,
				blockHtml: block('R'),
			}),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml delete', () => {
	test('removes only the block at index', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'delete', index: 1 });
		expect(markers(result)).toEqual(['A', 'C']);
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() => applyBlockOpToHtml(THREE_BLOCKS, { op: 'delete', index: 5 })).toThrow(
			RangeError,
		);
	});
});

describe('applyBlockOpToHtml move', () => {
	test('`to` is the index in the final list: move(0, 2) on [A,B,C] gives [B,C,A]', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 0, to: 2 });
		expect(markers(result)).toEqual(['B', 'C', 'A']);
	});

	test('move(2, 0) brings the last block to the front', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 2, to: 0 });
		expect(markers(result)).toEqual(['C', 'A', 'B']);
	});

	test('`to` >= length appends', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 0, to: 99 });
		expect(markers(result)).toEqual(['B', 'C', 'A']);
	});

	test('from === to leaves the order unchanged', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 1, to: 1 });
		expect(markers(result)).toEqual(['A', 'B', 'C']);
	});

	test('an out-of-range `from` throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 7, to: 0 }),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml duplicate', () => {
	test('inserts the clone right after the source', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'duplicate', index: 0 });
		expect(markers(result)).toEqual(['A', 'A', 'B', 'C']);
	});

	test('strips the id from the clone so the source stays the only #hero', () => {
		const html = block('A', 'hero') + block('B');
		const result = applyBlockOpToHtml(html, { op: 'duplicate', index: 0 }) as string;
		expect(result.match(/id="hero"/g)).toHaveLength(1);
		expect(markers(result)).toEqual(['A', 'A', 'B']);
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() => applyBlockOpToHtml(THREE_BLOCKS, { op: 'duplicate', index: 3 })).toThrow(
			RangeError,
		);
	});
});

describe('applyBlockOpToHtml update-item', () => {
	test('merges data into the item and re-serializes the block in place', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'update-item',
			index: 1,
			itemIndex: 0,
			data: { wysiwyg: '<p>B2</p>' },
		});
		expect(markers(result)).toEqual(['A', 'B2', 'C']);
	});

	test('an out-of-range block index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, {
				op: 'update-item',
				index: 3,
				itemIndex: 0,
				data: {},
			}),
		).toThrow(RangeError);
	});

	test('an out-of-range item index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, {
				op: 'update-item',
				index: 0,
				itemIndex: 1,
				data: {},
			}),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml set-id', () => {
	test('sets the id attribute on the block root', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'set-id',
			index: 2,
			id: 'contact',
		}) as string;
		expect(result).toContain(
			'data-bge-container="grid:1" id="contact"><div data-bge-container-frame',
		);
		expect(result.match(/id="contact"/g)).toHaveLength(1);
		expect(markers(result)).toEqual(['A', 'B', 'C']);
	});

	test('overwrites an existing id', () => {
		const html = block('A', 'hero');
		const result = applyBlockOpToHtml(html, {
			op: 'set-id',
			index: 0,
			id: 'intro',
		}) as string;
		expect(result).toContain('id="intro"');
		expect(result).not.toContain('id="hero"');
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, { op: 'set-id', index: 9, id: 'x' }),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml on an empty editable area', () => {
	test('insert into an empty string yields exactly the new block', () => {
		const result = applyBlockOpToHtml('', {
			op: 'insert',
			index: 0,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['N']);
	});

	test('delete on an empty string throws RangeError (length=0)', () => {
		expect(() => applyBlockOpToHtml('', { op: 'delete', index: 0 })).toThrow(
			'Block index 0 out of range (length=0)',
		);
	});
});
