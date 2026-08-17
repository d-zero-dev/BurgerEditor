import type { BurgerEditorEngine } from '@burger-editor/core';

import { CommandBus, ComponentObserver, UIStateStore } from '@burger-editor/core';

/**
 * Storybookでコンポーネントをプレビューするための最小限のfake engineを作る。
 *
 * `uiState`/`commandBus`/`componentObserver`は本物のインスタンスをそのまま
 * 使う（`BurgerEditorEngine`は private constructor のため直接 `new` できず、
 * 既存の各 `*.spec.tsx` が個別に定義している `createMockEngine()` と同じ
 * オブジェクトキャストのパターンを踏襲する）。コンポーネントが実際に呼ぶ
 * メソッド・プロパティだけを `overrides` で個別に差し込む。
 * @param overrides - コンポーネントが必要とする追加プロパティ・メソッド
 * @example
 * ```ts
 * const engine = createMockEngine({ content: { type: 'draft' } });
 * ```
 */
export function createMockEngine(
	overrides: Record<string, unknown> = {},
): BurgerEditorEngine {
	const el = document.createElement('div');

	return {
		el,
		uiState: new UIStateStore(),
		commandBus: new CommandBus(),
		componentObserver: new ComponentObserver(),
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
		...overrides,
	} as unknown as BurgerEditorEngine;
}
