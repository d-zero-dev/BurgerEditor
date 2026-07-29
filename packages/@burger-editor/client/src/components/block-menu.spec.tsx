import type { BurgerBlock } from '@burger-editor/core';

import { getBlockAtPosition } from '@burger-editor/core';
import { cleanup, render } from '@testing-library/react';
import { act, createRef } from 'react';
import { test, expect, afterEach, vi } from 'vitest';

import { BlockMenu, type BlockMenuHandle } from './block-menu.js';

// vi.mock calls are hoisted above these imports by vitest's transform.
vi.mock('@burger-editor/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@burger-editor/core')>();
	return {
		...actual,
		getBlockAtPosition: vi.fn(),
	};
});

// jsdom doesn't implement the CSSOM `CSS` global (no CSS.escape), which
// BlockMenuButton uses to build an anchor name. Minimal polyfill scoped to
// this test file only; it isn't exercised in production (real browsers).
if (globalThis.CSS === undefined) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).CSS = {
		escape: (value: string) => String(value).replaceAll(/[^\w-]/g, (ch) => `\\${ch}`),
	};
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

/**
 * jsdom does not compute `pageX`/`pageY` from `clientX`/`clientY`, so set
 * them directly to make the coordinates the component reads deterministic.
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
 *
 */
function createMockEngine() {
	const el = document.createElement('div');
	return {
		el,
		isProcessed: false,
		componentObserver: { notify: vi.fn() },
		uiState: { openItemEditor: vi.fn() },
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
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

test('ref.hide() forces the menu hidden even when React state already marked it visible', async () => {
	const engine = createMockEngine();
	const container = document.createElement('div');
	document.body.append(container);
	const ref = createRef<BlockMenuHandle>();
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

	const { container: renderedRoot } = render(
		<BlockMenu ref={ref} engine={engine} container={container} onHide={vi.fn()} />,
	);
	const menuEl = renderedRoot.firstElementChild as HTMLElement;

	// A real hover makes the menu visible via React state (not a raw DOM write).
	await act(async () => {
		dispatchMouseMove(document.body, 10, 10);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});
	expect(menuEl.hidden).toBe(false);

	// The regression: previously, an external caller forced `hidden = true`
	// directly on the DOM without updating React's `visible` state. A later
	// hover calling `setVisible(true)` with the value React already believed
	// to be true was then skipped as a no-op, leaving the menu stuck hidden.
	act(() => {
		ref.current?.hide();
	});
	expect(menuEl.hidden).toBe(true);

	// A subsequent hover must still be able to show the menu again — proving
	// ref.hide() reset React's own state rather than only the DOM attribute.
	await act(async () => {
		dispatchMouseMove(document.body, 10, 10);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});
	expect(menuEl.hidden).toBe(false);
});

test('ref.hide() clears the currently selected block', async () => {
	const engine = createMockEngine();
	const container = document.createElement('div');
	document.body.append(container);
	const ref = createRef<BlockMenuHandle>();
	const onHide = vi.fn();
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

	render(<BlockMenu ref={ref} engine={engine} container={container} onHide={onHide} />);

	await act(async () => {
		dispatchMouseMove(document.body, 10, 10);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});

	act(() => {
		ref.current?.hide();
	});
	expect(onHide).toHaveBeenCalledTimes(1);
});
