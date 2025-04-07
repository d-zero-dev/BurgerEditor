import type { Filter, FrozenPattyData } from './types.js';

import { getComponent } from './get-component.js';
import { setComponent } from './set-component.js';
import { sanitizeHtml } from './utils.js';

export default class FrozenPatty {
	#attr = 'field';
	#dom: Element;
	/**
	 * Value filter
	 */
	#filter?: Filter;
	#typeConvert = false;
	/**
	 * Enable XSS protection
	 */
	#xssSanitize = true;

	/**
	 *
	 * @param html Original HTML
	 * @param options Options
	 */
	constructor(html: string, options?: FrozenPattyOptions) {
		this.#dom = document.createElement('fp-placeholer');

		// Sanitize initial HTML if XSS protection is enabled
		if (options?.xssSanitize === false) {
			this.#dom.innerHTML = html;
			this.#xssSanitize = false;
		} else {
			this.#dom.innerHTML = sanitizeHtml(html);
		}

		if (options) {
			if (options.attr) {
				this.#attr = options.attr;
			}
			this.#typeConvert = !!options.typeConvert;
			this.#filter = options.valueFilter;
		}
	}

	merge(data: FrozenPattyData) {
		const currentData = this.toJSON(false);
		const newData = Object.assign(currentData, data);

		// Pass XSS protection flag to set (default is true if not set)
		this.#dom = setComponent(
			this.#dom,
			newData,
			this.#attr,
			this.#filter,
			this.#xssSanitize,
		);
		return this;
	}

	toDOM(): Element {
		return this.#dom;
	}

	toHTML(): string {
		return this.#dom.innerHTML;
	}

	toJSON(filtering = true): FrozenPattyData {
		const filter = filtering ? this.#filter : undefined;
		return getComponent(this.#dom, this.#attr, this.#typeConvert, filter);
	}
}

export interface FrozenPattyOptions {
	/**
	 * **Data attribute** name for specifying the node that FrozenPatty treats as a _field_
	 * @default `"field"`
	 */
	attr?: string;

	/**
	 * Auto type convertion that value of data attributes
	 *
	 * - `"true"` => `true`
	 * - `"false"` => `false`
	 * - `"0"` => `0`
	 * - `"1"` => `1`
	 * - `"1.0"` => `1`
	 * - `"0.1"` => `0.1`
	 * @default `false`
	 */
	typeConvert?: boolean;

	/**
	 * Value filter
	 */
	valueFilter?: Filter;

	/**
	 * Enable XSS protection
	 * - When enabled, removes potentially malicious code that may be contained in HTML
	 * - Prevents script elements, dangerous event handler attributes, javascript protocol, etc.
	 * @default `true`
	 */
	xssSanitize?: boolean;
}
