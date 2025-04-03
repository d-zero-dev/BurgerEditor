import { ElementNotFoundError, NoHTMLElementError } from '../error/errors.js';

/**
 *
 * @param selector
 */
export function getElement(selector: string) {
	const node = document.querySelector(selector);
	if (node === null) {
		throw new ElementNotFoundError(selector);
	}
	if (node instanceof HTMLElement) {
		return node;
	}
	throw new NoHTMLElementError(selector);
}
