import type { Actions, UIState } from '@burger-editor/core';

import { useEffect, useEffectEvent } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

import { useEngine } from './engine-context.js';

const identity = (state: UIState): UIState => state;

/**
 * Subscribe to the engine's UI state store.
 *
 * Wraps `useSyncExternalStoreWithSelector` so call sites don't repeat the
 * subscribe/getSnapshot/selector wiring. `engine.uiState.subscribe` and
 * `.getSnapshot` are stable per-instance methods (see `UIStateStore`), so
 * passing them directly — instead of a new inline closure each render —
 * means React doesn't unsubscribe and resubscribe on every render. The
 * engine is read from the nearest `EngineProvider`.
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
 * 状態変化（例: ダイアログの開閉）での再レンダーを避けられる —
 * `useSyncExternalStoreWithSelector` が選択後の値を `Object.is` で比較し、
 * 変化がなければ再レンダーをスキップする（selector 自体は毎レンダー
 * 新しい関数でよい。比較されるのは戻り値であって関数の同一性ではない）。
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
	return useSyncExternalStoreWithSelector(
		engine.uiState.subscribe,
		engine.uiState.getSnapshot,
		engine.uiState.getSnapshot,
		(selector ?? identity) as (state: UIState) => T,
	);
}

/**
 * Subscribe to a component observer action for the lifetime of the
 * component. `handler` is read through `useEffectEvent` so the
 * subscription always sees the latest render's closure without needing
 * `handler` in the effect's deps (and without resubscribing on every
 * render). The engine is read from the nearest `EngineProvider`.
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
	const onAction = useEffectEvent((payload: Actions[A]) => handler(payload));

	useEffect(() => {
		return engine.componentObserver.on(action, onAction);
	}, [engine, action]);
}
