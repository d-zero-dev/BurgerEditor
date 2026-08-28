import type { ListedBlock } from '@burger-editor/core';

import { toFullBlockId } from '../handlers.js';

const TEXT_LIMIT = 200;

export interface BlockHeadingSummary {
	readonly level: number;
	readonly text: string;
}

/**
 * The per-block shape `page_blocks`' second call returns, and the shape a
 * `stale` recovery's `currentBlocks` is trimmed down from. Deliberately
 * excludes full item data / HTML — an agent picking a target by meaning
 * needs visible text and structure, not the render tree; `block_get` is the
 * follow-up call once a target is chosen.
 */
export interface BlockSummary {
	readonly index: number;
	readonly id: string | null;
	readonly name: string;
	readonly itemNames: readonly string[];
	readonly text: string;
	readonly truncated: boolean;
	readonly headings: readonly BlockHeadingSummary[];
	readonly hasImage: boolean;
	readonly hasLink: boolean;
}

/**
 * Derive a `BlockSummary` from a block's parsed data + HTML. Text is the
 * concatenation of the block's visible text content, collapsed to single
 * spaces and cut at `TEXT_LIMIT` — enough to recognize a block ("the pricing
 * heading", "the third FAQ item") without spending the tokens a full render
 * would cost.
 * @param block
 */
export function summarizeBlock(block: ListedBlock): BlockSummary {
	const doc = new DOMParser().parseFromString(
		`<html><body>${block.html}</body></html>`,
		'text/html',
	);
	const root = doc.body.firstElementChild as HTMLElement | null;
	const rawText = (root?.textContent ?? '').replaceAll(/\s+/g, ' ').trim();
	const truncated = rawText.length > TEXT_LIMIT;
	const text = truncated ? rawText.slice(0, TEXT_LIMIT) : rawText;
	const headings: BlockHeadingSummary[] = root
		? [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => ({
				level: Number(h.tagName.slice(1)),
				text: (h.textContent ?? '').trim(),
			}))
		: [];
	const itemNames = block.data.items.flatMap((group) =>
		group.map((item) => (typeof item === 'string' ? item : item.name)),
	);
	return {
		index: block.index,
		id: toFullBlockId(block.data.id),
		name: block.data.name,
		itemNames,
		text,
		truncated,
		headings,
		hasImage: Boolean(root?.querySelector('img, picture, [data-bge="image"]')),
		hasLink: Boolean(root?.querySelector('a[href]')),
	};
}
