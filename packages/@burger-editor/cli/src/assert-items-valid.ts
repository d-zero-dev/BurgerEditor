import type { Config } from '@burger-editor/core';

import { validateItemHtml } from '@burger-editor/core';

import { seedOf } from './item-seed.js';

/**
 * Check every item of a block an agent wrote (`block_insert` / `block_replace`'s
 * rendered spec, `page_update`'s raw `insert` / `replace` HTML) with each item's
 * `validateItemData`, after the items were normalized. Nothing is rewritten.
 * The editor's "OK" refuses the same input through `toItemData`; an agent's write
 * skips that, so the writers refuse it here instead.
 * @param wrappers - The `[data-bgi]` elements of the block, in document order
 * @param config - The core config (`toCoreConfig`). Build it once per block
 * @throws {Error} When an item would be saved in a state the editor refuses (a
 * link or popup image without an alt, a carousel slide without a name). The
 * message names every such item (its position in the block and its name) with
 * the reason, written for the author
 * @example
 * ```ts
 * assertItemsValid(el.querySelectorAll<HTMLElement>('[data-bgi]'), coreConfig);
 * ```
 */
export function assertItemsValid(wrappers: Iterable<HTMLElement>, config: Config): void {
	const problems: string[] = [];
	for (const [index, wrapper] of [...wrappers].entries()) {
		const reasons = validateItemHtml(wrapper.innerHTML, seedOf(wrapper), config);
		if (reasons.length > 0) {
			problems.push(
				`item index ${index} ("${wrapper.dataset.bgi}"): ${reasons.join(' ')}`,
			);
		}
	}
	if (problems.length > 0) {
		// `index` counts from 0, as `item_update`'s `itemIndex` does
		throw new Error(`Nothing was written. ${problems.join(' ')}`);
	}
}
