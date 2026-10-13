import type { BlockOp } from '../block/types.js';
import type { EditableContent } from '../editable-content.js';
import type { EditableAreaType } from '../types.js';
import type { BurgerEditorEngine } from './engine.js';

import { BurgerBlock } from '../block/block.js';
import { Item } from '../item/item.js';

/** Thrown when an `insert` op's block can't be added because it's disabled — the live-DOM twin of `engine.addBlock`'s `alert()` path, converted to a catchable error instead. */
export class DisabledBlockError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DisabledBlockError';
	}
}

/**
 * The live blocks in an editable area's container, in DOM order — the
 * browser-side equivalent of `block-ops.ts`'s `listBlocks` over an HTML
 * string. Every `BlockOp.index` addresses this same ordering.
 * @param content
 */
export function listLiveBlocks(
	content: EditableContent<EditableAreaType>,
): readonly BurgerBlock[] {
	// No `instanceof HTMLElement` here: the container lives inside the
	// editor's iframe, whose elements belong to that frame's realm and are
	// NOT instances of the top window's `HTMLElement` — an `instanceof`
	// filter silently drops every block and every op then fails with
	// "index out of range (length=0)". `children` already yields only
	// Elements, and `matches` works across realms.
	return [...content.containerElement.children]
		.filter((el) => el.matches('[data-bge-container]'))
		.map((el) => BurgerBlock.getBlock(el as HTMLElement));
}

/**
 * @param content
 * @param block
 */
export function getLiveBlockIndex(
	content: EditableContent<EditableAreaType>,
	block: BurgerBlock,
): number {
	return listLiveBlocks(content).findIndex((b) => b.is(block));
}

/**
 * `insertionPoint.set(target, toTop)` addresses "before/after a given
 * block", not a raw array index — this translates an `insert` op's
 * `atIndex` into that vocabulary using the same clamp-to-ends convention
 * `block-ops.ts`'s disk-side `insertBlock` uses (`atIndex >= length` appends,
 * `atIndex <= 0` prepends). An empty container maps to `{ target: null }`
 * either way, which `InsertionPoint.insert` treats as "append" — the only
 * sensible reading when there's nothing to be before or after.
 * @param blocks
 * @param atIndex
 */
function resolveInsertTarget(
	blocks: readonly BurgerBlock[],
	atIndex: number,
): { readonly target: BurgerBlock | null; readonly toTop: boolean } {
	if (atIndex >= blocks.length) {
		return { target: blocks.at(-1) ?? null, toTop: false };
	}
	const clampedIndex = Math.max(0, atIndex);
	return { target: blocks[clampedIndex] ?? null, toTop: true };
}

/**
 * @param blocks
 * @param index
 * @param label
 */
function requireBlockAt(
	blocks: readonly BurgerBlock[],
	index: number,
	label = 'Block',
): BurgerBlock {
	const block = blocks[index];
	if (!block) {
		throw new RangeError(
			`${label} index ${index} out of range (length=${blocks.length})`,
		);
	}
	return block;
}

/**
 * Parse pre-rendered block HTML into a detached element owned by
 * `targetDocument` — the editable container's own document, which is the
 * editor iframe's, not the top window's. `DOMParser` produces elements
 * from yet another document, so they're imported explicitly; core's block
 * APIs (item binding, `BurgerBlock` identity tracking) assume same-document
 * elements the way `core/src/block/block-ops.ts`'s disk-side
 * `parseBlockHtml` assumes same-scope-document elements.
 * @param blockHtml
 * @param targetDocument the document that owns `content.containerElement`
 */
function parseBlockElement(blockHtml: string, targetDocument: Document): HTMLElement {
	const doc = new DOMParser().parseFromString(`<body>${blockHtml}</body>`, 'text/html');
	const el = doc.body.firstElementChild;
	if (!el) {
		throw new Error('Provided block HTML does not contain a root element.');
	}
	// Import into the CONTAINER's document (the editor iframe), not the top
	// window's `document` this module happens to run in — the two are
	// different realms, and a node owned by the wrong document is exactly
	// the kind of cross-realm mismatch that made `listLiveBlocks` see zero
	// blocks. Browsers adopt on insert, so it would "work", but every
	// `instanceof`/identity check downstream would be against the wrong realm.
	return targetDocument.importNode(el, true) as HTMLElement;
}

/**
 * `BurgerBlock.isDisable()` reads `this.items`, which `BurgerBlock.create`/
 * `rebind` never populate (it's only ever written by `updateGridItems`), so
 * it's always empty for a freshly inserted block. Walk the bound `Item`
 * instances directly instead — the same resolution `update-item` already
 * relies on — so a disabled item actually blocks the insert.
 * @param block
 */
function disableMessageFor(block: BurgerBlock): string {
	for (const wrapper of block.el.querySelectorAll<HTMLElement>('[data-bgi]')) {
		const message = Item.getInstance(wrapper)?.isDisable();
		if (message) {
			return message;
		}
	}
	return '';
}

/**
 * Deselect `block` if it's the engine's current selection — `BurgerBlock`
 * instances a `replace`/`delete`/`move` op detaches or discards must not be
 * left referenced as "selected" afterward. `isSetBlock()` guards the call
 * because `getCurrentBlock()` logs a console warning when nothing is
 * selected, which would fire on every op otherwise.
 * @param engine
 * @param block
 */
function deselectIfCurrent(engine: BurgerEditorEngine, block: BurgerBlock): void {
	if (engine.isSetBlock() && engine.getCurrentBlock()?.is(block)) {
		engine.clearCurrentBlock();
	}
}

/**
 * Which block a `BlockOp` should be highlighted against before it's
 * applied — for `insert`, there's no existing block AT the op's target yet,
 * so the adjacent block (the one the new block will land next to) stands
 * in for it.
 * @param blocks
 * @param op
 */
function resolveHighlightTarget(
	blocks: readonly BurgerBlock[],
	op: BlockOp,
): BurgerBlock | null {
	if (op.op === 'insert') {
		const { target } = resolveInsertTarget(blocks, op.index);
		return target;
	}
	if (op.op === 'move') {
		return blocks[op.from] ?? null;
	}
	return blocks[op.index] ?? null;
}

export interface ApplyLiveBlockOpOptions {
	/** Highlight the affected block before applying the op. Defaults to `true`. */
	readonly highlight?: boolean;
	/**
	 * Invoked synchronously right before the DOM is mutated — i.e. after the
	 * (possibly seconds-long) highlight animation has finished. A caller that
	 * needs to suppress the `bge:saved` echo this op will trigger should arm
	 * that suppression here rather than before calling `applyLiveBlockOp`,
	 * or a human save landing during the highlight would be swallowed instead.
	 */
	readonly onBeforeMutate?: () => void;
}

export interface ApplyLiveBlockOpResult {
	/** The block the op left behind at its target position, or `null` for `delete`. */
	readonly touched: BurgerBlock | null;
}

/**
 * Apply one `BlockOp` directly to a live editable area — the browser-side
 * counterpart of `applyBlockOpToHtml` (`@burger-editor/cli`), which does
 * the same thing to a serialized HTML string. Runs through the same code
 * path a human's UI action would (`InsertionPoint`, `BurgerBlock`, `Item`),
 * so insertion animation, `Item`/`BurgerBlock` identity, and open dialogs
 * bound to those instances all behave exactly as they would for a manual
 * edit — the entire reason this exists instead of just re-parsing the
 * page's HTML string in the browser too.
 * @param engine
 * @param content
 * @param op
 * @param options
 */
export async function applyLiveBlockOp(
	engine: BurgerEditorEngine,
	content: EditableContent<EditableAreaType>,
	op: BlockOp,
	options: ApplyLiveBlockOpOptions = {},
): Promise<ApplyLiveBlockOpResult> {
	const { highlight = true, onBeforeMutate } = options;
	if (highlight) {
		const highlightTarget = resolveHighlightTarget(listLiveBlocks(content), op);
		if (highlightTarget) {
			await highlightTarget.highlight();
		}
	}
	onBeforeMutate?.();

	switch (op.op) {
		case 'insert': {
			const blocks = listLiveBlocks(content);
			const { target, toTop } = resolveInsertTarget(blocks, op.index);
			const parsed = parseBlockElement(
				op.blockHtml,
				content.containerElement.ownerDocument,
			);
			const block = await engine.restoreBlockFromElement(parsed);
			const disableMessage = disableMessageFor(block);
			if (disableMessage) {
				throw new DisabledBlockError(disableMessage);
			}
			content.insertionPoint.set(target, toTop);
			// InsertionPoint.insert() saves internally — no separate save() here.
			await content.insertionPoint.insert(block);
			return { touched: block };
		}
		case 'replace': {
			const blocks = listLiveBlocks(content);
			const old = requireBlockAt(blocks, op.index);
			const parsed = parseBlockElement(
				op.blockHtml,
				content.containerElement.ownerDocument,
			);
			const next = await engine.restoreBlockFromElement(parsed);
			deselectIfCurrent(engine, old);
			old.el.replaceWith(next.el);
			engine.save();
			return { touched: next };
		}
		case 'delete': {
			const blocks = listLiveBlocks(content);
			const target = requireBlockAt(blocks, op.index);
			deselectIfCurrent(engine, target);
			target.remove();
			engine.save();
			return { touched: null };
		}
		case 'move': {
			const blocks = listLiveBlocks(content);
			const target = requireBlockAt(blocks, op.from);
			target.el.remove();
			// Recompute AFTER detaching `target` — `to` addresses the FINAL
			// list, matching block-ops.ts's moveBlock splice convention.
			const remaining = listLiveBlocks(content);
			if (op.to >= remaining.length) {
				content.containerElement.append(target.el);
			} else if (op.to <= 0) {
				content.containerElement.prepend(target.el);
			} else {
				remaining[op.to]!.el.before(target.el);
			}
			engine.save();
			return { touched: target };
		}
		case 'duplicate': {
			const blocks = listLiveBlocks(content);
			const target = requireBlockAt(blocks, op.index);
			const clone = target.el.cloneNode(true) as HTMLElement;
			// Strip the id so the duplicate can't collide with the original —
			// mirrors block-ops.ts's disk-side duplicateBlock.
			clone.removeAttribute('id');
			target.el.after(clone);
			const copy = await engine.restoreBlockFromElement(clone);
			engine.save();
			return { touched: copy };
		}
		case 'update-item': {
			const blocks = listLiveBlocks(content);
			const target = requireBlockAt(blocks, op.index);
			// One slot per `[data-bge-item]` (group order, then item order),
			// each resolving to its FIRST `[data-bgi]` wrapper or `null` — the
			// same enumeration `parseHTMLToBlockData` reports as the block's
			// item count and the disk-side `item_update` indexes by. A flat
			// `querySelectorAll('[data-bgi]')` would skip wrapper-less slots and
			// count nested wrappers, so the same `itemIndex` would land on a
			// different item depending on whether a tab happened to be open.
			const slots = [...target.el.querySelectorAll<HTMLElement>('[data-bge-group]')]
				.flatMap((group) => [...group.querySelectorAll<HTMLElement>('[data-bge-item]')])
				.map((itemEl) => itemEl.querySelector<HTMLElement>('[data-bgi]'));
			if (op.itemIndex < 0 || op.itemIndex >= slots.length) {
				throw new RangeError(
					`Item index ${op.itemIndex} out of range for block ${op.index} (length=${slots.length})`,
				);
			}
			const wrapper = slots[op.itemIndex];
			if (!wrapper) {
				throw new Error(
					`Item ${op.itemIndex} in block ${op.index} has no [data-bgi] wrapper to update.`,
				);
			}
			const item = Item.getInstance(wrapper);
			if (!item) {
				throw new Error(
					`No Item instance bound to item ${op.itemIndex} in block ${op.index}.`,
				);
			}
			item.import(op.data);
			engine.save();
			return { touched: target };
		}
		case 'set-id': {
			const blocks = listLiveBlocks(content);
			const target = requireBlockAt(blocks, op.index);
			target.el.id = op.id;
			engine.save();
			return { touched: target };
		}
	}
}
