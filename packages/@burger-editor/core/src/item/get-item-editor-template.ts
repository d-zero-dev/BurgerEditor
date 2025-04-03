import type { BurgerEditorEngine } from '../engine/engine.js';

/**
 *
 * @param engine
 * @param itemName
 */
export function getItemEditorTemplate(
	engine: BurgerEditorEngine,
	itemName: string,
): HTMLCollection | null {
	const html = engine.items.get(itemName)?.editor;
	if (!html) {
		return null;
	}
	const nodes = new DOMParser().parseFromString(html, 'text/html').body.children;
	return nodes;
}
