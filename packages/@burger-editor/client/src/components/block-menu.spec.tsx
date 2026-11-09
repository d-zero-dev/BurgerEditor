import type { BurgerBlock, ItemData, Item } from '@burger-editor/core';

import { getBlockAtPosition, Item as ItemClass, UIStateStore } from '@burger-editor/core';
import { cleanup } from '@testing-library/react';
import { act } from 'react';
import { test, expect, afterEach, vi } from 'vitest';

import { createMockEngine as createBaseMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';

import { BGE_BLOCK_MENU_BLOCK_ANCHOR } from './block-menu-anchors.js';
import { BlockMenu } from './block-menu.js';

// vi.mock calls are hoisted above these imports by vitest's transform.
vi.mock('@burger-editor/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@burger-editor/core')>();
	return {
		...actual,
		getBlockAtPosition: vi.fn(),
	};
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

/**
 * `pageX`/`pageY` depend on the document's scroll offset, which is
 * environment-dependent. Setting them directly keeps the coordinates the
 * component reads deterministic regardless of scroll position.
 * @param target
 * @param pageX
 * @param pageY
 */
function dispatchMouseMove(target: EventTarget, pageX: number, pageY: number) {
	const event = new MouseEvent('mousemove', { bubbles: true });
	Object.defineProperty(event, 'pageX', { value: pageX });
	Object.defineProperty(event, 'pageY', { value: pageY });
	target.dispatchEvent(event);
}

/**
 * 実際のUIStateStoreを持つengineモック。isProcessedは本物のengineと
 * 同じくストアのprocessingへ委譲する。setCurrentBlockも本物のengine
 * （engine.ts）と同じくuiState.setCurrentBlock()へ委譲する — そうしないと
 * block-menu.tsxが`useUIState((s) => s.currentBlock)`で読むcurrentBlockが
 * 常にnullのままになり、isMutableに応じた分岐がどのテストからも
 * 到達できなくなる
 */
function createMockEngine() {
	const uiState = new UIStateStore();
	return createBaseMockEngine({
		uiState,
		get isProcessed() {
			return uiState.getSnapshot().processing;
		},
		clearCurrentBlock: vi.fn(),
		setCurrentBlock: vi.fn((block: BurgerBlock) => {
			uiState.setCurrentBlock(block);
		}),
		commandBus: { receiverId: 'bge-command-bus-test' },
	});
}

/**
 * @param isMutable - `currentBlock?.isMutable()`が返す値
 * @param blockEl - 省略時は新規 `div`。アンカー追従テストでは実DOMを渡す
 */
function createMockBlock(isMutable = false, blockEl?: HTMLElement): BurgerBlock {
	const el = blockEl ?? document.createElement('div');
	const block = {
		el,
		isMutable: () => isMutable,
		is: (other: unknown) => other === block,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
	return block;
}

/**
 * ホバーを合成してメニューを表示状態にする
 * @param body
 */
async function hover(body: HTMLElement) {
	await act(async () => {
		dispatchMouseMove(body, 10, 10);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});
}

/**
 * Chromium の CSS アンカー配置を検証する DOM を用意する。
 * Vitest Browser Mode のスタイルシートはホスト document に注入されるため、
 * iframe 内に描画するとモジュール CSS が届かずアンカーが効かない。
 */
function createAnchoredMenuHost() {
	const menuHost = document.createElement('div');
	menuHost.dataset.bgeComponent = 'block-menu';
	menuHost.style.position = 'static';
	document.body.append(menuHost);
	return menuHost;
}

test('uiState.processing中はメニューが隠れ、解除後の再ホバーで復帰する', async () => {
	const engine = createMockEngine();
	const container = document.createElement('div');
	document.body.append(container);
	const block = createMockBlock();

	vi.mocked(getBlockAtPosition).mockReturnValue({
		block,
		rect: {
			left: 0,
			top: 0,
			right: 100,
			bottom: 100,
			width: 100,
			height: 100,
		} as DOMRect,
		marginBlockEnd: 0,
	});

	const { container: renderedRoot } = renderWithEngine(
		engine,
		<BlockMenu container={container} />,
	);
	const menuEl = renderedRoot.firstElementChild as HTMLElement;

	// A real hover makes the menu visible via React state (not a raw DOM write).
	await hover(document.body);
	expect(menuEl.hidden).toBe(false);

	// The regression class: previously, external code forced `hidden = true`
	// directly on the DOM without updating React's `visible` state. A later
	// hover calling `setVisible(true)` with the value React already believed
	// to be true was then skipped as a no-op, leaving the menu stuck hidden.
	// Now the menu subscribes to `uiState.processing` and hides through its
	// own state — the single source of truth.
	act(() => {
		engine.uiState.setProcessing(true);
	});
	expect(menuEl.hidden).toBe(true);

	act(() => {
		engine.uiState.setProcessing(false);
	});

	// A subsequent hover must show the menu again — proving the hide went
	// through React's own state rather than only the DOM attribute.
	await hover(document.body);
	expect(menuEl.hidden).toBe(false);
});

test('メニューのボタンのcommandforはengine.commandBus.receiverIdを指す（配線漏れの検出）', async () => {
	const engine = createMockEngine();
	Object.defineProperty(engine, 'commandBus', {
		value: { receiverId: 'bge-command-bus-from-engine' },
	});
	const container = document.createElement('div');
	document.body.append(container);
	const block = createMockBlock();

	vi.mocked(getBlockAtPosition).mockReturnValue({
		block,
		rect: {
			left: 0,
			top: 0,
			right: 100,
			bottom: 100,
			width: 100,
			height: 100,
		} as DOMRect,
		marginBlockEnd: 0,
	});

	const { getByLabelText } = renderWithEngine(
		engine,
		<BlockMenu container={container} />,
	);
	await hover(document.body);

	expect(getByLabelText('ブロックを削除').getAttribute('commandfor')).toBe(
		'bge-command-bus-from-engine',
	);
});

test('currentBlock.isMutable()がtrueのときだけグリッド追加・削除ボタンが表示される（配線漏れの検出）', async () => {
	const engine = createMockEngine();
	const container = document.createElement('div');
	document.body.append(container);
	const mutableBlock = createMockBlock(true);

	vi.mocked(getBlockAtPosition).mockReturnValue({
		block: mutableBlock,
		rect: {
			left: 0,
			top: 0,
			right: 100,
			bottom: 100,
			width: 100,
			height: 100,
		} as DOMRect,
		marginBlockEnd: 0,
	});

	const { getByLabelText, queryByLabelText } = renderWithEngine(
		engine,
		<BlockMenu container={container} />,
	);
	await hover(document.body);

	expect(getByLabelText('ブロック内に要素を追加')).toBeTruthy();
	expect(getByLabelText('ブロック内の要素を削除')).toBeTruthy();

	const immutableBlock = createMockBlock(false);
	vi.mocked(getBlockAtPosition).mockReturnValue({
		block: immutableBlock,
		rect: {
			left: 100,
			top: 100,
			right: 200,
			bottom: 200,
			width: 100,
			height: 100,
		} as DOMRect,
		marginBlockEnd: 0,
	});
	await hover(document.body);

	expect(queryByLabelText('ブロック内に要素を追加')).toBeNull();
	expect(queryByLabelText('ブロック内の要素を削除')).toBeNull();
});

test('processingによる非表示で選択中ブロックがクリアされる', async () => {
	const engine = createMockEngine();
	const container = document.createElement('div');
	document.body.append(container);
	const block = createMockBlock();

	vi.mocked(getBlockAtPosition).mockReturnValue({
		block,
		rect: {
			left: 0,
			top: 0,
			right: 100,
			bottom: 100,
			width: 100,
			height: 100,
		} as DOMRect,
		marginBlockEnd: 0,
	});

	renderWithEngine(engine, <BlockMenu container={container} />);

	await hover(document.body);

	act(() => {
		engine.uiState.setProcessing(true);
	});
	expect(engine.clearCurrentBlock).toHaveBeenCalled();
});

test('アンマウント後はマウス移動で位置更新が走らない', async () => {
	const engine = createMockEngine();
	const container = document.createElement('div');
	document.body.append(container);
	vi.mocked(getBlockAtPosition).mockReturnValue(null);

	const { unmount } = renderWithEngine(engine, <BlockMenu container={container} />);
	unmount();

	dispatchMouseMove(document.body, 10, 10);
	await act(async () => {
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});

	expect(getBlockAtPosition).not.toHaveBeenCalled();
	expect(engine.clearCurrentBlock).not.toHaveBeenCalled();
});

test('ホバー中にブロック要素へ anchor-name を付与する', async () => {
	const engine = createMockEngine();
	const menuHost = createAnchoredMenuHost();
	const content = document.createElement('div');
	content.id = 'bge-editable-area';
	const blockEl = document.createElement('div');
	blockEl.dataset.bgeContainer = '';
	content.append(blockEl);
	document.body.prepend(content);

	const block = createMockBlock(false, blockEl);
	vi.mocked(getBlockAtPosition).mockReturnValue({
		block,
		rect: blockEl.getBoundingClientRect(),
		marginBlockEnd: 0,
	});

	renderWithEngine(engine, <BlockMenu container={document.body} />, {
		container: menuHost,
	});
	await hover(document.body);

	expect(blockEl.style.getPropertyValue('anchor-name')).toBe(BGE_BLOCK_MENU_BLOCK_ANCHOR);
});

test('表示中にブロックの高さが変わってもメニューの枠が追従する', async () => {
	const engine = createMockEngine();
	const menuHost = createAnchoredMenuHost();

	const content = document.createElement('div');
	content.id = 'bge-editable-area';
	const blockEl = document.createElement('div');
	blockEl.dataset.bgeContainer = '';
	blockEl.style.setProperty('width', '200px');
	blockEl.style.setProperty('height', '56px');
	blockEl.style.setProperty('box-sizing', 'border-box');
	blockEl.style.setProperty('background', 'lightgray');
	content.append(blockEl);
	document.body.prepend(content);

	const block = createMockBlock(false, blockEl);
	vi.mocked(getBlockAtPosition).mockImplementation(() => ({
		block,
		rect: blockEl.getBoundingClientRect(),
		marginBlockEnd: 0,
	}));

	const { container: renderedRoot } = renderWithEngine(
		engine,
		<BlockMenu container={document.body} />,
		{ container: menuHost },
	);
	const menuEl = renderedRoot.firstElementChild as HTMLElement;

	await hover(document.body);
	await act(async () => {
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});

	const blockHeightBefore = blockEl.getBoundingClientRect().height;
	const menuHeightBefore = Number.parseFloat(getComputedStyle(menuEl).blockSize);
	expect(Math.abs(menuHeightBefore - blockHeightBefore)).toBeLessThan(4);

	blockEl.style.setProperty('height', '156px');
	await act(async () => {
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});

	const blockHeightAfter = blockEl.getBoundingClientRect().height;
	const menuHeightAfter = Number.parseFloat(getComputedStyle(menuEl).blockSize);
	expect(blockHeightAfter - blockHeightBefore).toBeGreaterThan(90);
	expect(menuHeightAfter - menuHeightBefore).toBeGreaterThan(90);
	expect(Math.abs(menuHeightAfter - blockHeightAfter)).toBeLessThan(4);
});

test('Item未解決の[data-bgi]にはアンカーとオーバーレイを付けない', async () => {
	const engine = createMockEngine();
	const container = document.createElement('div');
	document.body.append(container);

	const blockEl = document.createElement('div');
	const resolvedEl = document.createElement('div');
	resolvedEl.dataset.bgi = '';
	const orphanEl = document.createElement('div');
	orphanEl.dataset.bgi = '';
	blockEl.append(resolvedEl, orphanEl);

	const mockItem = { id: 'resolved-item' } as unknown as Item<ItemData, {}>;
	vi.spyOn(ItemClass, 'getInstance').mockImplementation((el) =>
		el === resolvedEl ? mockItem : undefined,
	);

	const block = createMockBlock(false, blockEl);
	vi.mocked(getBlockAtPosition).mockReturnValue({
		block,
		rect: blockEl.getBoundingClientRect(),
		marginBlockEnd: 0,
	});

	const openItemEditor = vi.fn();
	engine.uiState.openItemEditor = openItemEditor;

	const { container: renderedRoot } = renderWithEngine(
		engine,
		<BlockMenu container={container} />,
	);
	await hover(document.body);

	expect(orphanEl.style.getPropertyValue('anchor-name')).toBe('');
	expect(resolvedEl.style.getPropertyValue('anchor-name')).toBe(
		'--bge-block-menu-item-0',
	);
	expect(renderedRoot.querySelectorAll('[aria-label="コンテンツを編集"]').length).toBe(1);

	const overlay = renderedRoot.querySelector(
		'[aria-label="コンテンツを編集"]',
	) as HTMLButtonElement;
	overlay.click();
	expect(openItemEditor).toHaveBeenCalledWith(mockItem);
});
