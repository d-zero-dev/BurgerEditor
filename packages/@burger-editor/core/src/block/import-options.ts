import type { BlockData } from '../types.js';

import { sanitizeAttrs } from '../dom-helpers/sanitize-attrs.js';

import { importContainerProps } from './import-container-props.js';
import { importStyleOptions } from './import-style-options.js';

/**
 *
 * @param el
 * @param options
 */
export function importOptions(el: HTMLElement, options: Partial<BlockData>) {
	const { containerProps, classList, id, style } = options;

	sanitizeAttrs(el);

	el.dataset.bgeContainer = importContainerProps(containerProps);
	el.removeAttribute('class');

	if (classList && classList.length > 0) {
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

	if (style) {
		importStyleOptions(el, style);
	}

	// linkarea属性の処理
	const groups = el.querySelectorAll<HTMLElement>('[data-bge-group]');
	for (const group of groups) {
		if (containerProps?.linkarea) {
			group.dataset.bgeLinkarea = '';
		} else {
			delete group.dataset.bgeLinkarea;
		}
	}
}
