import type { Filter, PrimitiveDatum } from './types.js';

import { getValues } from './get-values.js';
import { arrayToHash } from './utils.js';

/**
 * Get value from an element
 *
 * @param el A target element
 * @param name A label name
 * @param typeConvert Auto covert type of value
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 */
export function getValue(
	el: Element,
	name: string,
	typeConvert = false,
	attr = 'field',
	filter?: Filter,
): PrimitiveDatum | PrimitiveDatum[] {
	const value = getValues(el, typeConvert, attr, filter);
	const data = arrayToHash(value);
	return data[name];
}
