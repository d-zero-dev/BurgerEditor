import type { BurgerEditorEngine } from '@burger-editor/core';

import { CommandBus, UIStateStore, withConfigDefaults } from '@burger-editor/core';

/**
 * テストやStorybookでコンポーネントを描画するための最小限のfake engineを作る。
 *
 * `uiState`/`commandBus`は本物のインスタンスをそのまま使う（`BurgerEditorEngine`は
 * private constructorのため直接`new`できず、キャストで代用する）。コンポーネントが
 * 実際に呼ぶメソッド・プロパティだけを`overrides`で個別に差し込む。
 *
 * `config`は必須のキーだけを持つ最小の値を既定にする（エディタが`useEngine().config`を
 * 読むため）。別の設定を試すときは`overrides`で`config`を渡す。
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
		// アイテムのエディタは`useEngine().config`を読む。差し込み忘れでundefinedを
		// 読んで落ちないよう、必須キーだけの最小の設定を既定にする
		config: withConfigDefaults({
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '/pdf/sample.pdf',
		}),
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
		// EditableAreaViewはソースモードを抜けるたびにこれを呼ぶため、
		// スタブし忘れると`commitSourceEdit is not a function`でstory/testが
		// 落ちる。実際にreplaceContents→saveの経路を検証したいテストは
		// このデフォルトごと`commitSourceEdit`をoverrideすること
		commitSourceEdit: async () => {},
	};

	return Object.defineProperties(
		base,
		Object.getOwnPropertyDescriptors(overrides),
	) as unknown as BurgerEditorEngine;
}
