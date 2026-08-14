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
	const mounts = new Map<Root, HTMLElement>();

	/**
	 *
	 */
	function teardown(): void {
		for (const [root, mountEl] of mounts) {
			root.unmount();
			mountEl.remove();
		}
		mounts.clear();
	}

	return {
		createAreaHost(context) {
			return new Promise((resolve) => {
				const doc = context.engine.viewArea.ownerDocument;
				const mountEl = doc.createElement('div');
				context.engine.viewArea.append(mountEl);
				const root = createRoot(mountEl);
				mounts.set(root, mountEl);
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
		/**
		 * @deprecated Use a `using` declaration instead — this now only
		 * forwards to `[Symbol.dispose]`.
		 */
		destroy() {
			this[Symbol.dispose]();
		},
		[Symbol.dispose]() {
			teardown();
		},
	};
}
