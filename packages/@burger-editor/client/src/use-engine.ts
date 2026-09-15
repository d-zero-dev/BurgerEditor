import type { Actions, UIState } from '@burger-editor/core';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useEngine } from './engine-context.js';

/**
 * Subscribe to the engine's UI state store.
 *
 * `useSyncExternalStore` の配線（subscribe/getSnapshot）を毎回書かずに
 * 済ませるための薄いラッパー。スナップショットは変更ごとに差し替わる
 * 不変オブジェクトなので、参照比較だけで再レンダーが決まる。エンジンは
 * 呼び出し元コンポーネントを包む `EngineProvider` から取得する。
 * @returns The current UI state snapshot
 * @example
 * ```tsx
 * const { openDialog } = useUIState();
 * return <ItemEditorHost item={openDialog?.type === 'item-editor' ? openDialog.item : null} />;
 * ```
 */
export function useUIState(): UIState;
/**
 * Subscribe to a projection of the engine's UI state store.
 *
 * 選択的な状態（`processing` や `sourceMode[type]` など）だけを読む
 * コンポーネントは、`selector` でそのフィールドだけを取り出すと無関係な
 * 状態変化（例: ダイアログの開閉）での再レンダーを避けられる。selector
 * が返す値はプリミティブか、`UIStateStore` 内部で不変のうちは同一参照を
 * 保つネスト構造（`sourceMode` など）に限る — selector 内でオブジェクト
 * を新規生成すると `useSyncExternalStore` が毎回「変化した」と判定して
 * 無限レンダーを引き起こす。
 * @param selector - Projection of the snapshot
 * @returns The selected value
 * @example
 * ```tsx
 * // 無関係な状態変化での再レンダーを避ける
 * const processing = useUIState((s) => s.processing);
 * ```
 */
export function useUIState<T>(selector: (state: UIState) => T): T;
export function useUIState<T = UIState>(selector?: (state: UIState) => T): T {
	const engine = useEngine();
	return useSyncExternalStore(
		(onStoreChange) => engine.uiState.subscribe(onStoreChange),
		() => {
			const snapshot = engine.uiState.getSnapshot();
			return selector ? selector(snapshot) : (snapshot as unknown as T);
		},
	);
}

/**
 * Subscribe to a component observer action for the lifetime of the
 * component. The handler always sees the latest render's closure. The
 * engine is read from the nearest `EngineProvider`.
 * @param action - The action name to listen for
 * @param handler - Callback receiving the typed payload
 * @example
 * ```tsx
 * useComponentEvent('file-select', ({ path, isEmpty }) => {
 * 	if (!isEmpty) {
 * 		setState((prev) => ({ ...prev, path }));
 * 	}
 * });
 * ```
 */
export function useComponentEvent<A extends keyof Actions>(
	action: A,
	handler: (payload: Actions[A]) => void,
) {
	const engine = useEngine();
	const handlerRef = useRef(handler);

	useEffect(() => {
		handlerRef.current = handler;
	});

	useEffect(() => {
		return engine.componentObserver.on(action, (payload) => {
			handlerRef.current(payload);
		});
	}, [engine, action]);
}
