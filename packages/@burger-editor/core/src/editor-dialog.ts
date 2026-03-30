import type { Submitter } from './dom-helpers/types.js';
import type { BurgerEditorEvent } from './event/create-bge-event.js';
import type {
	BurgerEditorEventMap,
	EditorDialogShell,
	EditorDialogShellCreator,
	SelectableValue,
} from './types.js';

import { EditorUI } from './editor-ui.js';

export interface DialogOption {
	readonly buttons?: {
		readonly close?: string;
		readonly complete?: string;
	};
}

export interface DialogSettings {
	readonly onClosed: () => void;
	readonly onOpen: () => void | boolean;
	readonly createEditorComponent: (el: HTMLElement) => void | (() => void);
	readonly createDialogShell?: EditorDialogShellCreator;
}

export abstract class EditorDialog extends EditorUI {
	#cleanUpHooks: (() => void)[] = [];
	readonly #createEditorComponent: (el: HTMLElement) => void | (() => void);
	readonly #dialog: HTMLDialogElement;
	readonly #el: HTMLElement;
	readonly #form: HTMLFormElement;
	readonly #onClosed: () => void;
	readonly #onOpen: () => void | boolean;

	constructor(name: string, settings: DialogSettings, options: DialogOption) {
		const shell = settings.createDialogShell
			? settings.createDialogShell({ name, buttons: options.buttons })
			: createDefaultDialogShell(name, options);

		super(`${name}-dialog`, shell.containerElement);

		this.#el = shell.containerElement;
		this.#dialog = shell.dialogElement;
		this.#form = shell.formElement;
		this.#onClosed = settings.onClosed;
		this.#onOpen = settings.onOpen;
		this.#createEditorComponent = settings.createEditorComponent;

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

		this.#dialog.addEventListener('close', this.closed.bind(this));
	}

	clearTemplate() {
		this.#cleanUp();
		this.#el.innerHTML = '';
		this.#dialog.style.removeProperty('display');
		this.#dialog.style.removeProperty('width');
		this.#dialog.style.removeProperty('height');
		this.reset();
	}

	close() {
		this.#dialog.close();
	}

	closed() {
		this.clearTemplate();
		this.#onClosed();
	}

	complete(_formData: FormData) {
		this.close();
	}

	dispatchEvent<T extends keyof BurgerEditorEventMap>(event: BurgerEditorEvent<T>) {
		return this.#el.dispatchEvent(event);
	}

	find<E extends Element = HTMLElement>(selector: string) {
		return this.#el.querySelector<E>(selector);
	}

	findAll<E extends Element = HTMLElement>(selector: string, shadowSelector?: string) {
		const elements = [...this.#el.querySelectorAll<E>(selector)];
		return shadowSelector
			? elements.map((el) => el.shadowRoot?.querySelector<E>(shadowSelector) ?? el)
			: elements;
	}

	onSubmit(_e: SubmitEvent, _submitter: Submitter): boolean | void {}

	open(..._args: never[]) {
		const cancel = this.#onOpen();
		if (cancel === true) {
			return;
		}
		this.#dialog.showModal();
	}

	reset() {
		this.#form.reset();
	}

	setOptions(name: string, options: SelectableValue[]) {
		const el = this.find(`select[name="${name}"]`)!;
		if (!el || !(el instanceof HTMLSelectElement)) {
			return;
		}
		el.innerHTML = '';
		for (const option of options) {
			const optionElement = el.ownerDocument.createElement('option');
			optionElement.value = option.value;
			optionElement.textContent = option.label;
			el.append(optionElement);
		}
	}

	setTemplate(...nodes: Node[]) {
		this.#sanitize(...nodes);
		this.#el.append(...nodes);
		this.#createEditorComponents();
	}

	#cleanUp() {
		for (const cleanUpHook of this.#cleanUpHooks) {
			cleanUpHook();
		}
	}

	#createEditorComponents() {
		for (const el of this.findAll('[data-bge-editor-ui]')) {
			const cleanUpHook = this.#createEditorComponent(el);
			if (cleanUpHook) {
				this.#cleanUpHooks.push(cleanUpHook);
			}
		}
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

/**
 *
 * @param name
 * @param options
 */
function createDefaultDialogShell(
	name: string,
	options: DialogOption,
): EditorDialogShell {
	const dialogId = `${name}-dialog`;
	const formId = `${name}-dialog-form`;

	const dialog = document.createElement('dialog');
	dialog.id = dialogId;
	dialog.classList.add('bge-dialog');
	dialog.setAttribute('closedby', 'any');

	const body = document.createElement('div');
	const form = document.createElement('form');
	form.noValidate = true;
	form.method = 'dialog';
	form.id = formId;

	const container = document.createElement('div');
	form.append(container);
	body.append(form);

	const footer = document.createElement('footer');

	if (options.buttons?.close) {
		const button = document.createElement('button');
		button.textContent = options.buttons.close;
		button.type = 'button';
		button.setAttribute('command', 'close');
		button.setAttribute('commandfor', dialogId);
		// Fallback for environments without Invoker Commands support
		button.addEventListener('click', () => dialog.close());
		footer.append(button);
	}

	if (options.buttons?.complete) {
		const button = document.createElement('button');
		button.textContent = options.buttons.complete;
		button.type = 'submit';
		button.setAttribute('form', formId);
		footer.append(button);
	}

	dialog.append(body, footer);
	document.body.append(dialog);

	return {
		dialogElement: dialog,
		containerElement: container,
		formElement: form,
	};
}
