import { CSS_LAYER } from './const.js';
import { appendStylesheetTo } from './dom-helpers/append-stylesheet-to.js';
import { createStylesheet } from './dom-helpers/create-stylesheet.js';
import { getElement } from './dom-helpers/get-element.js';

export type EditorUIOptions = {
	stylesheet?: string;
};

export abstract class EditorUI {
	#el: HTMLElement;

	get el() {
		return this.#el;
	}

	constructor(
		name: string,
		elOrSelector: HTMLElement | string,
		options?: EditorUIOptions,
	) {
		this.#el = typeof elOrSelector === 'string' ? getElement(elOrSelector) : elOrSelector;
		this.#el.dataset.bgeComponent = name;

		if (options?.stylesheet) {
			const url = createStylesheet(options.stylesheet, CSS_LAYER.ui);
			appendStylesheetTo(this.el.ownerDocument, url);
		}
	}

	hide() {
		this.#el.hidden = true;
	}

	show() {
		this.#el.hidden = false;
	}

	visible() {
		return !!this.#el.hidden;
	}
}
