import type { Filter, FrozenPattyData } from './types.js';

import get from './get.js';
import set from './set.js';

export default class FrozenPatty {
	#attr = 'field';
	#dom: Element;
	/**
	 * Value filter
	 */
	#filter?: Filter;
	#typeConvert = false;

	/**
	 *
	 * @param html Original HTML
	 * @param options Options
	 */
	constructor(html: string, options?: FrozenPattyOptions) {
		this.#dom = document.createElement('fp-placeholer');
		this.#dom.innerHTML = html;
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
		this.#dom = set(this.#dom, newData, this.#attr, this.#filter);
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
		return get(this.#dom, this.#attr, this.#typeConvert, filter);
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
}
