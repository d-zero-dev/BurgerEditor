import { BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX } from '../const.js';

/**
 *
 * @param el
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
		const category = property.replace(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX, '');
		const propValue = el.style.getPropertyValue(property);
		const [, _category, propName] =
			propValue
				.replace(`var(${BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX}`, '')
				.replace(/\)$/, '')
				.match(/^((?:_[a-z]+_)?[a-z]+(?:-[a-z]+)*)--([a-z]+(?:-[a-z]+)*)$/) ?? [];

		if (category !== _category || !propName) {
			continue;
		}

		style[category] = propName;
	}

	return style;
}
