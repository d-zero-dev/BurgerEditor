import type { Filter, FrozenPattyData, PrimitiveDatum } from './types.js';

import { getValues } from './get-values.js';
import { arrayToHash } from './utils.js';

/**
 *
 * @param el
 * @param attr
 * @param typeConvert
 * @param filter
 */
export default function (
	el: Element,
	attr: string,
	typeConvert: boolean,
	filter?: Filter,
): FrozenPattyData {
	// eslint-disable-next-line unicorn/prefer-spread
	const filedElements = Array.from(el.querySelectorAll(`[data-${attr}]`));
	let values: [keyof FrozenPattyData, PrimitiveDatum, boolean][] = [];
	for (const _el of filedElements) {
		values = [...values, ...getValues(_el, typeConvert, attr, filter)];
	}
	const result = arrayToHash(values);
	return result;
}
