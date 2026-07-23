import type { BurgerBlock } from '../block/block.js';
import type { Item } from '../item/item.js';
import type { ItemData } from '../item/types.js';

/**
 * The dialog currently presented by the editor UI, or `null` when no
 * dialog is open. The UI layer renders `<dialog>` elements declaratively
 * from this value instead of being opened imperatively by the engine.
 *
 * Dialogs that operate on a selection carry it in the state — the
 * hover-driven current block can be cleared while a modal is open, so
 * re-reading it at submit time is not safe.
 */
export type OpenDialogState =
	| { readonly type: 'block-catalog' }
	| {
			readonly type: 'block-options';
			readonly block: BurgerBlock;
	  }
	| {
			readonly type: 'item-editor';
			readonly item: Item<ItemData, {}>;
	  }
	| null;

export interface UIState {
	readonly openDialog: OpenDialogState;
}

type Listener = () => void;

/**
 * External store for UI state, shaped for `useSyncExternalStore`:
 * `subscribe` registers an invalidation callback and `getSnapshot`
 * returns an immutable state object that is replaced on every change.
 *
 * The engine owns the store and performs all transitions; the UI layer
 * only subscribes and renders.
 */
export class UIStateStore {
	#listeners = new Set<Listener>();
	#state: UIState = { openDialog: null };

	/**
	 * Close the currently open dialog, if any.
	 */
	closeDialog() {
		if (this.#state.openDialog === null) {
			return;
		}
		this.#set({ openDialog: null });
	}

	/**
	 * @returns The current immutable UI state
	 */
	getSnapshot(): UIState {
		return this.#state;
	}

	/**
	 * Present the block catalog dialog.
	 */
	openBlockCatalog() {
		this.#set({ openDialog: { type: 'block-catalog' } });
	}

	/**
	 * Present the block options dialog.
	 * @param block
	 */
	openBlockOptions(block: BurgerBlock) {
		this.#set({ openDialog: { type: 'block-options', block } });
	}

	/**
	 * Present the item editor dialog for the given item.
	 * @param item - The content item being edited
	 */
	openItemEditor(item: Item<ItemData, {}>) {
		this.#set({ openDialog: { type: 'item-editor', item } });
	}

	/**
	 * Register a change listener.
	 * @param listener - Invoked after every state transition
	 * @returns A function that removes the listener
	 */
	subscribe(listener: Listener): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	#set(state: UIState) {
		this.#state = state;
		for (const listener of this.#listeners) {
			listener();
		}
	}
}
