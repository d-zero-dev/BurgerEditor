import { BurgerBlock } from './block/block.js';
import { getCSSPropertyAsNumber } from './dom-helpers/get-css-property-as-number.js';

/**
 *
 * @param doc
 * @param x
 * @param y
 */
export function getBlockAtPosition(doc: Document, x: number, y: number) {
	const blocks = doc.body.querySelectorAll<HTMLElement>('[data-bge-container]');

	for (const $block of blocks) {
		const rect = $block.getBoundingClientRect();
		const marginBlockEnd = getCSSPropertyAsNumber($block, 'margin-block-end');

		const onMouse =
			rect.left <= x &&
			x <= rect.right &&
			rect.top <= y &&
			y <= rect.bottom + marginBlockEnd;
		if (onMouse) {
			const block = BurgerBlock.getBlock($block);
			return { block, rect, marginBlockEnd };
		}
	}

	return null;
}
