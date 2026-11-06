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

import { toCoreConfig } from '../block-builder.js';
import { getItemWrapperElements } from '../handlers.js';
import {
	importItemData,
	mayHoldNormalizedItem,
	normalizeItemWrapper,
} from '../import-item-data.js';

/**
 * Normalize the items inside a block an agent wrote as HTML (`page_update`'s
 * `insert` / `replace` save that HTML with no item data in between), so that,
 * for example, an image's second `<source>` never keeps an empty `media`.
 * Returns the HTML as it was when nothing needs to change — the agent's HTML is
 * never re-serialized needlessly.
 * @param blockHtml - The block HTML of an op (it may hold more than one block)
 * @param config - The project config, for settings such as `mediaQueries`
 * @example
 * ```ts
 * const html = normalizeBlockHtml(op.blockHtml, ctx.config);
 * ```
 */
function normalizeBlockHtml(
	blockHtml: string,
	config: CoreConfigSource | undefined,
): string {
	if (!mayHoldNormalizedItem(blockHtml)) {
		return blockHtml;
	}
	const doc = new DOMParser().parseFromString(
		`<html><body>${blockHtml}</body></html>`,
		'text/html',
	);
	const coreConfig = toCoreConfig(config);
	let changed = false;
	for (const wrapper of doc.body.querySelectorAll<HTMLElement>('[data-bgi]')) {
		if (normalizeItemWrapper(wrapper, coreConfig)) {
			changed = true;
		}
	}
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
 * Apply one `BlockOp` to an editable-area HTML string. `page_update` uses
 * this directly for its disk-side batch application. It mirrors, on plain
 * HTML strings, what a browser-connected editor would do to its live DOM
 * for the same op (insert/replace/delete/move/duplicate/update-item/set-id)
 * — the two are kept as separate implementations because one operates on
 * a serialized string with no live document, the other on real DOM nodes
 * with animation and identity to preserve.
 * @param html
 * @param op
 * @param config - The project config, for the settings an item's
 * `normalizeItemData` reads (such as `mediaQueries`) when `update-item`
 * rewrites an item. Omit it to use the defaults.
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
