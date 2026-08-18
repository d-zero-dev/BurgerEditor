import type { BurgerBlock } from '@burger-editor/core';

/**
 * Storybookでコンポーネントをプレビューするための最小限のfake blockを作る。
 *
 * `BurgerBlock`は private constructor のため直接 `new` できず、既存の
 * `block-options.spec.tsx` が定義しているダミーと同じオブジェクトキャスト
 * のパターンを踏襲する。
 * @param overrides - コンポーネントが必要とする追加プロパティ・メソッド
 * @example
 * ```ts
 * const block = createMockBlock({ items: [1, 2] });
 * ```
 */
export function createMockBlock(overrides: Record<string, unknown> = {}): BurgerBlock {
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
		changeFrameSemantics: () => {},
		items: [],
		...overrides,
	} as unknown as BurgerBlock;
}
