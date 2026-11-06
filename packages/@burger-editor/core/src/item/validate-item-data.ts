import type { ItemData, ItemSeed } from './types.js';
import type { Config } from '../types.js';

import { dataFromHtml } from './data-from-html.js';

/**
 * Ask a seed's `validateItemData` whether item data may be saved. A seed without
 * `validateItemData` has nothing to reject.
 *
 * `toItemData` validates the editor's own saves; a writer that skips it (the
 * agent tools) calls this on the data that is about to become HTML, after
 * `normalizeItemData`, so that what is checked is what gets saved.
 * @param seed - The item definition. `null` / `undefined` (an item that is not
 * defined) has nothing to reject
 * @param data - The data to become HTML (possibly partial)
 * @param config - The editor config
 * @returns The reasons the data must not be saved, each written for the author.
 * Empty when the data may be saved
 * @example
 * ```ts
 * const reasons = validateItemData(
 * 	items.image,
 * 	{ node: 'a', href: 'https://example.com/', alt: [''] },
 * 	config,
 * );
 * // reasons is ['代替テキスト(alt)が空です。…']
 * ```
 */
export function validateItemData<T extends ItemData>(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	seed: Pick<ItemSeed<string, any, any>, 'validateItemData'> | null | undefined,
	data: Partial<T>,
	config: Config,
): readonly string[] {
	return seed?.validateItemData?.(data, config) ?? [];
}

/**
 * Validate an item's HTML that was written as HTML (an agent's raw block HTML)
 * rather than through item data: the data is read back from the markup and
 * given to {@link validateItemData}. A seed without `validateItemData` is not
 * even read back.
 * @param html - The item's inner HTML (the content of `[data-bgi]`)
 * @param seed - The item definition (`null` / `undefined` for an item that is not defined)
 * @param config - The editor config
 * @returns The reasons the item must not be saved. Empty when it may be saved
 * @example
 * ```ts
 * const reasons = validateItemHtml(wrapper.innerHTML, items.image, config);
 * if (reasons.length > 0) throw new Error(reasons.join(' '));
 * ```
 */
export function validateItemHtml(
	html: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	seed: Pick<ItemSeed<string, any, any>, 'validateItemData'> | null | undefined,
	config: Config,
): readonly string[] {
	if (!seed?.validateItemData) {
		return [];
	}
	return validateItemData(seed, dataFromHtml(html), config);
}
