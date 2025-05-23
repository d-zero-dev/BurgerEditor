import { itemImport } from '@burger-editor/core';
import { replaceCommentWithHTML } from '@burger-editor/utils';

import { items } from './items.js';

const templateSeed = Object.fromEntries(
	Object.entries(items).map(([key, value]) => [key, value.template]),
);

/**
 *
 * @param template
 */
export function importItems(template: string) {
	return replaceCommentWithHTML(template, templateSeed, (key, html, data) => {
		const result = itemImport(html, data);
		return `<div data-bgi="${key}">${result}</div>`;
	});
}
