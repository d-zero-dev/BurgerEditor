import type { BurgerBlock } from '@burger-editor/core';

import { getBlockAtPosition, UIStateStore } from '@burger-editor/core';
import { cleanup } from '@testing-library/react';
import { act } from 'react';
import { test, expect, afterEach, vi } from 'vitest';

import { createMockEngine as createBaseMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';

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
 * 同じくストアのprocessingへ委譲する
 */
function createMockEngine() {
	const uiState = new UIStateStore();
	return createBaseMockEngine({
		uiState,
		get isProcessed() {
			return uiState.getSnapshot().processing;
		},
		clearCurrentBlock: vi.fn(),
		setCurrentBlock: vi.fn(),
		commandBus: { receiverId: 'bge-command-bus-test' },
	});
}

/**
 *
 */
function createMockBlock(): BurgerBlock {
	const el = document.createElement('div');
	const block = {
		el,
		isMutable: () => false,
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
