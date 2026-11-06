import type { ItemSeed } from './item/types.js';
import type { BlockData, Config } from './types.js';

import { BurgerBlock } from './block/block.js';
import { withConfigDefaults } from './config-defaults.js';
import { Item } from './item/item.js';
import { normalizeItemData } from './item/normalize-item-data.js';

interface Options {
	readonly items: Record<string, ItemSeed>;
	readonly config?: Config;
}

/**
 * Render a block definition to its DOM element, without an editor engine: the
 * items are filled from the supplied data and nothing is edited in a browser.
 * The agent tools (`block_insert` / `block_replace` / `page_create`) build
 * their HTML with it.
 *
 * Each item's data goes through its seed's `normalizeItemData` with `options.config`
 * before it becomes HTML, so what is rendered here matches what the editor
 * saves for the same data (for example, an image's second `<source>` never keeps
 * an empty `media`).
 * @param data - The block to render, with the data of each item
 * @param options - The item definitions to render with, and the config
 * (`options.config` fills any key it omits with an empty value)
 * @example
 * ```ts
 * const el = await render(
 * 	{
 * 		name: 'image',
 * 		containerProps: { type: 'grid', columns: 1 },
 * 		items: [[{ name: 'image', data: { path: ['/a.png', '/b.png'], media: ['', ''] } }]],
 * 	},
 * 	{ items, config: { mediaQueries: ['(max-width: 599px)'] } as Config },
 * );
 * // The second <source> has media="(max-width: 599px)"
 * ```
 */
export async function render(data: BlockData, options: Options) {
	const config: Config = withConfigDefaults(options.config);
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
		// render() は toItemData を通らない（通すには、アイテムごとのエディタ状態が
		// 要る）。画面の保存と同じ補正を、データを HTML にする直前に、
		// normalizeItemData でかける。かけないと、エージェントが書いたデータだけ
		// 空の media などが残る
		const html = Item.createElement(template, normalizeItemData(seed, data, config));
		const wrapper = Item.createWrapper(name, seed, config);
		wrapper.innerHTML = html;
		return wrapper;
	});
	return block.el;
}
