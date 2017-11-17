import './polyfill';

import { arrayToHash } from './util';

import { Filter, FrozenPattyData, PrimitiveDatum } from './frozen-patty';
import getValue from './getValue';

export default function (el: Element, attr: string, typeConvert: boolean, filter?: Filter): FrozenPattyData {
	const filedElements = el.querySelectorAll(`[data-${attr}]`);
	let values: [keyof FrozenPattyData, PrimitiveDatum, boolean][] = [];
	for (const _el of Array.from(filedElements)) {
		values = values.concat(getValue(_el, attr, typeConvert, filter));
	}
	const result = arrayToHash(values);
	return result;
}
