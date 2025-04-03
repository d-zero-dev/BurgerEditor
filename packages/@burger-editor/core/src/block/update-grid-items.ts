import type { BurgerEditorEngine } from '../engine/engine.js';
import type { ItemData } from '../item/types.js';

import { Item } from '../item/item.js';

/**
 * グリッドアイテムを追加または削除する
 * @param $items - 子要素の配列
 * @param engine - BurgerEditorEngineインスタンス
 * @param addOrRemove - 1: 追加, -1: 削除
 * @param items - アイテムの配列
 * @param updateItem
 * @description
 * グリッドアイテムの追加/削除を行う:
 * - 追加の場合:
 *   1. 最後の要素をクローン
 *   2. クローンを親要素に追加
 *   3. クローン内のアイテムを初期化してitemsに追加
 * - 削除の場合:
 *   1. 最後の要素を削除
 *   2. itemsから対応するアイテムを削除
 */
export async function updateGridItems(
	$items: readonly Element[],
	engine: BurgerEditorEngine,
	addOrRemove: 1 | -1,
	items: readonly Item<ItemData, { [key: string]: unknown }>[],
	updateItem: (items: readonly Item<ItemData, { [key: string]: unknown }>[]) => void,
): Promise<void> {
	const $lastItem = $items.at(-1);
	if (!$lastItem) {
		return;
	}

	// Add
	if (addOrRemove === 1) {
		const $newItem = $lastItem.cloneNode(true) as HTMLElement;
		$lastItem.parentElement?.append($newItem);
		const $newItems = $newItem.querySelectorAll<HTMLElement>('[data-bge-group]');
		for (const $item of $newItems) {
			const item = await Item.new(engine, $item);
			const newItems = [...items];
			newItems[newItems.length] = item;
			updateItem(newItems);
		}
		return;
	}

	// Remove
	const removeCount = $lastItem.querySelectorAll('[data-bge-group]').length;
	$lastItem.remove();
	const newItems = [...items];
	newItems.splice(-removeCount);
	updateItem(newItems);
}
