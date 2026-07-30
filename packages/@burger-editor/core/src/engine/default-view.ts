import type { BurgerEditorView } from '../types.js';

/**
 * Headless fallback used when `BurgerEditorEngineOptions.view` is not
 * provided: each area is a bare `div` appended to the engine's view
 * area, with no shell, mode switching or visual chrome. Suitable for
 * tests and programmatic document manipulation; interactive editors
 * inject a real view (e.g. the React implementation in
 * `@burger-editor/client`).
 * @returns The fallback view implementation
 */
export function createDefaultView(): BurgerEditorView {
	const containers = new Set<HTMLElement>();

	return {
		createAreaHost({ type, engine, classList }) {
			const containerElement = document.createElement('div');
			containerElement.dataset.bgeComponent = 'editable-area';
			containerElement.dataset.bgeArea = type;
			containerElement.classList.add(...classList);
			engine.viewArea.append(containerElement);
			containers.add(containerElement);
			return Promise.resolve({ containerElement });
		},
		destroy() {
			for (const containerElement of containers) {
				containerElement.remove();
			}
			containers.clear();
		},
	};
}
