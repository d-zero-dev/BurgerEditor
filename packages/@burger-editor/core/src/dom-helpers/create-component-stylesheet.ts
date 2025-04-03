import type { ItemSeed } from '../item/types.js';

/**
 *
 * @param items
 * @param generalCSS
 */
export function createComponentStylesheet(
	items: Record<string, ItemSeed>,
	generalCSS: string,
): string {
	const itemStyles = Object.values(items)
		.map((item) => item.style)
		.filter(Boolean)
		.join('\n');

	const css = `${itemStyles}\n${generalCSS}`;
	const blob = new Blob([css], { type: 'text/css' });
	const url = URL.createObjectURL(blob);
	return url;
}
