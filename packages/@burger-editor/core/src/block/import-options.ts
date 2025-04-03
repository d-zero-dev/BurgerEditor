import type { BlockOptions } from './types.js';

import { sanitizeAttrs } from '../dom-helpers/sanitize-attrs.js';

import { importContainerProps } from './import-container-props.js';

/**
 *
 * @param el
 * @param options
 */
export function importOptions(el: HTMLElement, options: BlockOptions) {
	const { props, classList, id, style } = options;

	sanitizeAttrs(el);

	el.dataset.bgeContainer = importContainerProps(props);

	el.classList.remove(...el.classList);
	if (classList.length > 0) {
		el.classList.add(...classList);
	} else {
		el.removeAttribute('class');
	}

	if (id && id.trim()) {
		el.id = `bge-${id.trim()}`;
	} else {
		el.removeAttribute('id');
	}

	el.removeAttribute('style');
	for (const [key, value] of Object.entries(style)) {
		if (value === '@@default') {
			continue;
		}
		const name = `--bge-options-${key}`;
		const variable = `var(${name}-${value})`;
		el.style.setProperty(name, variable);
	}
}
