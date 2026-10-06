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
 * `picture` 内の `source` で無効な、`img` 専用の属性。
 * `source` で有効な属性の allowlist にしないのは、グローバル属性・`data-*`・
 * `aria-*` を列挙しきれず、取りこぼすと正しい属性まで落としてしまうため
 */
const PICTURE_SOURCE_INVALID_ATTRS: readonly string[] = [
	'alt',
	'src',
	'loading',
	'decoding',
	'fetchpriority',
	'crossorigin',
	'referrerpolicy',
	'usemap',
	'ismap',
	'elementtiming',
	'attributionsrc',
	// Obsolete img attributes
	'align',
	'border',
	'hspace',
	'vspace',
	'longdesc',
	'name',
	'lowsrc',
];

/**
 * `picture` 内の `img` で無効な、`source` 専用の属性
 */
const PICTURE_IMG_INVALID_ATTRS: readonly string[] = ['media', 'type'];

/**
 * 要素から指定した属性を取り除く
 *
 * replaceNode は未バインドの静的属性を要素の種類に関係なく引き継ぎ、
 * 変換元と変換先の要素が同じ場合は何もしない。そのため、雛形 img の静的な
 * alt が source に付いたり、過去の出力で img に付いた media が残ったりする。
 * 変換の有無にかかわらず、ここで必ず落とす。
 * バインドされたフィールドは落とさない。要素のプロパティに無い属性は
 * setValue が書き込まないため（propInElement）、データの index 対応を
 * 崩してまで data-* 宣言から外す必要がない
 * @param el
 * @param names
 */
function removeAttrs(el: Element, names: readonly string[]) {
	for (const name of names) {
		el.removeAttribute(name);
	}
}

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
						removeAttrs(item, PICTURE_IMG_INVALID_ATTRS);
						fields = replaceProp(fields, 'srcset', 'src');
						fields = removeProp(fields, 'sizes');
						const fieldQuery = stringifyFields(fields);
						item.setAttribute(`data-${attr}`, fieldQuery);
					} else {
						// Convert subsequent items to source elements
						item = replaceNode(item, 'source', attr, xssSanitize);
						removeAttrs(item, PICTURE_SOURCE_INVALID_ATTRS);
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
