import type { ElementSeed } from './types.js';

type CreateElementOptions = ElementSeed;

/**
 *
 * @param options
 * @param global
 */
export function createElement(options: CreateElementOptions, global: Window = window) {
	const document = global.document;
	const wrapperElement = document.createElement(options.tag ?? 'div');
	if (options.attributes) {
		for (const [key, value] of Object.entries(options.attributes)) {
			wrapperElement.setAttribute(key, value);
		}
	}
	if (options.className) {
		wrapperElement.className = options.className;
	}
	return wrapperElement;
}
