import type { BlockOp } from './block-op.js';

import {
	NoEditableAreaError,
	deleteBlock,
	duplicateBlock,
	insertBlock,
	itemExport,
	itemImport,
	listBlocks,
	moveBlock,
	replaceBlock,
} from '@burger-editor/core';

import { getItemWrapperElements } from '../handlers.js';

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
 */
export function applyBlockOpToHtml(
	html: string,
	op: BlockOp,
): string | NoEditableAreaError {
	switch (op.op) {
		case 'insert': {
			return insertBlock(html, null, op.index, op.blockHtml);
		}
		case 'replace': {
			return replaceBlock(html, null, op.index, op.blockHtml);
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
			const currentData = itemExport(wrapper.innerHTML);
			// op.data is arbitrary JSON from an agent call — see handlers.ts'
			// itemUpdate for why the cast is safe (merged over real current data).
			const merged = { ...currentData, ...op.data } as Parameters<typeof itemImport>[1];
			wrapper.innerHTML = itemImport(wrapper.innerHTML, merged);
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
