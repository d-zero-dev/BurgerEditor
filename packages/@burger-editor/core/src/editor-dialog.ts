import type { Submitter } from './dom-helpers/types.js';
import type { BurgerEditorEngine } from './engine/engine.js';
import type { BurgerEditorEvent } from './event/create-bge-event.js';
import type { BurgerEditorEventMap, UIOptions } from './types.js';

import { EditorUI } from './editor-ui.js';

export interface DialogOption {
	readonly buttons?: {
		readonly close?: string;
		readonly complete?: string;
	};
}

export abstract class EditorDialog extends EditorUI {
	readonly engine: BurgerEditorEngine;
	readonly #body = document.createElement('div');
	#cleanUpHook: (() => void) | null = null;
	readonly #dialog = document.createElement('dialog');
	readonly #el: HTMLElement;
	readonly #footer = document.createElement('footer');
	readonly #form = document.createElement('form');

	constructor(
		name: string,
		engine: BurgerEditorEngine,
		el: HTMLElement,
		options: DialogOption,
	) {
		super(`${name}-dialog`, el);

		this.engine = engine;
		this.#el = el;

		this.#form.noValidate = true;
		this.#form.id = `${name}-dialog-form`;

		this.#form.append(this.#el);
		this.#body.append(this.#form);

		if (options.buttons?.close) {
			const button = document.createElement('button');
			button.textContent = options.buttons.close;
			button.type = 'button';
			button.addEventListener('click', () => {
				this.close();
			});
			this.#footer.append(button);
		}

		if (options.buttons?.complete) {
			const button = document.createElement('button');
			button.textContent = options.buttons.complete;
			button.type = 'submit';
			button.setAttribute('form', this.#form.id);
			this.#footer.append(button);
		}

		this.#dialog.append(this.#body, this.#footer);

		this.#form.method = 'dialog';
		this.#form.addEventListener('submit', (e) => {
			const submitter: Submitter = this.#form.ownerDocument.activeElement as Submitter;
			const cancel = this.onSubmit(e, submitter);
			if (cancel === false || e.defaultPrevented) {
				e.preventDefault();
				return false;
			}
			e.preventDefault();
			const formData = new FormData(this.#form);
			this.complete(formData);
			return;
		});

		this.#sanitize(this.#el);

		document.body.append(this.#dialog);

		this.#dialog.classList.add('bge-dialog');
		this.#dialog.addEventListener('close', this.closed.bind(this));
	}

	clearTemplate() {
		this.#el.innerHTML = '';
	}

	close() {
		this.#dialog.close();
	}

	closed() {
		this.#cleanUp();
		this.clearTemplate();
		this.#dialog.style.removeProperty('display');
		this.#dialog.style.removeProperty('width');
		this.#dialog.style.removeProperty('height');
		this.reset();
		this.engine.save();
	}

	complete(
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		formData: FormData,
	) {
		this.close();
	}

	dispatchEvent<T extends keyof BurgerEditorEventMap>(event: BurgerEditorEvent<T>) {
		return this.#el.dispatchEvent(event);
	}

	find<E extends Element = HTMLElement>(selector: string) {
		return this.#el.querySelector<E>(selector);
	}

	findAll<E extends Element = HTMLElement>(selector: string) {
		return this.#el.querySelectorAll<E>(selector);
	}

	onSubmit(
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		e: SubmitEvent,
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		submitter: Submitter,
	): boolean | void {}

	open(
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		...args: never[]
	) {
		if (this.engine.isProcessed) {
			return;
		}
		this.#dialog.showModal();
	}

	reset() {
		this.#form.reset();
	}

	setTemplate(...nodes: Node[]) {
		this.#sanitize(...nodes);
		this.#el.append(...nodes);
		this.#createEditorComponents();
	}

	#cleanUp() {
		if (this.#cleanUpHook) {
			this.#cleanUpHook();
		}
	}

	#createEditorComponents() {
		for (const el of this.findAll('[data-bge-editor-ui]')) {
			const editorComponentSubClassName = el.dataset.bgeEditorUi;
			if (editorComponentSubClassName && this.#isUIName(editorComponentSubClassName)) {
				const cleanUpHook = this.engine.ui[editorComponentSubClassName]?.(
					el,
					this.engine,
				);
				if (cleanUpHook) {
					this.#cleanUpHook = cleanUpHook.cleanUp;
				}
			}
		}
	}

	#isUIName(name: string): name is keyof UIOptions {
		return name in this.engine.ui;
	}

	#sanitize(...nodes: readonly Node[]) {
		for (const node of nodes) {
			if (!(node instanceof HTMLElement)) {
				continue;
			}
			for (const el of node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
				'input, textarea',
			)) {
				el.autocapitalize = 'off';
				el.autocomplete = 'off';
			}
			for (const el of node.querySelectorAll('button')) {
				el.type = 'button';
			}
		}
	}
}
