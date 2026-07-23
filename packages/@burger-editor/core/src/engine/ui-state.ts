import type { Item } from '../item/item.js';
import type { ItemData } from '../item/types.js';

/**
 * The dialog currently presented by the editor UI, or `null` when no
 * dialog is open. The UI layer renders `<dialog>` elements declaratively
 * from this value instead of being opened imperatively by the engine.
 */
export type OpenDialogState =
	| { readonly type: 'block-catalog' }
	| { readonly type: 'block-options' }
	| {
			readonly type: 'item-editor';
			readonly item: Item<ItemData, { [key: string]: unknown }>;
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
	 */
	openBlockOptions() {
		this.#set({ openDialog: { type: 'block-options' } });
	}

	/**
	 * Present the item editor dialog for the given item.
	 * @param item - The content item being edited
	 */
	openItemEditor(item: Item<ItemData, { [key: string]: unknown }>) {
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
