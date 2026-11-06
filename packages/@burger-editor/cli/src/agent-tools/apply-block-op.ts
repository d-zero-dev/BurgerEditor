import type { BlockOp } from './block-op.js';
import type { CoreConfigSource } from '../block-builder.js';

import {
	NoEditableAreaError,
	deleteBlock,
	duplicateBlock,
	insertBlock,
	listBlocks,
	moveBlock,
	replaceBlock,
} from '@burger-editor/core';

import { assertItemsValid } from '../assert-items-valid.js';
import { toCoreConfig } from '../block-builder.js';
import { getItemWrapperElements } from '../handlers.js';
import {
	importItemData,
	mayHoldCheckedItem,
	normalizeItemWrapper,
} from '../import-item-data.js';

import { AgentError, toAgentError } from './errors.js';

/**
 * Normalize the items inside a block an agent wrote as HTML (`page_update`'s
 * `insert` / `replace` save that HTML with no item data in between), so that,
 * for example, an image's second `<source>` never keeps an empty `media`, and
 * refuse the block when an item would be saved in a state the editor's "OK"
 * refuses (a link image without an alt, a carousel slide without a name).
 * Returns the HTML as it was when nothing needs to change — the agent's HTML is
 * never re-serialized needlessly.
 * @param blockHtml - The block HTML of an op (it may hold more than one block)
 * @param config - The project config, for settings such as `mediaQueries`
 * @throws {Error} When an item of the block must not be saved (see `assertItemsValid`)
 * @example
 * ```ts
 * const html = normalizeBlockHtml(op.blockHtml, ctx.config);
 * ```
 */
function normalizeBlockHtml(
	blockHtml: string,
	config: CoreConfigSource | undefined,
): string {
	if (!mayHoldCheckedItem(blockHtml)) {
		return blockHtml;
	}
	const doc = new DOMParser().parseFromString(
		`<html><body>${blockHtml}</body></html>`,
		'text/html',
	);
	const coreConfig = toCoreConfig(config);
	let changed = false;
	const wrappers = [...doc.body.querySelectorAll<HTMLElement>('[data-bgi]')];
	for (const wrapper of wrappers) {
		if (normalizeItemWrapper(wrapper, coreConfig)) {
			changed = true;
		}
	}
	// Checked after the items were normalized: what is checked is what is saved
	assertItemsValid(wrappers, coreConfig);
	// Serializing the whole body keeps what is next to the items (more than one
	// block, comments, text) as the agent wrote it.
	return changed ? doc.body.innerHTML : blockHtml;
}

/**
 * Normalize an `insert` / `replace` op's `blockHtml` (see `normalizeBlockHtml`).
 * Any other op, and an op that needs no change, is returned as it is (the same
 * object).
 * @param op - A block operation an agent supplied
 * @param config - The project config, for settings such as `mediaQueries`
 * @throws {Error} When an `insert` / `replace` block holds an item that must not be
 * saved (see `assertItemsValid`)
 * @example
 * ```ts
 * const ops = args.ops.map((op) => normalizeBlockOp(op, ctx.config));
 * ```
 */
export function normalizeBlockOp(op: BlockOp, config?: CoreConfigSource): BlockOp {
	if (op.op !== 'insert' && op.op !== 'replace') {
		return op;
	}
	const blockHtml = normalizeBlockHtml(op.blockHtml, config);
	return blockHtml === op.blockHtml ? op : { ...op, blockHtml };
}

/**
 * Apply a `page_update` batch to an editable-area HTML string, in order, each op
 * against the state the previous one left. Nothing is persisted here: it is a
 * pure transformation, so a failing op rejects the whole batch (the caller never
 * saves a half-applied page).
 *
 * `page_update` saves the result; the Agent Hub also runs it on the page before
 * relaying a batch that holds an `update-item` to a browser tab (the tab merges
 * that op's data with the item itself, so only a run on the HTML can tell whether
 * the item would be saved in a state the editor refuses).
 * @param html - The editable area's HTML
 * @param ops - The batch
 * @param config - The project config (see {@link applyBlockOpToHtml})
 * @throws {AgentError} The first failing op, naming it and saying that nothing
 * from the call was persisted. The code is the failure's own (`invalid`, `range`, …)
 * @example
 * ```ts
 * const next = applyBlockOps(editableHtml, args.ops, ctx.config);
 * ```
 */
export function applyBlockOps(
	html: string,
	ops: readonly BlockOp[],
	config?: CoreConfigSource,
): string {
	let current = html;
	for (const [i, op] of ops.entries()) {
		// A failing op throws (via AgentError, like every other agent tool — see
		// register-agent-tools.ts) rather than returning a success-shaped "partial
		// failure" object. The caller saves only after every op in the batch has
		// applied cleanly in memory, so a mid-batch failure genuinely persists
		// nothing; the thrown message says so explicitly since there is no separate
		// response field to carry that guarantee.
		let next: string | NoEditableAreaError;
		try {
			next = applyBlockOpToHtml(current, op, config);
		} catch (error) {
			throw new AgentError(
				toAgentError(error).code,
				`page_update op ${i} (${op.op}) failed: ${toAgentError(error).message} ` +
					'page_update is all-or-nothing — nothing from this call was persisted.',
			);
		}
		if (next instanceof NoEditableAreaError) {
			throw new AgentError(
				'no-such-area',
				`page_update op ${i} (${op.op}) failed: ${next.message} ` +
					'page_update is all-or-nothing — nothing from this call was persisted.',
			);
		}
		current = next;
	}
	return current;
}

/**
 * Apply one `BlockOp` to an editable-area HTML string. `page_update` uses
 * this directly for its disk-side batch application. It mirrors, on plain
 * HTML strings, what a browser-connected editor would do to its live DOM
 * for the same op (insert/replace/delete/move/duplicate/update-item/set-id)
 * — the two are kept as separate implementations because one operates on
 * a serialized string with no live document, the other on real DOM nodes
 * with animation and identity to preserve.
 * @param html - The editable area's HTML
 * @param op - The operation to apply
 * @param config - The project config, for the settings an item's
 * `normalizeItemData` reads (such as `mediaQueries`) when `update-item`
 * rewrites an item. Omit it to use the defaults.
 * @throws {Error} When `insert` / `replace` / `update-item` would leave an item in
 * a state the editor's "OK" refuses (see `assertItemsValid`), and `RangeError` for an
 * index out of range
 * @example
 * ```ts
 * const next = applyBlockOpToHtml(editableHtml, { op: 'move', from: 0, to: 2 });
 * if (next instanceof NoEditableAreaError) throw next;
 * ```
 */
export function applyBlockOpToHtml(
	html: string,
	op: BlockOp,
	config?: CoreConfigSource,
): string | NoEditableAreaError {
	switch (op.op) {
		case 'insert': {
			return insertBlock(html, null, op.index, normalizeBlockHtml(op.blockHtml, config));
		}
		case 'replace': {
			return replaceBlock(html, null, op.index, normalizeBlockHtml(op.blockHtml, config));
		}
		case 'delete': {
			return deleteBlock(html, null, op.index);
		}
		case 'move': {
			return moveBlock(html, null, op.from, op.to);
		}
		case 'duplicate': {
			return duplicateBlock(html, null, op.index);
		}
		case 'update-item': {
			const blocks = listBlocks(html, null);
			if (blocks instanceof NoEditableAreaError) return blocks;
			const block = blocks[op.index];
			if (!block) {
				throw new RangeError(
					`Block index ${op.index} out of range (length=${blocks.length})`,
				);
			}
			const doc = new DOMParser().parseFromString(
				`<html><body>${block.html}</body></html>`,
				'text/html',
			);
			const blockEl = doc.body.firstElementChild as HTMLElement;
			const wrappers = getItemWrapperElements(blockEl);
			if (op.itemIndex < 0 || op.itemIndex >= wrappers.length) {
				throw new RangeError(
					`Item index ${op.itemIndex} out of range for block ${op.index} (length=${wrappers.length})`,
				);
			}
			const wrapper = wrappers[op.itemIndex];
			if (!wrapper) {
				throw new Error(
					`Item ${op.itemIndex} in block ${op.index} has no data-bgi wrapper and cannot be updated.`,
				);
			}
			// op.data is arbitrary JSON from an agent call — see importItemData
			// for why that is safe (merged over the item's real current data).
			importItemData(wrapper, op.data, config);
			return replaceBlock(html, null, op.index, blockEl.outerHTML);
		}
		case 'set-id': {
			const blocks = listBlocks(html, null);
			if (blocks instanceof NoEditableAreaError) return blocks;
			const block = blocks[op.index];
			if (!block) {
				throw new RangeError(
					`Block index ${op.index} out of range (length=${blocks.length})`,
				);
			}
			const doc = new DOMParser().parseFromString(
				`<html><body>${block.html}</body></html>`,
				'text/html',
			);
			const el = doc.body.firstElementChild as HTMLElement | null;
			if (!el) {
				throw new Error(`Block ${op.index}'s HTML has no root element.`);
			}
			el.id = op.id;
			return replaceBlock(html, null, op.index, el.outerHTML);
		}
	}
}
