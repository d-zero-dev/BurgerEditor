import type { BlockOptions } from './types.js';

import { exportContainerProps } from './export-container-props.js';

/**
 *
 * @param el
 */
export function exportOptions(el: HTMLElement): BlockOptions {
	const props = exportContainerProps(el.dataset.bgeContainer);
	const classList = [...el.classList];
	const id = el.id.replace(/^bge-/, '').trim() || null;

	const style: Record<string, string> = {};
	for (const property of el.style) {
		if (!property.startsWith('--bge-options-')) {
			continue;
		}
		const category = property.replace('--bge-options-', '');
		const propValue = el.style.getPropertyValue(property);
		const [, _category, propName] =
			propValue.match(/^var\(--bge-options-([a-z]+)-([a-z]+(?:-[a-z]+)*)\)$/) ?? [];

		if (category !== _category || !propName) {
			continue;
		}

		style[category] = propName;
	}

	return {
		props,
		classList,
		id,
		style,
	};
}
