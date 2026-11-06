import type { ItemData, ItemSeed } from './types.js';
import type { Config } from '../types.js';

/**
 * Pass item data through a seed's `normalizeItemData` right before it becomes
 * HTML. A seed without `normalizeItemData` leaves the data as it is.
 *
 * Every writer that turns item data into HTML (`Item.import`, `render()`, and
 * the agent tools that write to disk) calls this at the same point. A separate
 * normalization per path would let a save from the editor and a save from an
 * agent produce different HTML for the same data.
 *
 * The same object comes back when nothing changed, so a writer that reads
 * items back from raw HTML can tell whether it has to render again.
 * @param seed - The item definition. `null` / `undefined` (an item that is not
 * defined) leaves the data as it is
 * @param data - The data to become HTML: the merged data of an existing item,
 * or the supplied data (possibly partial) of a new one
 * @param config - The editor config
 * @example
 * ```ts
 * const data = normalizeItemData(
 * 	items.image,
 * 	{ path: ['/img/pc.png', '/img/sp.png'], media: ['', ''] },
 * 	config,
 * );
 * // data.media is ['', '(max-width: 767px)']: the image seed fills the default
 * ```
 */
export function normalizeItemData<T extends ItemData>(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	seed: Pick<ItemSeed<string, any, any>, 'normalizeItemData'> | null | undefined,
	data: Partial<T>,
	config: Config,
): Partial<T> {
	return seed?.normalizeItemData?.(data, config) ?? data;
}
