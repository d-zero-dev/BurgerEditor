import type { Filter, FrozenPattyData } from './types.js';

import { kebabCase } from '@burger-editor/utils';

import { setValue } from './set-value.js';
import { stringifyFields } from './stringify-fields.js';
import {
	definedFields,
	flattenData,
	getFields,
	hasField,
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
		const decendants = listRoot.querySelectorAll('*');
		const definedFieldsOfDecendants = new Set(
			[...decendants].flatMap((el) => definedFields(el, attr)),
		);
		const maxLength = maxLengthOf(data, [...definedFieldsOfDecendants]);
		const listItem = listRoot.children[0]?.cloneNode(true);
		if (!listItem) {
			continue;
		}
		while (listRoot.firstChild) {
			listRoot.firstChild.remove();
		}
		for (let i = 0; i < maxLength; i++) {
			let item = listItem.cloneNode(true) as Element;
			const itemData = flattenData(data, i);
			let reverse = false;

			switch (listRoot.localName) {
				case 'picture': {
					reverse = true;
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
