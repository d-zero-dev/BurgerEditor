import { ElementNotFoundError, NoHTMLElementError } from '../error/errors.js';

/**
 * Resolve the engine's root element.
 *
 * `target` is either a CSS selector (resolved via `document.querySelector`,
 * first match wins) or an element handed in directly. Passing an element is
 * how two engines share one document without fighting over the same
 * selector — pass distinct elements instead of a selector that would
 * resolve both engines to the same node.
 * @param target - A CSS selector or an `HTMLElement`
 */
export function getElement(target: string | HTMLElement): HTMLElement {
	if (typeof target !== 'string') {
		// `document.querySelector(...)!` のような呼び出し元のnullアサーション
		// が外れてnull/undefinedが渡ってきた場合、そのまま返すと
		// `this.el.append(...)`側で意味の掴めないTypeErrorになる。
		// instanceof HTMLElementでの検証はcross-realm要素で偽になるため
		// 使わず、null/undefinedだけを弾く
		if (!target) {
			throw new ElementNotFoundError('(root element)', {
				additionalMessage:
					'root was passed as an element reference but resolved to null/undefined',
			});
		}
		return target;
	}
	const node = document.querySelector(target);
	if (node === null) {
		throw new ElementNotFoundError(target);
	}
	if (node instanceof HTMLElement) {
		return node;
	}
	throw new NoHTMLElementError(target);
}
