import type { BurgerEditorView, EditableAreaType } from '../types.js';

import { test, expect, beforeEach, describe } from 'vitest';

import { BurgerEditorEngine } from './engine.js';

// アイテムを持たない最小のブロック骨格。`[data-bge-item]` の中に
// `[data-bgi]` が無いためアイテム解決は走らず、itemSeed登録なしで
// 構造的に「既存ブロック」と認識される（#initのrebind経路がreplaceWith
// を呼ばない安全な形）
const MINIMAL_BLOCK_CONTENT =
	'<div data-bge-name="text" data-bge-container="grid:1"><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item=""></div></div></div></div>';

/**
 * `BurgerEditorEngine.new()`が要求する最小限のoptionsを組み立てる
 * @param overrides - initialContents / view などの上書き
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
		items: {},
		catalog: {},
		generalCSS: '',
		initialContents: MINIMAL_BLOCK_CONTENT,
		...overrides,
	};
}

describe('BurgerEditorEngine.new', () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="engine-root"></div>';
	});

	test('viewを省略するとcreateDefaultViewのフォールバックでコンテンツがviewArea配下に生成される', async () => {
		const engine = await BurgerEditorEngine.new(createOptions());

		const container = engine.viewArea.querySelector<HTMLElement>(
			'[data-bge-component="editable-area"]',
		);
		expect(container).not.toBeNull();
		expect(container?.dataset.bgeArea).toBe('main');
		expect(engine.content.containerElement).toBe(container);
		expect(engine.content.getContentsAsString()).toBe(MINIMAL_BLOCK_CONTENT);
	});

	test('cleanUp()でフォールバックviewが生成したコンテナが除去される', async () => {
		const engine = await BurgerEditorEngine.new(createOptions());
		const container = engine.viewArea.querySelector(
			'[data-bge-component="editable-area"]',
		);
		expect(container?.isConnected).toBe(true);

		engine.cleanUp();

		expect(container?.isConnected).toBe(false);
	});

	test('main/draftのcreateAreaHostが並列に呼ばれる（順に await されない）', async () => {
		const started: EditableAreaType[] = [];
		const gates = new Map<EditableAreaType, { resolve: () => void }>();

		const view: BurgerEditorView = {
			createAreaHost({ type }) {
				started.push(type);
				return new Promise((resolve) => {
					gates.set(type, {
						resolve: () => {
							const containerElement = document.createElement('div');
							resolve({ containerElement });
						},
					});
				});
			},
			destroy() {},
		};

		const enginePromise = BurgerEditorEngine.new(
			createOptions({
				initialContents: { main: '<p>main</p>', draft: '<p>draft</p>' },
				view,
			}),
		);

		// どちらのゲートも解決していない時点で両方のcreateAreaHostが
		// 呼ばれていること = 一方のホスト解決を待たずに他方を開始している
		await Promise.resolve();
		await Promise.resolve();
		expect(started).toEqual(['main', 'draft']);

		gates.get('main')?.resolve();
		gates.get('draft')?.resolve();

		const engine = await enginePromise;
		expect(engine.hasDraft()).toBe(true);
	});
});
