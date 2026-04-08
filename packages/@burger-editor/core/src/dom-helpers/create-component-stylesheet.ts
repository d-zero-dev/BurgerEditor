import type { ItemSeed } from '../item/types.js';

import { createStylesheet } from './create-stylesheet.js';

/**
 *
 * @param items
 * @param generalCSS
 * @param layer
 */
export function createComponentStylesheet(
	items: Record<string, ItemSeed>,
	generalCSS: string,
	layer: string,
): string {
	const itemStyles = Object.values(items)
		.map((item) => item.style)
		.filter(Boolean)
		.join('\n');

	return createStylesheet(itemStyles + '\n' + generalCSS, layer);
}
