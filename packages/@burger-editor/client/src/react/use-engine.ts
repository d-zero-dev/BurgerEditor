import type { Actions, BurgerEditorEngine, UIState } from '@burger-editor/core';

import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Subscribe to the engine's UI state store.
 * @param engine - The engine instance
 * @returns The current UI state snapshot
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
