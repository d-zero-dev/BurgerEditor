import type { BurgerEditorView } from '../types.js';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { BurgerBlock } from '../block/block.js';
import { Item } from '../item/item.js';

import { BurgerEditorEngine } from './engine.js';
import {
	applyLiveBlockOp,
	DisabledBlockError,
	getLiveBlockIndex,
	listLiveBlocks,
} from './live-block-ops.js';

/**
 * One `[data-bge-container]` block with a single `wysiwyg` item, labeled by
 * `text` so assertions can tell blocks apart after a mutation reorders them.
 * @param text
 * @param id
 */
function blockHtml(text: string, id?: string): string {
	const idAttr = id ? ` id="${id}"` : '';
	return `<div data-bge-name="text" data-bge-container="grid:1"${idAttr}><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item=""><div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>${text}</p></div></div></div></div></div></div>`;
}

const THREE_BLOCKS = [blockHtml('a'), blockHtml('b'), blockHtml('c')].join('');

/**
 * @param overrides
 */
function createOptions(
	overrides: Partial<Parameters<typeof BurgerEditorEngine.new>[0]> = {},
) {
	return {
		root: '#engine-root',
		config: {
			classList: [],
			stylesheets: [],
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '/pdf/sample.pdf',
			googleMapsApiKey: null,
		},
		items: {
			wysiwyg: {
				name: 'wysiwyg',
				version: '1.0.0',
				template: '<div data-bge="wysiwyg"><p></p></div>',
				style: '',
			},
		},
		catalog: {},
		generalCSS: '',
		initialContents: THREE_BLOCKS,
		...overrides,
	};
}

/**
 * @param block
 */
function textOf(block: BurgerBlock): string {
	return block.el.querySelector('p')?.textContent ?? '';
}

let engine: BurgerEditorEngine;

beforeEach(async () => {
	document.body.innerHTML = '<div id="engine-root"></div>';
	engine = await BurgerEditorEngine.new(createOptions());
});

afterEach(() => {
	engine[Symbol.dispose]();
});

describe('listLiveBlocks / getLiveBlockIndex', () => {
	test('lists blocks in DOM order and resolves each one’s index back', () => {
		const blocks = listLiveBlocks(engine.content);
		expect(blocks.map((b) => textOf(b))).toEqual(['a', 'b', 'c']);
		expect(getLiveBlockIndex(engine.content, blocks[1]!)).toBe(1);
	});
});

describe('applyLiveBlockOp — insert', () => {
	test('inserts a new block at the given index without disturbing the identity of other blocks', async () => {
		const before = listLiveBlocks(engine.content);
		const result = await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'insert', index: 1, blockHtml: blockHtml('new') },
			{ highlight: false },
		);
		const after = listLiveBlocks(engine.content);
		expect(after.map((b) => textOf(b))).toEqual(['a', 'new', 'b', 'c']);
		expect(result.touched).not.toBeNull();
		// Untouched blocks (a, b, c) keep their original BurgerBlock identity —
		// the insert must not have rebound anything it didn't create.
		expect(before[0]!.is(after[0]!)).toBe(true);
		expect(before[1]!.is(after[2]!)).toBe(true);
		expect(before[2]!.is(after[3]!)).toBe(true);
		// BurgerBlock.getBlock resolves for the new element without throwing,
		// and its item is bound (Item.getInstance resolves).
		expect(() => BurgerBlock.getBlock(after[1]!.el)).not.toThrow();
		const wrapper = after[1]!.el.querySelector<HTMLElement>('[data-bgi]')!;
		expect(Item.getInstance(wrapper)).toBeInstanceOf(Item);
	});

	test('appends when index >= length and prepends when index <= 0', async () => {
		await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'insert', index: 999, blockHtml: blockHtml('end') },
			{ highlight: false },
		);
		await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'insert', index: 0, blockHtml: blockHtml('start') },
			{ highlight: false },
		);
		const after = listLiveBlocks(engine.content);
		expect(after.map((b) => textOf(b))).toEqual(['start', 'a', 'b', 'c', 'end']);
	});

	test('resets isProcessed to false once the insertion (and its animation) completes', async () => {
		await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'insert', index: 0, blockHtml: blockHtml('x') },
			{ highlight: false },
		);
		expect(engine.isProcessed).toBe(false);
	});

	test('rejects with DisabledBlockError when the inserted block is disabled, without inserting it', async () => {
		const disabledEngine = await BurgerEditorEngine.new(
			createOptions({
				items: {
					wysiwyg: {
						name: 'wysiwyg',
						version: '1.0.0',
						template: '<div data-bge="wysiwyg"><p></p></div>',
						style: '',
						editorOptions: { isDisable: () => 'nope' },
					},
				},
			}),
		);
		try {
			await expect(
				applyLiveBlockOp(
					disabledEngine,
					disabledEngine.content,
					{ op: 'insert', index: 0, blockHtml: blockHtml('x') },
					{ highlight: false },
				),
			).rejects.toBeInstanceOf(DisabledBlockError);
			expect(listLiveBlocks(disabledEngine.content).map((b) => textOf(b))).toEqual([
				'a',
				'b',
				'c',
			]);
		} finally {
			disabledEngine[Symbol.dispose]();
		}
	});
});

describe('applyLiveBlockOp — replace', () => {
	test('replaces the block at the target index and preserves other blocks’ identity', async () => {
		const before = listLiveBlocks(engine.content);
		const result = await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'replace', index: 1, blockHtml: blockHtml('replaced') },
			{ highlight: false },
		);
		const after = listLiveBlocks(engine.content);
		expect(after.map((b) => textOf(b))).toEqual(['a', 'replaced', 'c']);
		expect(before[0]!.is(after[0]!)).toBe(true);
		expect(before[2]!.is(after[2]!)).toBe(true);
		expect(result.touched && textOf(result.touched)).toBe('replaced');
	});

	test('throws RangeError for an out-of-range index', async () => {
		await expect(
			applyLiveBlockOp(
				engine,
				engine.content,
				{ op: 'replace', index: 99, blockHtml: blockHtml('x') },
				{ highlight: false },
			),
		).rejects.toThrow(RangeError);
	});
});

describe('applyLiveBlockOp — delete', () => {
	test('removes the block and clears the current selection when it was selected', async () => {
		const blocks = listLiveBlocks(engine.content);
		engine.setCurrentBlock(blocks[1]!);
		expect(engine.isSetBlock()).toBe(true);

		const result = await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'delete', index: 1 },
			{ highlight: false },
		);

		expect(result.touched).toBeNull();
		expect(listLiveBlocks(engine.content).map((b) => textOf(b))).toEqual(['a', 'c']);
		expect(engine.isSetBlock()).toBe(false);
	});
});

describe('applyLiveBlockOp — move', () => {
	test('moves a block to the destination index in the FINAL list, preserving instance identity', async () => {
		const before = listLiveBlocks(engine.content);
		await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'move', from: 0, to: 2 },
			{ highlight: false },
		);
		const after = listLiveBlocks(engine.content);
		expect(after.map((b) => textOf(b))).toEqual(['b', 'c', 'a']);
		expect(before[0]!.is(after[2]!)).toBe(true);
	});
});

describe('applyLiveBlockOp — duplicate', () => {
	test('inserts a copy right after the original, without its id', async () => {
		const withId = blockHtml('dup-me', 'bge-1');
		const localEngine = await BurgerEditorEngine.new(
			createOptions({ initialContents: withId }),
		);
		try {
			const result = await applyLiveBlockOp(
				localEngine,
				localEngine.content,
				{ op: 'duplicate', index: 0 },
				{ highlight: false },
			);
			const after = listLiveBlocks(localEngine.content);
			expect(after.map((b) => textOf(b))).toEqual(['dup-me', 'dup-me']);
			expect(after[0]!.id).toBe('bge-1');
			expect(after[1]!.id).toBe('');
			expect(result.touched && textOf(result.touched)).toBe('dup-me');
		} finally {
			localEngine[Symbol.dispose]();
		}
	});
});

describe('applyLiveBlockOp — update-item', () => {
	test('merges new data into the targeted item via the bound Item instance', async () => {
		const result = await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'update-item', index: 0, itemIndex: 0, data: { wysiwyg: '<p>updated</p>' } },
			{ highlight: false },
		);
		expect(result.touched && textOf(result.touched)).toBe('updated');
	});

	test('throws RangeError for an out-of-range item index', async () => {
		await expect(
			applyLiveBlockOp(
				engine,
				engine.content,
				{ op: 'update-item', index: 0, itemIndex: 99, data: {} },
				{ highlight: false },
			),
		).rejects.toThrow(RangeError);
	});
});

describe('applyLiveBlockOp — set-id', () => {
	test('sets the id attribute on the target block', async () => {
		const result = await applyLiveBlockOp(
			engine,
			engine.content,
			{ op: 'set-id', index: 0, id: 'bge-42' },
			{ highlight: false },
		);
		expect(result.touched?.id).toBe('bge-42');
	});
});

/**
 * The production UI (`@burger-editor/client`) renders the editable area
 * inside an `<iframe>`, so `content.containerElement` and every block in it
 * belong to the iframe's realm — they are NOT `instanceof` the top window's
 * `HTMLElement`. This view reproduces exactly that: the engine's `viewArea`
 * stays in the top document, only the content container is created inside
 * an iframe document.
 */
function createIframeView(): BurgerEditorView {
	const iframes: HTMLIFrameElement[] = [];
	const teardown = () => {
		for (const iframe of iframes) {
			iframe.remove();
		}
		iframes.length = 0;
	};
	return {
		createAreaHost({ engine: hostEngine, classList }) {
			const iframe = document.createElement('iframe');
			hostEngine.viewArea.append(iframe);
			iframes.push(iframe);
			const frameDoc = iframe.contentDocument!;
			const containerElement = frameDoc.createElement('div');
			containerElement.classList.add(...classList);
			frameDoc.body.append(containerElement);
			return Promise.resolve({ containerElement });
		},
		destroy: teardown,
		[Symbol.dispose]: teardown,
	};
}

describe('applyLiveBlockOp — container inside an iframe (cross-realm)', () => {
	let iframeEngine: BurgerEditorEngine;

	beforeEach(async () => {
		iframeEngine = await BurgerEditorEngine.new(
			createOptions({ view: createIframeView() }),
		);
	});

	afterEach(() => {
		iframeEngine[Symbol.dispose]();
	});

	test('the container really lives in another realm (precondition for the tests below)', () => {
		const container = iframeEngine.content.containerElement;
		expect(container.ownerDocument).not.toBe(document);
		expect(container.firstElementChild instanceof HTMLElement).toBe(false);
	});

	test('listLiveBlocks sees every block even though none is a top-window HTMLElement', () => {
		expect(listLiveBlocks(iframeEngine.content).map((b) => textOf(b))).toEqual([
			'a',
			'b',
			'c',
		]);
	});

	test('replace resolves its index instead of failing with "out of range (length=0)"', async () => {
		const result = await applyLiveBlockOp(
			iframeEngine,
			iframeEngine.content,
			{ op: 'replace', index: 0, blockHtml: blockHtml('replaced') },
			{ highlight: false },
		);
		expect(result.touched && textOf(result.touched)).toBe('replaced');
		expect(listLiveBlocks(iframeEngine.content).map((b) => textOf(b))).toEqual([
			'replaced',
			'b',
			'c',
		]);
		// The new block was imported into the container's own document.
		expect(result.touched?.el.ownerDocument).toBe(
			iframeEngine.content.containerElement.ownerDocument,
		);
	});

	test('update-item reaches the targeted item', async () => {
		const result = await applyLiveBlockOp(
			iframeEngine,
			iframeEngine.content,
			{ op: 'update-item', index: 0, itemIndex: 0, data: { wysiwyg: '<p>updated</p>' } },
			{ highlight: false },
		);
		expect(result.touched && textOf(result.touched)).toBe('updated');
	});
});
