import type { BurgerEditorEngine } from '@burger-editor/core';
import type { ReactNode } from 'react';

import { createContext, use, createElement } from 'react';

const EngineContext = createContext<BurgerEditorEngine | null>(null);

/**
 * Wrap a subtree with the engine instance it belongs to. Every component
 * rendered under a `BurgerEditorRoot` / editable-area tree reads the engine
 * through {@link useEngine} instead of taking it as a prop — this is the
 * single dependency-injection point for the whole client UI.
 * @param root0
 * @param root0.engine
 * @param root0.children
 * @example
 * ```tsx
 * <EngineProvider engine={engine}>
 * 	<BurgerEditorRoot />
 * </EngineProvider>
 * ```
 */
export function EngineProvider({
	engine,
	children,
}: {
	readonly engine: BurgerEditorEngine;
	readonly children: ReactNode;
}) {
	return createElement(EngineContext, { value: engine }, children);
}

/**
 * Read the engine instance from the nearest {@link EngineProvider}.
 *
 * Every root the client mounts (`BurgerEditorRoot`, the editable-area
 * tree, `DraftSwitcher`) wraps itself in an `EngineProvider`, so item
 * `Editor` components and every `@burger-editor/client/ui` component can
 * call this instead of taking `engine` as a prop.
 * @returns The engine instance
 * @throws {Error} When called outside an `EngineProvider`
 * @example
 * ```tsx
 * function MyField() {
 * 	const engine = useEngine();
 * 	return <button onClick={() => engine.save()}>Save</button>;
 * }
 * ```
 */
export function useEngine(): BurgerEditorEngine {
	const engine = use(EngineContext);
	if (!engine) {
		throw new Error('useEngine() must be called under an <EngineProvider>.');
	}
	return engine;
}
