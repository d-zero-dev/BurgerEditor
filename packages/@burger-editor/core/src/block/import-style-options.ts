import { BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX } from '../const.js';

/**
 *
 * @param el
 * @param style
 */
export function importStyleOptions(el: HTMLElement, style: Record<string, string>) {
	for (const [key, value] of Object.entries(style)) {
		if (value === '@@default') {
			continue;
		}
		const name = `${BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX}${key}`;
		const variable = `var(${name}-${value})`;
		el.style.setProperty(name, variable);
	}
}
