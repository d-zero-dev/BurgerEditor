import { FrozenPattyData, PrimitiveDatum } from './frozen-patty';

/**
 *
 */
export function arrayToHash (kvs: [keyof FrozenPattyData, PrimitiveDatum, boolean][]) {
	const result: { [index: string]: PrimitiveDatum | PrimitiveDatum[] } = {};
	for (const kv of kvs) {
		const k = kv[0];
		const v = kv[1];
		const toArray = kv[2];
		if (toArray) {
			const arrayPropVal = result[k];
			if (Array.isArray(arrayPropVal)) {
				arrayPropVal.push(v);
			} else {
				result[k] = k in result ? [arrayPropVal, v] : [v];
			}
		} else {
			result[k] = v;
		}
	}
	return result;
}
