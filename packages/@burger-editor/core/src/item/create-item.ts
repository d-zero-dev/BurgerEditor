import type { ItemSeed, ItemData } from './types.js';

/**
 * Create an Item seed. This is a typed identity helper that preserves generics.
 * @param item
 */
export function createItem<
	T extends ItemData = {},
	C extends { [key: string]: unknown } = {},
	N extends string = string,
>(item: ItemSeed<N, T, C>) {
	return item;
}
