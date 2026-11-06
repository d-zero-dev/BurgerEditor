import type { ItemSeed } from './types.js';
import type { Config } from '../types.js';

import { dataFromHtml } from './data-from-html.js';
import { dataToHtml } from './data-to-html.js';
import { normalizeItemData } from './normalize-item-data.js';

/**
 * Apply a seed's `normalizeItemData` to an item's HTML that was written as HTML
 * (source mode, an agent's raw block HTML) rather than through item data. The
 * item's data is read back, normalized and rendered again only when the seed
 * changes it; an item that needs nothing, or whose seed has no
 * `normalizeItemData`, keeps the markup as written (and is not even read back).
 * @param html - The item's inner HTML (the content of `[data-bgi]`)
 * @param seed - The item definition (`null` / `undefined` for an item that is not defined)
 * @param config - The editor config
 * @returns The new inner HTML, or `null` when nothing changed
 * @example
 * ```ts
 * const next = normalizeItemHtml(wrapper.innerHTML, items.image, config);
 * if (next !== null) wrapper.innerHTML = next;
 * ```
 */
export function normalizeItemHtml(
	html: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	seed: Pick<ItemSeed<string, any, any>, 'normalizeItemData'> | null | undefined,
	config: Config,
): string | null {
	if (!seed?.normalizeItemData) {
		return null;
	}
	const data = dataFromHtml(html);
	const normalized = normalizeItemData(seed, data, config);
	return normalized === data ? null : dataToHtml(html, normalized);
}
