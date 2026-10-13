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
 * Fallback for {@link RootErrorBoundary}: reports the error and renders
 * nothing. Only *this boundary's own subtree* is replaced — how big that
 * subtree is depends entirely on where the boundary is placed. Placed
 * once around the whole single-root tree (as `createReactView` does for
 * the top level), it is a last resort: the whole editor blanks. Nested
 * one level per editable area (as `createReactView` also does) or per
 * dialog (`EditorDialog`'s own boundary around each dialog's body), it
 * instead isolates a failure to that one area/dialog and leaves sibling
 * areas, other dialogs, and the chrome running.
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
 * Reusable error boundary for the client UI tree: reports the caught
 * error as `bge:error` and blanks only its own subtree. Deliberately not
 * scoped to any one tree position — `createReactView` places one around
 * the whole single-root tree as a last resort, and one more per editable
 * area so a failure in one area (or the `BlockMenu` inside it) does not
 * blank sibling areas or the dialog chrome. `EditorDialog` places its own
 * around each dialog's body for the same reason at that granularity.
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
