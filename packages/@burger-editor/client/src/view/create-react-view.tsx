import type { BurgerEditorView } from '@burger-editor/core';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';

import { EditableAreaView } from '../components/editable-area-view.js';

/**
 * The React implementation of the engine's view port. Each editable
 * area is rendered as an {@link EditableAreaView} React root appended
 * to the engine's view area; `createAreaHost` resolves once the area's
 * content container exists.
 * @returns The view to pass to `BurgerEditorEngine.new`
 * @example
 * ```ts
 * const engine = await BurgerEditorEngine.new({
 * 	...options,
 * 	view: createReactView(),
 * });
 * ```
 */
export function createReactView(): BurgerEditorView {
	const roots = new Set<Root>();

	return {
		createAreaHost(context) {
			return new Promise((resolve) => {
				const doc = context.engine.viewArea.ownerDocument;
				const mountEl = doc.createElement('div');
				context.engine.viewArea.append(mountEl);
				const root = createRoot(mountEl);
				roots.add(root);
				root.render(
					<EditableAreaView
						engine={context.engine}
						type={context.type}
						initialContent={context.initialContent}
						stylesheets={context.stylesheets}
						classList={context.classList}
						onReady={resolve}
					/>,
				);
			});
		},
		destroy() {
			for (const root of roots) {
				root.unmount();
			}
			roots.clear();
		},
	};
}
