import type { BurgerEditorEngine } from '@burger-editor/core';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

import { render } from '@testing-library/react';

import { EngineProvider } from '../engine-context.js';

/**
 * `@testing-library/react`'s `render`, pre-wrapped in an `EngineProvider`.
 * Every client UI component under test reads its engine via `useEngine()`
 * now, so this is the standard entry point for component specs — pass
 * the same fake/mock engine object the spec already builds.
 * @param engine - The (mock) engine to provide
 * @param ui - The element to render
 * @param options - Forwarded to Testing Library's `render`
 * @returns The Testing Library render result
 * @example
 * ```tsx
 * const engine = createMockEngine();
 * renderWithEngine(engine, <FileList fileType="image" />);
 * ```
 */
export function renderWithEngine(
	engine: BurgerEditorEngine,
	ui: ReactElement,
	options?: RenderOptions,
) {
	return render(<EngineProvider engine={engine}>{ui}</EngineProvider>, options);
}
