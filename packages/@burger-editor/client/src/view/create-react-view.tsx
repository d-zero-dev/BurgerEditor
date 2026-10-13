import type {
	BurgerEditorEngine,
	BurgerEditorView,
	EditableAreaHost,
	EditableAreaHostContext,
	EditableAreaType,
} from '@burger-editor/core';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { EditableAreaView } from '../components/editable-area-view.js';
import { EngineProvider } from '../engine-context.js';
import { RootErrorBoundary } from '../root-error-boundary.js';

/**
 * A `ReactView` extends the core {@link BurgerEditorView} contract with a
 * client-only escape hatch: `mountChrome` lets `createBurgerEditorClient`
 * render the dialog chrome into the *same* React root the editable areas
 * use, once the engine has finished constructing. `core` never sees this
 * method — it only calls `createAreaHost` through the narrower
 * `BurgerEditorView` type.
 */
export interface ReactView extends BurgerEditorView {
	/**
	 * Render additional UI (currently: `BurgerEditorRoot`, the dialog
	 * chrome) into the single root this view owns. Replaces whatever was
	 * mounted by a previous call.
	 * @param node - The chrome to render
	 */
	mountChrome(node: ReactNode): void;
}

interface AreaEntry {
	readonly mountEl: HTMLElement;
	readonly props: {
		readonly type: EditableAreaType;
		readonly initialContent: string;
		readonly stylesheets: readonly { readonly path: string; readonly id: string }[];
		readonly classList: readonly string[];
	};
	readonly onReady: (host: EditableAreaHost) => void;
}

/**
 * The React implementation of the engine's view port.
 *
 * Unlike the pre-single-root design (one `createRoot` per editable area
 * plus a separate dialog-host root), this view owns exactly **one** React
 * root per engine. Editable areas are portaled into their own `<div>`
 * (still a direct child of `engine.viewArea`, preserving the DOM contract
 * `viewAreaClassList` consumers rely on) so each area keeps its own
 * subtree identity; the dialog chrome renders inline. Sharing one root
 * means `EngineProvider` only needs to wrap the tree once, and every
 * component below it — areas, block menu, dialogs — reads the engine via
 * `useEngine()` instead of taking it as a prop.
 * @returns The view to pass to `BurgerEditorEngine.new`
 * @example
 * ```ts
 * const view = createReactView();
 * const engine = await BurgerEditorEngine.new({ ...options, view });
 * view.mountChrome(<EngineProvider engine={engine}><BurgerEditorRoot /></EngineProvider>);
 * ```
 */
export function createReactView(): ReactView {
	let root: Root | null = null;
	let rootHost: HTMLElement | null = null;
	let engine: BurgerEditorEngine | null = null;
	let chrome: ReactNode = null;
	const areas = new Map<EditableAreaType, AreaEntry>();

	/**
	 *
	 */
	function paint(): void {
		if (!root || !engine) {
			return;
		}
		root.render(
			<EngineProvider engine={engine}>
				<RootErrorBoundary>
					{chrome}
					{[...areas.values()].map((entry) =>
						createPortal(
							// 単一root化で複数エリア＋ダイアログchromeが1つの木に
							// 同居するようになったため、外側のRootErrorBoundary
							// （最後の砦・木全体を覆う）とは別に、エリアごとにも
							// 境界を持たせる。あるエリアの描画エラーが他のエリアや
							// ダイアログchromeまで巻き込んで消さないようにするため
							<RootErrorBoundary key={entry.props.type}>
								<EditableAreaView
									type={entry.props.type}
									initialContent={entry.props.initialContent}
									stylesheets={entry.props.stylesheets}
									classList={entry.props.classList}
									onReady={entry.onReady}
								/>
							</RootErrorBoundary>,
							entry.mountEl,
						),
					)}
				</RootErrorBoundary>
			</EngineProvider>,
		);
	}

	/**
	 *
	 */
	function teardown(): void {
		root?.unmount();
		rootHost?.remove();
		for (const entry of areas.values()) {
			entry.mountEl.remove();
		}
		root = null;
		rootHost = null;
		areas.clear();
	}

	return {
		createAreaHost(context: EditableAreaHostContext): Promise<EditableAreaHost> {
			return new Promise((resolve) => {
				if (!root) {
					engine = context.engine;
					rootHost = context.engine.el.ownerDocument.createElement('div');
					context.engine.el.append(rootHost);
					root = createRoot(rootHost, {
						identifierPrefix: `bge${context.engine.commandBus.receiverId}-`,
					});
				}

				const doc = context.engine.viewArea.ownerDocument;
				const mountEl = doc.createElement('div');
				context.engine.viewArea.append(mountEl);

				areas.set(context.type, {
					mountEl,
					props: {
						type: context.type,
						initialContent: context.initialContent,
						stylesheets: context.stylesheets,
						classList: context.classList,
					},
					onReady: resolve,
				});
				paint();
			});
		},
		mountChrome(node: ReactNode): void {
			chrome = node;
			paint();
		},
		// destroyと[Symbol.dispose]は同じ関数を指す — thisに依存する実装だと
		// 分割代入経由の呼び出しでthisが外れてTypeErrorになるため、
		// 共有クロージャへの参照にしている
		/** @deprecated Use a `using` declaration instead. */
		destroy: teardown,
		[Symbol.dispose]: teardown,
	};
}
