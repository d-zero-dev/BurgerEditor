import { BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX } from '../const.js';

/**
 * Read the selected style options back from a block container's inline
 * `style`.
 *
 * Each `--bge-options-{category}: var(--bge-options-{category}--{key})`
 * declaration becomes `{ [category]: key }`, which is the inverse of
 * `importStyleOptions`. The `var()` reference is split on `--` the same way
 * the editor's option detection splits declared names, so any category and
 * key the editor offers as a choice round-trips, whatever characters they
 * use. Names containing `--` (or a category ending in `-`) cannot be split
 * unambiguously and are ignored, as are declarations whose `var()` points
 * at another category or that are not a single `var()` reference.
 * @param el - Block container element whose inline `style` holds the options
 * @returns Map of category to selected key
 * @example
 * ```ts
 * el.setAttribute('style', '--bge-options-gap: var(--bge-options-gap--2x)');
 * exportStyleOptions(el); // { gap: '2x' }
 * ```
 */
export function exportStyleOptions(el: HTMLElement): Record<string, string> {
	const style: Record<string, string> = {};
	// jsdom's CSSStyleDeclaration is not always iterable; use indexed access
	// so the same loop works in browser, jsdom, and any DOM that exposes the
	// standard `length` + `item()` interface.
	const decl = el.style;
	for (let i = 0; i < decl.length; i++) {
		const property = decl.item(i);
		if (!property.startsWith(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX)) {
			continue;
		}
		const category = property.slice(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX.length);
		const reference = /^var\(\s*([^\s(),]+)\s*\)$/.exec(
			decl.getPropertyValue(property).trim(),
		)?.[1];
		if (!category || !reference?.startsWith(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX)) {
			continue;
		}

		// Split exactly as `getCustomProperties` does, so a name is restored only
		// when the editor detected the same category and key for it.
		const segments = reference
			.slice(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX.length)
			.split('--');
		const [referencedCategory, key] = segments;
		if (segments.length !== 2 || referencedCategory !== category || !key) {
			continue;
		}

		style[category] = key;
	}

	return style;
}
