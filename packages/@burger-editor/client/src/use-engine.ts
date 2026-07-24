import type { Actions, BurgerEditorEngine, UIState } from '@burger-editor/core';

import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Subscribe to the engine's UI state store.
 *
 * `useSyncExternalStore` の配線（subscribe/getSnapshot）を毎回書かずに
 * 済ませるための薄いラッパー。スナップショットは変更ごとに差し替わる
 * 不変オブジェクトなので、参照比較だけで再レンダーが決まる。
 * @param engine - The engine instance
 * @returns The current UI state snapshot
 * @example
 * ```tsx
 * const { openDialog } = useUIState(engine);
 * return <ItemEditorHost engine={engine} item={openDialog?.type === 'item-editor' ? openDialog.item : null} />;
 * ```
 */
export function useUIState(engine: BurgerEditorEngine): UIState {
	return useSyncExternalStore(
		(onStoreChange) => engine.uiState.subscribe(onStoreChange),
		() => engine.uiState.getSnapshot(),
	);
}

/**
 * Subscribe to a component observer action for the lifetime of the
 * component. The handler always sees the latest render's closure.
 * @param engine - The engine instance
 * @param action - The action name to listen for
 * @param handler - Callback receiving the typed payload
 * @example
 * ```tsx
 * useComponentEvent(engine, 'file-select', ({ path, isEmpty }) => {
 * 	if (!isEmpty) {
 * 		setState((prev) => ({ ...prev, path }));
 * 	}
 * });
 * ```
 */
export function useComponentEvent<A extends keyof Actions>(
	engine: BurgerEditorEngine,
	action: A,
	handler: (payload: Actions[A]) => void,
) {
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
