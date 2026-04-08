import type { BlockData } from '../types.js';

import { exportContainerProps } from './export-container-props.js';
import { exportStyleOptions } from './export-style-options.js';

/**
 *
 * @param el
 */
export function exportOptions(
	el: HTMLElement,
): Pick<BlockData, 'containerProps' | 'classList' | 'id' | 'style'> {
	const containerProps = exportContainerProps(el.dataset.bgeContainer);
	const classList = [...el.classList];
	const id = el.id.replace(/^bge-/, '').trim() || null;
	const style = exportStyleOptions(el);

	// linkarea状態の取得（グループ要素の属性から）
	const groups = el.querySelectorAll<HTMLDivElement>('[data-bge-group]');
	const hasLinkarea = [...groups].some((group) =>
		Object.hasOwn(group.dataset, 'bgeLinkarea'),
	);

	return {
		containerProps: {
			...containerProps,
			linkarea: hasLinkarea,
		},
		classList,
		id,
		style,
	};
}
