import type { BlockData, BlockItemStructure } from '../types.js';
import type { CreateItemElement } from './types.js';

import { changeFrameSemantics } from './change-frame-semantics.js';
import { importOptions } from './import-options.js';

/**
 * BlockDataからHTML要素を生成する
 *
 * data.itemsの構造でgroupの有無などが確定する
 * @param data BlockData
 * @param createItemElement アイテム要素を作成する関数
 * @returns 生成されたHTMLElement
 */
export async function createPlainStructuredBlockElement(
	data: BlockData,
	createItemElement: CreateItemElement,
): Promise<HTMLElement> {
	const container = document.createElement('div');
	container.dataset.bgeName = data.name;

	importOptions(container, data);

	const frame = document.createElement('div');
	frame.dataset.bgeContainerFrame = '';
	container.append(frame);

	const itemElements = await createItemElements(data.items, createItemElement);
	frame.append(...itemElements);

	changeFrameSemantics(container, data.containerProps.frameSemantics ?? 'div');

	return container;
}

/**
 *
 * @param items
 * @param createItemElement
 */
async function createItemElements(
	items: BlockItemStructure,
	createItemElement: CreateItemElement,
): Promise<HTMLElement[]> {
	const itemElements: HTMLElement[] = [];

	for (const item of items) {
		const groupElement = document.createElement('div');
		groupElement.dataset.bgeGroup = '';
		for (const groupItem of item) {
			const itemElement = await createItemElement(groupItem);
			const itemWrapper = document.createElement('div');
			itemWrapper.dataset.bgeItem = '';
			itemWrapper.append(itemElement);
			groupElement.append(itemWrapper);
		}
		itemElements.push(groupElement);
	}

	return itemElements;
}
