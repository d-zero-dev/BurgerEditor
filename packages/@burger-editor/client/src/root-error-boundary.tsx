import type { BurgerEditorEngine } from '@burger-editor/core';
import type { ReactNode } from 'react';
import type { FallbackProps } from 'react-error-boundary';

import { createBgeEvent } from '@burger-editor/core';
import { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useEngine } from './engine-context.js';

/**
 * Report a render error onto the engine element as `bge:error`. This is
 * the only way an in-tree failure reaches code outside React — `core`
 * never reads the event, platform layers (e.g. `local`) may log it.
 * @param engine - The engine instance to report on
 * @param error - The thrown value
 * @param componentStack - The React component stack, when available
 */
export function reportRenderError(
	engine: BurgerEditorEngine,
	error: unknown,
	componentStack?: string,
) {
	engine.el.dispatchEvent(createBgeEvent('bge:error', { error, componentStack }));
}

/**
 * Minimal fallback for the root error boundary: reports the error and
 * renders nothing (the surrounding chrome — dialogs, editable areas —
 * keeps working; only the failed subtree is replaced).
 * @param root0
 * @param root0.error
 */
function RootErrorFallback({ error }: FallbackProps): ReactNode {
	const engine = useEngine();
	useEffect(() => {
		reportRenderError(engine, error);
	}, [engine, error]);
	return null;
}

/**
 * Root-level error boundary for the client UI tree. Wraps the entire
 * single-root tree (editable areas + dialog chrome) so a bug in one
 * dialog or block menu does not take down the whole editor.
 * @param root0
 * @param root0.children
 * @example
 * ```tsx
 * <EngineProvider engine={engine}>
 * 	<RootErrorBoundary>
 * 		<BurgerEditorRoot />
 * 	</RootErrorBoundary>
 * </EngineProvider>
 * ```
 */
export function RootErrorBoundary({ children }: { readonly children: ReactNode }) {
	return <ErrorBoundary FallbackComponent={RootErrorFallback}>{children}</ErrorBoundary>;
}
