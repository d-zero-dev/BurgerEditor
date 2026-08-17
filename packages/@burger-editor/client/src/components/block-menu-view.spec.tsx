import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { test, expect, afterEach } from 'vitest';

import { BlockMenuView } from './block-menu-view.js';

// jsdom doesn't implement the CSSOM `CSS` global (no CSS.escape), which
// BlockMenuButton uses to build an anchor name. Minimal polyfill scoped to
// this test file only; it isn't exercised in production (real browsers).
if (globalThis.CSS === undefined) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).CSS = {
		escape: (value: string) => String(value).replaceAll(/[^\w-]/g, (ch) => `\\${ch}`),
	};
}

afterEach(cleanup);

const geometry = {
	width: 100,
	height: 40,
	x: 0,
	y: 0,
	marginBlockEnd: 0,
	marginBlockEndValue: '0px',
};

test('visible=falseのときhidden属性が付く', () => {
	const rootRef = createRef<HTMLDivElement>();
	const { container } = render(
		<BlockMenuView
			rootRef={rootRef}
			menuId="menu-1"
			visible={false}
			geometry={geometry}
			itemRects={[]}
			isMutable={false}
		/>,
	);
	const menuEl = container.firstElementChild as HTMLElement;
	expect(menuEl.hidden).toBe(true);
});

test('visible=trueのときhidden属性が付かない', () => {
	const rootRef = createRef<HTMLDivElement>();
	const { container } = render(
		<BlockMenuView
			rootRef={rootRef}
			menuId="menu-2"
			visible
			geometry={geometry}
			itemRects={[]}
			isMutable={false}
		/>,
	);
	const menuEl = container.firstElementChild as HTMLElement;
	expect(menuEl.hidden).toBe(false);
});

test('itemRectsの数だけアイテムオーバーレイボタンが描画される', () => {
	const rootRef = createRef<HTMLDivElement>();
	const { container } = render(
		<BlockMenuView
			rootRef={rootRef}
			menuId="menu-3"
			visible
			geometry={geometry}
			itemRects={[
				{ x: 0, y: 0, width: 10, height: 10 },
				{ x: 10, y: 10, width: 20, height: 20 },
			]}
			isMutable={false}
		/>,
	);
	const overlays = container.querySelectorAll('[aria-label="コンテンツを編集"]');
	expect(overlays.length).toBe(2);
});

test('isMutable=trueのときグリッド追加・削除ボタンが表示される', () => {
	const rootRef = createRef<HTMLDivElement>();
	const { getByLabelText } = render(
		<BlockMenuView
			rootRef={rootRef}
			menuId="menu-4"
			visible
			geometry={geometry}
			itemRects={[]}
			isMutable
		/>,
	);
	expect(getByLabelText('ブロック内に要素を追加')).toBeTruthy();
	expect(getByLabelText('ブロック内の要素を削除')).toBeTruthy();
});

test('isMutable=falseのときグリッド追加・削除ボタンが表示されない', () => {
	const rootRef = createRef<HTMLDivElement>();
	const { queryByLabelText } = render(
		<BlockMenuView
			rootRef={rootRef}
			menuId="menu-5"
			visible
			geometry={geometry}
			itemRects={[]}
			isMutable={false}
		/>,
	);
	expect(queryByLabelText('ブロック内に要素を追加')).toBeNull();
	expect(queryByLabelText('ブロック内の要素を削除')).toBeNull();
});
