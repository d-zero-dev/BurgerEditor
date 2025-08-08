import { BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX } from '../const.js';

/**
 *
 * @param el
 */
export function exportStyleOptions(el: HTMLElement): Record<string, string> {
	const style: Record<string, string> = {};
	for (const property of el.style) {
		if (!property.startsWith(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX)) {
			continue;
		}
		const category = property.replace(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX, '');
		const propValue = el.style.getPropertyValue(property);
		const [, _category, propName] =
			propValue
				.replace(`var(${BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX}`, '')
				.replace(/\)$/, '')
				.match(/^([a-z]+)-([a-z]+(?:-[a-z]+)*)$/) ?? [];

		if (category !== _category || !propName) {
			continue;
		}

		style[category] = propName;
	}

	return style;
}
