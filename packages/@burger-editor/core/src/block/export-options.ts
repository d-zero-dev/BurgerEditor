import type { BlockOptions } from './types.js';

import { exportContainerProps } from './export-container-props.js';
import { exportStyleOptions } from './export-style-options.js';

/**
 *
 * @param el
 */
export function exportOptions(el: HTMLElement): BlockOptions {
	const props = exportContainerProps(el.dataset.bgeContainer);
	const classList = [...el.classList];
	const id = el.id.replace(/^bge-/, '').trim() || null;
	const style = exportStyleOptions(el);

	return {
		props,
		classList,
		id,
		style,
	};
}
