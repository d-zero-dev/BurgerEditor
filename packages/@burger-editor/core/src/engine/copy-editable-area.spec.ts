import type { BurgerEditorEngine } from './engine.js';

import { test, expect, beforeEach, describe, vi } from 'vitest';

import { EditableArea } from '../editable-area.js';

import { copyEditableArea } from './copy-editable-area.js';

/**
 *
 */
function createMockEngine() {
	const viewArea = document.createElement('div');
	document.body.append(viewArea);

	return {
		viewArea,
		isProcessed: false,
		componentObserver: {
			on: vi.fn(),
			off: vi.fn(),
			notify: vi.fn(),
		},
		clearCurrentBlock: vi.fn(),
		content: {
			containerElement: document.createElement('div'),
			update: vi.fn(),
		},
		save: vi.fn(),
		uiState: {
			openBlockCatalog: vi.fn(),
		},
		commandBus: {
			createReceiver: vi.fn(),
		},
		restoreBlockFromElement: vi.fn().mockResolvedValue({
			el: document.createElement('div'),
		}),
		migrationCheck: vi.fn(),
		el: document.createElement('div'),
	} as unknown as BurgerEditorEngine;
}

/**
 *
 */
function createMockBlockMenuCreator() {
	return vi.fn().mockReturnValue({ cleanUp: vi.fn() });
}

/**
 * main/draftの編集エリアペアを作る
 * @param mainContent
 * @param draftContent
 */
function createAreas(mainContent: string, draftContent: string) {
	const engine = createMockEngine();
	const main = new EditableArea(
		'main',
		mainContent,
		engine,
		createMockBlockMenuCreator(),
	);
	const draft = new EditableArea<'draft'>(
		'draft',
		draftContent,
		engine,
		createMockBlockMenuCreator(),
	);
	return { main, draft };
}

// data-bgb付きのブロック形式にしないとEditableAreaの#initが
// 「ブロック無しコンテンツ」とみなしrestoreBlockFromElement（モック）の
// 戻り値でコンテンツを置換してしまう
const MAIN_CONTENT = '<div data-bgb="text"><p>本稿</p></div>';
const DRAFT_CONTENT = '<div data-bgb="text"><p>下書き</p></div>';

describe('copyEditableArea', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('内容が異なりconfirmがtrueならコピーしてtrueを返す', async () => {
		const { main, draft } = createAreas(MAIN_CONTENT, DRAFT_CONTENT);

		const result = await copyEditableArea(draft, main, () => true);

		expect(result).toBe(true);
		expect(main.getContentsAsString()).toBe(DRAFT_CONTENT);
	});

	test('confirmがfalseならコピーせずfalseを返す', async () => {
		const { main, draft } = createAreas(MAIN_CONTENT, DRAFT_CONTENT);

		const result = await copyEditableArea(draft, main, () => false);

		expect(result).toBe(false);
		expect(main.getContentsAsString()).toBe(MAIN_CONTENT);
	});

	test('コピー元が空ならconfirmを呼ばずfalseを返す（コピー先を消さない）', async () => {
		const { main, draft } = createAreas(MAIN_CONTENT, '');
		const confirm = vi.fn().mockReturnValue(true);

		const result = await copyEditableArea(draft, main, confirm);

		expect(result).toBe(false);
		expect(confirm).not.toHaveBeenCalled();
		expect(main.getContentsAsString()).toBe(MAIN_CONTENT);
	});

	test('両者が同一ならconfirmを呼ばずfalseを返す', async () => {
		const { main, draft } = createAreas(MAIN_CONTENT, MAIN_CONTENT);
		const confirm = vi.fn().mockReturnValue(true);

		const result = await copyEditableArea(draft, main, confirm);

		expect(result).toBe(false);
		expect(confirm).not.toHaveBeenCalled();
	});

	test('confirm省略時は確認なしでコピーする', async () => {
		const { main, draft } = createAreas(MAIN_CONTENT, DRAFT_CONTENT);

		const result = await copyEditableArea(draft, main);

		expect(result).toBe(true);
		expect(main.getContentsAsString()).toBe(DRAFT_CONTENT);
	});

	test('main→draft方向（本稿を下書きへ）も同じ規則で動く', async () => {
		const { main, draft } = createAreas(MAIN_CONTENT, DRAFT_CONTENT);

		const result = await copyEditableArea(main, draft, () => true);

		expect(result).toBe(true);
		expect(draft.getContentsAsString()).toBe(MAIN_CONTENT);
	});

	test('非同期のconfirm（Promise<boolean>）も待って判定する', async () => {
		const { main, draft } = createAreas(MAIN_CONTENT, DRAFT_CONTENT);

		const result = await copyEditableArea(draft, main, () => Promise.resolve(false));

		expect(result).toBe(false);
		expect(main.getContentsAsString()).toBe(MAIN_CONTENT);
	});
});
