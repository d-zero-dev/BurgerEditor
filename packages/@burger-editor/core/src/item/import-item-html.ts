import type { ItemData, ItemSeed } from './types.js';
import type { Config } from '../types.js';

import { dataFromHtml } from './data-from-html.js';
import { dataToHtml } from './data-to-html.js';
import { normalizeItemData } from './normalize-item-data.js';

/**
 * Write data into an item's HTML: read the current data back from `html`,
 * shallow-merge `newData` over it, pass the result through the seed's
 * `normalizeItemData`, and render it with `html` as the template.
 *
 * `Item.import` and the agent tools that write to disk both use this, so a
 * save from the editor and a save from an agent go through the same steps in
 * the same order and produce the same HTML for the same data.
 * @param html - The item's current inner HTML (the content of `[data-bgi]`)
 * @param newData - The keys to change; the others keep their current values
 * @param seed - The item definition. `null` / `undefined` (an item that is not
 * defined) renders the merged data as it is
 * @param config - The editor config
 * @returns The new inner HTML
 * @example
 * ```ts
 * wrapper.innerHTML = importItemHtml(
 * 	wrapper.innerHTML,
 * 	{ path: ['/img/pc.png', '/img/sp.png'] },
 * 	items.image,
 * 	config,
 * );
 * ```
 */
export function importItemHtml<T extends ItemData>(
	html: string,
	newData: Partial<T>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	seed: Pick<ItemSeed<string, any, any>, 'normalizeItemData'> | null | undefined,
	config: Config,
): string {
	const data = { ...(dataFromHtml(html) as T), ...newData };
	return dataToHtml(html, normalizeItemData(seed, data, config));
}
