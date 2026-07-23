import type { CommandName } from './command-bus.js';

/**
 * The engine's command vocabulary — every custom command accepted by the
 * central command bus. Buttons declare these with
 * `commandfor={COMMAND_BUS_ID}`; the dispatch table is registered by the
 * UI layer at engine setup.
 *
 * Parameters travel on the invoker button (`value` / `data-*` attributes)
 * and are read from `CommandEvent.source`.
 */
export const BGE_COMMAND = {
	/** Append a new block from the catalog. `value`: catalog index. */
	addBlock: '--add-block',
	/** Paste the block currently held in the clipboard. */
	pasteBlock: '--paste-block',
	/** Move the current block. `value`: `up` | `down`. */
	moveBlock: '--move-block',
	/** Open the catalog to insert a block. `value`: `before` | `after`. */
	insertBlock: '--insert-block',
	/** Add or remove a grid item in the current block. `value`: `+1` | `-1`. */
	updateGridItems: '--update-grid-items',
	/** Open the options dialog for the current block. */
	openBlockOptions: '--open-block-options',
	/** Copy the current block to the clipboard. */
	copyBlock: '--copy-block',
	/** Remove the current block. */
	removeBlock: '--remove-block',
	/** Insert the first block into an empty editable area. */
	insertInitialBlock: '--insert-initial-block',
	/** Switch the visible content. `value`: `main` | `draft`. */
	switchContent: '--switch-content',
	/** Copy the main content over the draft. */
	copyMainToDraft: '--copy-main-to-draft',
	/** Copy the draft content over the main. */
	copyDraftToMain: '--copy-draft-to-main',
	/** Open the item editor for the item hosting the invoker button. */
	openItemEditor: '--open-item-editor',
} as const satisfies Record<string, CommandName>;

export type BgeCommand = (typeof BGE_COMMAND)[keyof typeof BGE_COMMAND];
