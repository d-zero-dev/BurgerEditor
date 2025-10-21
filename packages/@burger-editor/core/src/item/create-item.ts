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

/**
 * Create a fallback unknown-content item seed from element data
 * @param el Element with data-bgi attribute
 * @param fallbackName Default name when data-bgi is missing
 */
export function createUnknownContentItem<
	T extends ItemData = {},
	C extends { [key: string]: unknown } = {},
	N extends string = string,
>(el: HTMLElement, fallbackName: N = 'unknown-content' as N): ItemSeed<N, T, C> {
	return createItem<T, C, N>({
		name: (el.dataset.bgi as N) ?? fallbackName,
		version: el.dataset.bgiVer ?? '0.0.0',
		template: el.innerHTML ?? '',
		style: '',
		editor: '',
	});
}
