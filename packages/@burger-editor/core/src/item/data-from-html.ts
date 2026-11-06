import type { ItemData } from './types.js';

import frozenPatty from '@burger-editor/frozen-patty';

import { valueFilter } from './value-filter.js';

/**
 *
 * @param html
 */
export function dataFromHtml(html: string): ItemData {
	const data = frozenPatty(html, {
		attr: 'bge',
		typeConvert: true,
		valueFilter,
	}).toJSON();
	// frozen-patty reads any nesting depth; item templates nest at most two
	// levels (see the Why not on ItemDataValue)
	return data as ItemData;
}
