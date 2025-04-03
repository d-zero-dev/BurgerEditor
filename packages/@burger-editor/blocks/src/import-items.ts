import { itemImport, type ItemSeed } from '@burger-editor/core';

import { items } from './items.js';

/**
 *
 * @param template
 */
export function importItems(template: string) {
	for (const item of Object.values(items)) {
		const typedItem = item as ItemSeed;
		const itemPlaceholder = new RegExp(`<!-- ${typedItem.name}({[^}]*})? -->`, 'g');
		template = template.replaceAll(itemPlaceholder, (_, attr) => {
			let html = template;
			try {
				const data = attr ? JSON.parse(`${attr}`) : {};
				html = itemImport(typedItem.template, data);
			} catch {
				throw new Error(`${typedItem.name}のテンプレートをインポートできませんでした。`);
			}
			return `<div data-bgi="${typedItem.name}" data-bgi-ver="${typedItem.version}">${html}</div>`;
		});
	}
	return template;
}
