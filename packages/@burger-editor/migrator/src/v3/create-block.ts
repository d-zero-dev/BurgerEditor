import type { ItemData } from '@burger-editor/core';

import { itemImport } from '@burger-editor/core';
import { blocks, items } from '@burger-editor/legacy/v3';
import { replaceCommentWithHTML } from '@burger-editor/utils';

/**
 *
 * @param blockName
 * @param data
 */
export function createBlock(blockName: keyof typeof blocks, data: readonly ItemData[]) {
	// @ts-ignore
	const blockTemplate = blocks[blockName];
	if (!blockTemplate) {
		throw new Error(`Block ${blockName} not found`);
	}

	const itemDataStack = [...data];

	const html = replaceCommentWithHTML(blockTemplate.trim(), items, (_, itemTemplate) => {
		itemTemplate = itemTemplate.trim();
		const itemData = itemDataStack.shift();
		if (!itemData) {
			return itemTemplate;
		}
		const newHtml = itemImport(itemTemplate, itemData);
		return newHtml;
	});

	return html;
}
