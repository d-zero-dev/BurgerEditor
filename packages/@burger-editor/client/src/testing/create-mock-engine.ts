import type { BurgerEditorEngine } from '@burger-editor/core';

import { CommandBus, UIStateStore } from '@burger-editor/core';

/**
 * テストやStorybookでコンポーネントを描画するための最小限のfake engineを作る。
 *
 * `uiState`/`commandBus`は本物のインスタンスをそのまま使う（`BurgerEditorEngine`は
 * private constructorのため直接`new`できず、キャストで代用する）。コンポーネントが
 * 実際に呼ぶメソッド・プロパティだけを`overrides`で個別に差し込む。
 *
 * `overrides`にgetterを渡した場合はライブなアクセサとして保持される（単純な
 * オブジェクトスプレッドだとgetterがマージ時点の値へ固定されてしまうため、
 * `Object.defineProperties`でプロパティ記述子ごと合成する）。
 * @param overrides - コンポーネントが必要とする追加プロパティ・メソッド
 * @example
 * ```ts
 * const engine = createMockEngine({ content: { type: 'draft' } });
 * ```
 * @example
 * ```ts
 * // uiStateのprocessingを都度反映するライブなgetterを差し込む
 * const uiState = new UIStateStore();
 * const engine = createMockEngine({
 *   uiState,
 *   get isProcessed() {
 *     return uiState.getSnapshot().processing;
 *   },
 * });
 * ```
 */
export function createMockEngine(
	overrides: Record<string, unknown> = {},
): BurgerEditorEngine {
	const el = document.createElement('div');

	const base = {
		el,
		uiState: new UIStateStore(),
		commandBus: new CommandBus(),
		content: { type: 'main' },
		isProcessed: false,
		serverAPI: {},
		save: () => {},
		clearCurrentBlock: () => {},
		showMain: () => {},
		showDraft: () => {},
		hasDraft: () => false,
		getContentStylesheet: () => Promise.resolve(''),
		getCustomProperties: () => new Map(),
		getRepeatMinInlineSizeVariants: () => null,
		getEditableContent: () => null,
	};

	return Object.defineProperties(
		base,
		Object.getOwnPropertyDescriptors(overrides),
	) as unknown as BurgerEditorEngine;
}
