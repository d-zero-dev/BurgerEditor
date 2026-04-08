import type { ItemSeed } from './item/types.js';
import type { BlockData, Config } from './types.js';

import { BurgerBlock } from './block/block.js';
import { Item } from './item/item.js';

interface Options {
	readonly items: Record<string, ItemSeed>;
	readonly config?: Config;
}

/**
 *
 * @param data
 * @param options
 */
export async function render(data: BlockData, options: Options) {
	const block = await BurgerBlock.create(data, (itemData) => {
		if (typeof itemData !== 'string' && 'localName' in itemData) {
			throw new Error('Do not support to rebind item data type.');
		}

		const itemsMap = new Map();
		for (const [name, seed] of Object.entries(options.items)) {
			itemsMap.set(name, seed);
		}

		const name = typeof itemData === 'string' ? itemData : itemData.name;
		const seed: ItemSeed | null = itemsMap.get(name) ?? null;
		const template = seed?.template ?? '';
		const data = typeof itemData === 'string' ? {} : (itemData.data ?? {});
		const html = Item.createElement(template, data);
		const wrapper = Item.createWrapper(name, seed, {
			classList: [],
			googleMapsApiKey: null,
			sampleImagePath: '',
			sampleFilePath: '',
			stylesheets: [],
			...options.config,
		});
		wrapper.innerHTML = html;
		return wrapper;
	});
	return block.el;
}
