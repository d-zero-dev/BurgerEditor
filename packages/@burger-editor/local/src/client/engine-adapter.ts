import type { EditorAdapter } from './agent-link.js';
import type { UIState } from '../protocol/ws-messages.js';
import type { BurgerEditorEngine } from '@burger-editor/core';

/**
 * `agent-link.ts`'s `EditorAdapter`, backed by a real `BurgerEditorEngine` —
 * the one place this feature touches the live editor, kept separate from
 * `agent-link.ts` so that file can be tested with a fake adapter instead of
 * a full editor instance.
 *
 * Everything goes through METHODS on `engine` (`applyLiveBlockOp`,
 * `getLiveBlockIndex`), and this module imports `@burger-editor/core` as a
 * type only. That is load-bearing, not style: the browser bundle contains
 * two copies of core — one inlined into `@burger-editor/client`'s dist
 * (which created `engine`), one resolved from `@burger-editor/core` directly.
 * `BurgerBlock`/`Item` lookups live in `static` WeakMaps, so a function
 * imported from the second copy sees none of the blocks the first copy
 * registered ("Do not get BurgerBlock instance."). Calling through the
 * engine instance keeps the lookup inside the copy that owns the state.
 * @param engine
 */
export function createEngineAdapter(engine: BurgerEditorEngine): EditorAdapter {
	return {
		getUIState(): UIState {
			const snapshot = engine.uiState.getSnapshot();
			const openDialog = snapshot.openDialog;
			return {
				openDialog: openDialog === null ? null : openDialog.type,
				sourceMode: snapshot.sourceMode.main || snapshot.sourceMode.draft,
				processing: snapshot.processing,
				// `item-editor` doesn't carry a `BurgerBlock` back to its
				// containing block cheaply (only the `Item`), so this is left
				// unresolved for that dialog type — the nack this feeds still
				// correctly blocks the apply, just without a block index in
				// `detail`. `block-options` DOES carry the block directly.
				editingBlockIndex:
					openDialog?.type === 'block-options'
						? engine.getLiveBlockIndex(openDialog.block)
						: null,
			};
		},
		async applyOp(op, options) {
			await engine.applyLiveBlockOp(op, options);
			return { html: engine.content.getContentsAsString() };
		},
		reload() {
			location.reload();
		},
		subscribeUIState(listener) {
			return engine.uiState.subscribe(listener);
		},
	};
}
