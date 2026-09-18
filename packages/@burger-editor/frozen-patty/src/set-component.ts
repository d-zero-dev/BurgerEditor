import type { Filter, FrozenPattyData } from './types.js';

import { kebabCase } from '@burger-editor/utils';

import { setValue } from './set-value.js';
import { stringifyFields } from './stringify-fields.js';
import {
	definedFields,
	flattenData,
	getFields,
	hasField,
	isReverseListElement,
	maxLengthOf,
	removeProp,
	replaceNode,
	replaceProp,
} from './utils.js';

/**
 *
 * @param el
 * @param data
 * @param attr
 * @param filter
 * @param xssSanitize Enable XSS protection
 */
export function setComponent(
	el: Element,
	data: FrozenPattyData,
	attr: string,
	filter?: Filter,
	xssSanitize = true,
) {
	el = el.cloneNode(true) as Element;

	for (const dataKeyName in data) {
		const datum = data[dataKeyName];
		if (Array.isArray(datum)) {
			continue;
		}

		const targetList = [
			// Include self
			el,
			// Perform rough filtering for performance
			...el.querySelectorAll(`[data-${attr}*="${kebabCase(dataKeyName)}"]`),
		]
			// Perform more accurate filtering
			.filter((el) => hasField(el, attr, dataKeyName));

		for (const targetEl of targetList) {
			setValue(targetEl, dataKeyName, datum, attr, filter, xssSanitize);
		}
	}

	for (const listRoot of el.querySelectorAll(`[data-${attr}-list]`)) {
		const reverse = isReverseListElement(listRoot);
		const decendants = listRoot.querySelectorAll('*');
		const definedFieldsOfDecendants = new Set(
			[...decendants].flatMap((el) => definedFields(el, attr)),
		);
		const maxLength = maxLengthOf(data, [...definedFieldsOfDecendants]);
		// 逆順リスト（picture）では DOM 末尾の要素（img）が配列 index 0 に
		// 対応する。先頭要素（source）を雛形にすると、source は alt /
		// loading のバインドを持たない（下の removeProp 参照）ため、一度
		// 保存された HTML を再度テンプレートとして merge した際に img から
		// alt / loading が失われる（Item.import が現在の innerHTML を
		// テンプレートとして再利用するため、2回目以降の保存で発生する）。
		// getComponent 側の「末尾 = index 0」という読み取り規則と対称にする
		const templateEl = reverse ? listRoot.lastElementChild : listRoot.firstElementChild;
		const listItem = templateEl?.cloneNode(true);
		if (!listItem) {
			continue;
		}
		while (listRoot.firstChild) {
			listRoot.firstChild.remove();
		}
		// Track used paths for picture elements to avoid duplicates
		const usedPaths = new Set<string>();

		for (let i = 0; i < maxLength; i++) {
			let item = listItem.cloneNode(true) as Element;
			const itemData = flattenData(data, i);

			switch (listRoot.localName) {
				case 'picture': {
					// Check for duplicate paths and skip if found
					const pathValue = itemData.path;
					if (pathValue != null && usedPaths.has(String(pathValue))) {
						continue;
					}
					if (pathValue != null) {
						usedPaths.add(String(pathValue));
					}

					let fields = getFields(item, attr);
					if (i === 0) {
						// Convert first item to img element
						item = replaceNode(item, 'img', attr, xssSanitize);
						fields = replaceProp(fields, 'srcset', 'src');
						fields = removeProp(fields, 'sizes');
						const fieldQuery = stringifyFields(fields);
						item.setAttribute(`data-${attr}`, fieldQuery);
					} else {
						// Convert subsequent items to source elements
						item = replaceNode(item, 'source', attr, xssSanitize);
						fields = replaceProp(fields, 'src', 'srcset');
						fields = removeProp(fields, 'alt');
						fields = removeProp(fields, 'loading');
						const fieldQuery = stringifyFields(fields);
						item.setAttribute(`data-${attr}`, fieldQuery);
					}
					break;
				}
			}

			const newEl = setComponent(item, itemData, attr, filter, xssSanitize);

			if (reverse) {
				listRoot.prepend(newEl);
			} else {
				listRoot.append(newEl);
			}
		}
	}

	return el;
}
