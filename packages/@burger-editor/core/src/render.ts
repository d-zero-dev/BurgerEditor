import type { ItemSeed } from './item/types.js';
import type { BlockData, Config } from './types.js';

import { BurgerBlock } from './block/block.js';
import { ComponentObserver } from './component-observer.js';
import { Item } from './item/item.js';
import { ItemEditorDialog } from './item-editor-dialog.js';

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
	const block = await BurgerBlock.create(data, async (itemData) => {
		if (typeof itemData !== 'string' && 'localName' in itemData) {
			throw new Error('Do not support to rebind item data type.');
		}

		const itemsMap = new Map();
		for (const [name, seed] of Object.entries(options.items)) {
			itemsMap.set(name, seed);
		}

		const name = typeof itemData === 'string' ? itemData : itemData.name;

		const editor = new ItemEditorDialog({
			config: {
				classList: [],
				googleMapsApiKey: null,
				sampleImagePath: '',
				sampleFilePath: '',
				stylesheets: [],
				...options.config,
			},
			onOpened: () => {},
			getComponentObserver: () => new ComponentObserver(),
			getTemplate: () =>
				document
					.createRange()
					.createContextualFragment(options.items[name]?.template ?? '').children,
			getContentStylesheet: () => Promise.resolve(''),
			onClosed: () => {},
			onOpen: () => false,
			createEditorComponent: () => {},
		});

		const data = typeof itemData === 'string' ? {} : itemData.data;
		const item = await Item.create(name, itemsMap, editor, data);
		return item.el;
	});
	return block.el;
}
