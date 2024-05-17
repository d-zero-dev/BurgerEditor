import type { Filter, FrozenPattyData } from './types.js';

import { setValue } from './set-value.js';

export default function (
	el: Element,
	data: FrozenPattyData,
	attr: string,
	filter?: Filter,
) {
	el = el.cloneNode(true) as Element;
	for (const dataKeyName in data) {
		if (dataKeyName in data) {
			const datum = data[dataKeyName];
			const selector = `[data-${attr}*="${dataKeyName}"]`;
			// eslint-disable-next-line unicorn/prefer-spread
			const targetList = Array.from(el.querySelectorAll(selector));
			if (Array.isArray(datum)) {
				const targetEl = targetList[0];
				if (!targetEl) {
					continue;
				}
				const listRoot = targetEl.closest(`[data-${attr}-list]`);
				if (!listRoot || (listRoot && listRoot.children.length === 0)) {
					continue;
				}
				const listItem = listRoot.children[0]?.cloneNode(true);
				while (listItem && datum.length > listRoot.children.length) {
					listRoot.append(listItem.cloneNode(true));
				}
				// eslint-disable-next-line unicorn/prefer-spread
				const newChildren = Array.from(listRoot.querySelectorAll(selector));
				// eslint-disable-next-line unicorn/prefer-spread
				const oldChildList = Array.from(listRoot.children);
				let deleteNodeList: Element[] = [];
				for (const [i, child] of [...newChildren].entries()) {
					if (datum[i] == null) {
						setValue(child, dataKeyName, '', attr, filter);
						const oldChild = oldChildList[i];
						if (oldChild) {
							deleteNodeList.push(oldChild);
						}
					} else {
						setValue(child, dataKeyName, datum[i], attr, filter);
						deleteNodeList = [];
					}
				}
				for (const node of deleteNodeList) node.remove();
			} else {
				for (const [, targetEl] of [...targetList].entries()) {
					setValue(targetEl, dataKeyName, datum, attr, filter);
				}
			}
		}
	}
	return el;
}
