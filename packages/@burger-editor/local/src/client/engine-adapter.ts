import type { EditorAdapter } from './agent-link.js';
import type { UIState } from '../protocol/ws-messages.js';
import type { BurgerEditorEngine } from '@burger-editor/core';

import { applyLiveBlockOp, getLiveBlockIndex } from '@burger-editor/core';

/**
 * `agent-link.ts`'s `EditorAdapter`, backed by a real `BurgerEditorEngine` —
 * the one place this feature touches `core`'s live DOM API, kept separate
 * from `agent-link.ts` so that file can be tested with a fake adapter
 * instead of a full editor instance.
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
						? getLiveBlockIndex(engine.content, openDialog.block)
						: null,
			};
		},
		async applyOp(op, options) {
			await applyLiveBlockOp(engine, engine.content, op, options);
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
