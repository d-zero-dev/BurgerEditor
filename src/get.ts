import './polyfill';

import { arrayToHash } from './util';

import { FrozenPattyData, PrimitiveDatum } from './frozen-patty';
import getValue from './getValue';

export default function (el: Element, attr: string, typeConvert: boolean): FrozenPattyData {
	const filedElements = el.querySelectorAll(`[data-${attr}]`);
	let values: [keyof FrozenPattyData, PrimitiveDatum, boolean][] = [];
	for (const _el of Array.from(filedElements)) {
		values = values.concat(getValue(_el, attr, typeConvert));
	}
	const result = arrayToHash(values);
	return result;
}
