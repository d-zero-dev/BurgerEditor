import type { ItemSeed, ItemData } from '@burger-editor/core';

/**
 *
 * @param item
 */
export function createItem<
	T extends ItemData = {},
	C extends { [key: string]: unknown } = {},
	N extends string = string,
>(item: ItemSeed<N, T, C>) {
	return item;
}
