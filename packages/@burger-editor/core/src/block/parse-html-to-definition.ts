import type { BlockItem, BlockData, BlockItemStructure } from '../types.js';

import { dataFromHtml } from '../item/data-from-html.js';

import { exportOptions } from './export-options.js';

/**
 * HTMLElement（ブロック要素）をBlockDataに変換する
 * @param el HTMLElement（data-bge-name属性を持つ要素）
 * @returns BlockData
 * @description
 * HTML要素の属性から完全にBlockDataを再構築する
 * 1. data-bge-name属性からブロック名を取得
 * 2. data-bge-container属性からcontainerPropsを解析
 * 3. class属性からclassListを抽出
 * 4. data-bge属性を持つ子要素からitemsを解析
 * 5. アイコンはフォールバック定義から取得
 */
export function parseHTMLToBlockData(el: HTMLElement): BlockData {
	const options = exportOptions(el);

	// アイテム構造を解析
	const items = parseItemsStructure(el);

	return {
		...options,
		name: el.dataset.bgeName ?? 'unknown',
		items,
	};
}

/**
 * HTML要素からアイテム構造を解析してBlockStructureを生成
 * 複雑なグリッドレイアウトや階層構造に対応
 * @param el ブロック要素
 * @returns BlockStructure
 */
function parseItemsStructure(el: HTMLElement): BlockItemStructure {
	const groups = [...el.querySelectorAll<HTMLElement>('[data-bge-group]')];
	return groups.map<BlockItem[]>(getItemFromElement);
}

/**
 *
 * @param el
 */
function getItemFromElement(el: HTMLElement): BlockItem[] {
	const items = [...el.querySelectorAll('[data-bge-item]')];
	return items.map<BlockItem>((itemEl) => {
		const wrapper = itemEl.querySelector<HTMLElement>('[data-bgi]');
		const name = wrapper?.dataset.bgi;
		const innerHTML = wrapper?.innerHTML ?? '';
		if (!name) {
			return {
				name: 'wysiwyg',
				data: { wysiwyg: innerHTML },
			};
		}

		const data = dataFromHtml(innerHTML);

		return {
			name,
			data,
		};
	});
}
