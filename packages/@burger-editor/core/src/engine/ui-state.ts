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

/**
 * `UIStateStore` が公開するUI状態のスナップショット。変更のたびに
 * オブジェクトごと差し替えられる（Reactの参照比較で再レンダーを
 * 起こすため、部分的なミューテーションはしない）
 */
export interface UIState {
	readonly openDialog: OpenDialogState;

	/**
	 * ブロックの挿入・移動などの処理が進行中かどうか。UI層はこれを
	 * 購読してホバーメニュー等を自律的に非表示にする — エンジンが
	 * UI要素のDOMを直接隠すことはない（真実の源はこの値ひとつ）
	 */
	readonly processing: boolean;

	/**
	 * 編集エリアごとのHTMLソース編集モード。`false` はビジュアル編集
	 */
	readonly sourceMode: {
		readonly main: boolean;
		readonly draft: boolean;
	};
}

type Listener = () => void;

/**
 * External store for UI state, shaped for `useSyncExternalStore`:
 * `subscribe` registers an invalidation callback and `getSnapshot`
 * returns an immutable state object that is replaced on every change.
 *
 * The engine owns the store and performs all transitions; the UI layer
 * only subscribes and renders.
 * @example
 * ```ts
 * const state = useSyncExternalStore(
 * 	(cb) => engine.uiState.subscribe(cb),
 * 	() => engine.uiState.getSnapshot(),
 * );
 * if (state.openDialog?.type === 'item-editor') {
 * 	// render the item editor for state.openDialog.item
 * }
 * ```
 */
export class UIStateStore {
	#listeners = new Set<Listener>();
	#state: UIState = {
		openDialog: null,
		processing: false,
		sourceMode: { main: false, draft: false },
	};

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
	 * Mark an engine mutation (block insertion, move, etc.) as in
	 * progress or finished.
	 * @param processing - Whether a mutation is in progress
	 */
	setProcessing(processing: boolean) {
		if (this.#state.processing === processing) {
			return;
		}
		this.#set({ processing });
	}

	/**
	 * Switch an editable area between the visual editor and the HTML
	 * source editor.
	 * @param type - The editable area to switch
	 * @param sourceMode - `true` for the HTML source editor
	 */
	setSourceMode(type: 'main' | 'draft', sourceMode: boolean) {
		if (this.#state.sourceMode[type] === sourceMode) {
			return;
		}
		this.#set({ sourceMode: { ...this.#state.sourceMode, [type]: sourceMode } });
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

	/**
	 * Toggle an editable area between visual and HTML source editing.
	 * @param type - The editable area to toggle
	 */
	toggleSourceMode(type: 'main' | 'draft') {
		this.setSourceMode(type, !this.#state.sourceMode[type]);
	}

	#set(patch: Partial<UIState>) {
		this.#state = { ...this.#state, ...patch };
		for (const listener of this.#listeners) {
			listener();
		}
	}
}
