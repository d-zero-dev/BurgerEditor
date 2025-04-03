import type { ItemData } from './types.js';

import frozenPatty from '@burger-editor/frozen-patty';

import { valueFilter } from './value-filter.js';

/**
 *
 * @param html
 * @param data
 */
export function dataToHtml(html: string, data: ItemData): string {
	return frozenPatty(html, {
		attr: 'bge',
		typeConvert: true,
		valueFilter,
	})
		.merge(data)
		.toHTML();
}
