import type { BurgerBlock } from '@burger-editor/core';

import { screen, fireEvent, cleanup } from '@testing-library/react';
import { test, expect, afterEach, vi } from 'vitest';

import { BlockOptions } from '../components/block-options.js';
import { createMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

/**
 * BlockOptionsの描画に必要な最小限のblockモック
 * @param changeFrameSemantics - 呼び出し検証用のspy
 */
function createMockBlock(changeFrameSemantics: ReturnType<typeof vi.fn>) {
	return {
		exportOptions: () => ({
			containerProps: {
				type: 'grid',
				columns: 2,
				frameSemantics: 'div',
				autoRepeat: 'fixed',
				justify: null,
				align: null,
				float: null,
				linkarea: false,
				immutable: false,
				repeatMinInlineSize: null,
			},
			classList: [],
			id: null,
			style: {},
		}),
		changeFrameSemantics,
		items: [],
	} as unknown as BurgerBlock;
}

test('セマンティック要素の変更はselectのstateだけを更新しコンテンツDOMには即時適用しない', () => {
	const changeFrameSemantics = vi.fn();
	renderWithEngine(
		createMockEngine(),
		<BlockOptions block={createMockBlock(changeFrameSemantics)} />,
	);

	const select = screen.getByLabelText('セマンティック要素');
	expect(select.value).toBe('div');

	fireEvent.change(select, { target: { value: 'ul' } });

	// submit（applyBlockOptions）まで適用が遅延されるので、キャンセルで
	// 元に戻せる。ここで呼ばれると閉じても変更が残る退行
	expect(changeFrameSemantics).not.toHaveBeenCalled();
	expect(select.value).toBe('ul');
});
