import { appendStylesheetTo } from './dom-helpers/append-stylesheet-to.js';
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
			const css = options.stylesheet;
			const blob = new Blob([css], { type: 'text/css' });
			const url = URL.createObjectURL(blob);
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
