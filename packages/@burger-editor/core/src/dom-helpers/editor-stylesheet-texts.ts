import type { ItemSeed } from '../item/types.js';

import { CSS_LAYER } from '../const.js';

/**
 * Compose the CSS the engine loads into an editable area, in load order:
 * the cascade layer order statement, the items' own CSS plus `generalCSS`
 * in the base layer, then each stylesheet in its `layer` (the components
 * layer by default, unlayered for `''`).
 *
 * The engine builds its stylesheets from this, so code that scans the same
 * CSS outside the editor (the cli's `style_options_list` reads it into a
 * jsdom document) sees the same cascade as the block options dialog.
 * @param items - Item seeds whose `style` is loaded, as passed to the engine
 * @param generalCSS - Shared block CSS, as passed to the engine
 * @param stylesheets - Contents of `config.stylesheets`, in config order
 * @returns CSS texts, earliest first
 * @example
 * ```ts
 * import { generalCSS, items } from '@burger-editor/blocks';
 *
 * const cssTexts = editorStylesheetTexts(items, generalCSS, [
 * 	{ css: await fs.readFile('style.css', 'utf8') },
 * ]);
 * ```
 */
export function editorStylesheetTexts(
	items: Readonly<Record<string, Pick<ItemSeed, 'style'>>>,
	generalCSS: string,
	stylesheets: readonly { readonly css: string; readonly layer?: string }[],
): string[] {
	return [
		...editorBaseStylesheetTexts(items, generalCSS),
		...stylesheets.map(({ css, layer }) => editorProjectStylesheetText(css, layer)),
	];
}

/**
 * The first two texts of {@link editorStylesheetTexts}: the layer order
 * statement and the base layer. Separate so the engine can create them
 * before it fetches `config.stylesheets`.
 * @param items - Item seeds whose `style` is loaded
 * @param generalCSS - Shared block CSS
 */
export function editorBaseStylesheetTexts(
	items: Readonly<Record<string, Pick<ItemSeed, 'style'>>>,
	generalCSS: string,
): [layerOrder: string, base: string] {
	const itemStyles = Object.values(items)
		.map((item) => item.style)
		.filter(Boolean)
		.join('\n');
	return [
		`@layer ${CSS_LAYER.base}, ${CSS_LAYER.components}, ${CSS_LAYER.ui};`,
		`@layer ${CSS_LAYER.base} {${itemStyles}\n${generalCSS}}`,
	];
}

/**
 * One `config.stylesheets` entry as {@link editorStylesheetTexts} places it.
 * @param css - Stylesheet contents
 * @param layer - Cascade layer; the components layer when omitted, and no
 * layer at all for `''`
 */
export function editorProjectStylesheetText(
	css: string,
	layer: string = CSS_LAYER.components,
): string {
	return layer ? `@layer ${layer} {${css}}` : css;
}
