import type { FrozenPattyData, PrimitiveDatum } from './types.js';

/**
 *
 * @param kvs
 */
export function arrayToHash(kvs: [keyof FrozenPattyData, PrimitiveDatum, boolean][]) {
	const result: { [index: string]: PrimitiveDatum | PrimitiveDatum[] } = {};
	for (const kv of kvs) {
		const k = kv[0];
		const v = kv[1];
		const toArray = kv[2];

		if (!toArray) {
			result[k] = v;
			continue;
		}

		const arrayPropVal = result[k];

		if (Array.isArray(arrayPropVal)) {
			arrayPropVal.push(v);
			continue;
		}

		result[k] = k in result ? [arrayPropVal, v] : [v];
	}
	return result;
}

/**
 *
 * @param str
 */
export function kebabCase(str: string) {
	return str.replaceAll(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 *
 * @param str
 */
export function camelCase(str: string) {
	return str.replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase());
}
