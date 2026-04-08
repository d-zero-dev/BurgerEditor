import type { Filter, FrozenPattyData, PrimitiveDatum } from './types.js';

import { getValues } from './get-values.js';
import { arrayToHash } from './utils.js';

const reverseListElementSelectors = ['picture'];

/**
 *
 * @param el
 * @param attr
 * @param typeConvert
 * @param filter
 */
export function getComponent(
	el: Element,
	attr: string,
	typeConvert: boolean,
	filter?: Filter,
): FrozenPattyData {
	el = el.cloneNode(true) as Element;

	const reverseListElements = el.querySelectorAll(
		`:is(${reverseListElementSelectors.join(',')})[data-${attr}-list]`,
	);
	for (const reverseListElement of reverseListElements) {
		const children: Element[] = [];
		while (reverseListElement.lastElementChild) {
			children.push(reverseListElement.lastElementChild);
			reverseListElement.lastElementChild.remove();
		}
		reverseListElement.append(...children);
	}

	const filedElements = el.querySelectorAll(`[data-${attr}]`);
	let values: [keyof FrozenPattyData, PrimitiveDatum, boolean][] = [];
	for (const _el of filedElements) {
		values = [...values, ...getValues(_el, typeConvert, attr, filter)];
	}
	const result = arrayToHash(values);
	return result;
}
