import { itemExport } from '@burger-editor/core';
import { blocks, items } from '@burger-editor/legacy/v3';
import { camelCase } from '@burger-editor/utils';
/**
 *
 * @param blockName
 */
export function getItemParams(blockName: keyof typeof blocks) {
	const block = blocks[blockName];

	const itemNameRegex = /<!--\s*(\S+)\s*-->/g;
	const matches = [...block.matchAll(itemNameRegex)];
	if (matches.length === 0) {
		throw new Error(`Block ${blockName} has no item`);
	}

	const itemNames = matches.map((match) => match[1]!);

	return itemNames.map((itemName) => {
		const name = camelCase(itemName);
		// @ts-ignore
		const itemTemplate = items[name] as string;
		if (!itemTemplate) {
			throw new Error(`Item ${name} not found`);
		}

		const itemData = itemExport(itemTemplate);
		return Object.keys(itemData);
	});
}
