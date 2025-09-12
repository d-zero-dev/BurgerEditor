import type { BlockData, BlockItemStructure } from '../types.js';
import type { CreateItemElement } from './types.js';

import { importContainerProps } from './import-container-props.js';

/**
 * BlockDataからHTML要素を生成する
 *
 * コンテナ特性・クラス・スタイル・IDは BurgerBlock#importOptions で設定される
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
	container.dataset.bgeContainer = importContainerProps(data.containerProps);

	const frame = document.createElement('div');
	frame.dataset.bgeContainerFrame = '';
	container.append(frame);

	const itemElements = await createItemElements(data.items, createItemElement);
	frame.append(...itemElements);

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
