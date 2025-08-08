import type { BgeWysiwygElementOptions, Transaction } from './types.js';
import type { ElementSeed } from '../utils/types.js';
import type { Extensions } from '@tiptap/core';

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { BgeWysiwygEditorKit } from '../tiptap-extentions/index.js';
import { createElement } from '../utils/create-element.js';

declare global {
	interface HTMLElementEventMap {
		transaction: CustomEvent<Transaction>;
	}
}

/**
 *
 * @param options
 * @param global
 */
export function defineBgeWysiwygElement(
	options?: BgeWysiwygElementOptions,
	global: Window = window,
) {
	if (options?.extensions) {
		BgeWysiwygElement.extensions = options.extensions;
	}

	if (options?.wrapperElement) {
		BgeWysiwygElement.wrapperElement = options.wrapperElement;
	}

	const tagName = `bge-wysiwyg`;
	if (!global.customElements.get(tagName)) {
		global.customElements.define(tagName, BgeWysiwygElement);
	}
}

export class BgeWysiwygElement extends HTMLElement {
	#editor: Editor | null = null;
	#editorRoot: HTMLDivElement | null = null;
	#previewStyle: HTMLStyleElement | null = null;
	#textarea: HTMLTextAreaElement | null = null;
	#textareaDescriptor: PropertyDescriptor | null = null;

	get value() {
		return this.#textarea?.value ?? '';
	}

	set value(value: string) {
		if (!this.#textarea) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}
		this.#textarea.value = value;
	}

	get editor() {
		if (!this.#editor) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		return this.#editor;
	}

	set mode(mode: 'wysiwyg' | 'html') {
		if (!this.#editor || !this.#textarea) {
			return;
		}

		this.shadowRoot!.querySelector<HTMLDivElement>(`[data-bge-mode]`)?.setAttribute(
			'data-bge-mode',
			mode,
		);
		if (mode === 'wysiwyg') {
			this.#editor.commands.setContent(this.#textarea.value);
		}
	}

	constructor() {
		super();

		this.attachShadow({ mode: 'open' });

		if (!this.shadowRoot) {
			throw new Error('Not supported shadow DOM');
		}
	}

	connectedCallback() {
		if (!this.shadowRoot) {
			throw new Error('Not supported shadow DOM');
		}

		const initialValue = this.innerHTML.trim();
		const label = this.getAttribute('label') ?? '内容';
		const itemName = this.getAttribute('item-name');

		this.shadowRoot.innerHTML = `<div data-bge-mode="wysiwyg"><iframe></iframe><textarea aria-label="${label} HTML"></textarea></div>`;

		const preview = this.shadowRoot.querySelector('iframe');

		if (!preview || !preview.contentWindow || !preview.contentDocument) {
			throw new Error('Not supported iframe in shadow DOM');
		}

		this.#editorRoot = preview.contentDocument.createElement('div');
		preview.contentDocument.body.append(this.#editorRoot);
		this.#previewStyle = preview.contentDocument.createElement('style');
		preview.contentDocument.head.append(this.#previewStyle);
		const textarea = this.shadowRoot.querySelector('textarea');
		const controlUIStyle = document.createElement('style');
		this.shadowRoot.append(controlUIStyle);
		controlUIStyle.textContent = `
			:host {
				display: block;
			}

			textarea,
			iframe  {
				block-size: 50svh;
				inline-size: 100%;
				resize: vertical;
				overflow-y: auto;
				background: var(--bge-lightest-color);
				border: 1px solid var(--bge-border-color);
				border-radius: var(--border-radius);
			}

			iframe[data-focus-within="true"],
			textarea:focus-visible {
				--bge-border-color: var(--bge-ui-primary-color);
				--bge-outline-color: var(--bge-ui-primary-color);
				outline: var(--bge-focus-outline-width) solid var(--bge-outline-color);
			}

			textarea {
				font-family: var(--bge-font-family-monospace);
			}

			[data-bge-mode="wysiwyg"] textarea {
				display: none;
			}

			[data-bge-mode="html"] iframe {
				display: none;
			}
		`;

		preview.contentDocument.body.addEventListener('focusin', () => {
			preview.dataset.focusWithin = 'true';
		});
		preview.contentDocument.body.addEventListener('focusout', () => {
			delete preview.dataset.focusWithin;
		});

		if (BgeWysiwygElement.wrapperElement) {
			const wrapperElement = createElement(
				BgeWysiwygElement.wrapperElement,
				preview.contentWindow,
			);
			this.#editorRoot.after(wrapperElement);
			wrapperElement.append(this.#editorRoot);
		}

		if (!textarea) {
			throw new Error('Not supported textarea in shadow DOM');
		}

		this.#textarea = textarea;

		const extensions: Extensions = [
			StarterKit.configure({
				link: {
					HTMLAttributes: {
						target: null,
						rel: null,
					},
				},
			}),
			BgeWysiwygEditorKit,
		];

		if (BgeWysiwygElement.extensions) {
			extensions.push(...BgeWysiwygElement.extensions);
		}

		this.#editor = new Editor({
			element: this.#editorRoot,
			extensions,
			autofocus: this.hasAttribute('autofocus'),
			onTransaction: ({ editor }) => {
				const data = this.#transaction(editor);
				this.dispatchEvent(
					new CustomEvent('transaction', {
						detail: data,
						bubbles: true,
						composed: true,
					}),
				);
			},
			onUpdate: () => {
				this.syncWysiwygToTextarea();
			},
		});

		if (itemName) {
			this.#editorRoot.dataset.bgi = itemName;
		}

		this.#textareaDescriptor = Object.getOwnPropertyDescriptor(
			HTMLTextAreaElement.prototype,
			'value',
		)!;

		Object.defineProperty(this.#textarea, 'value', {
			get: () => {
				return this.#textareaDescriptor?.get?.call(this.#textarea) ?? '';
			},
			set: (value) => {
				this.#editor?.commands.setContent(value);
			},
		});

		if (initialValue) {
			this.#textarea.value = initialValue;
		}
	}

	isActive(name: string) {
		return this.editor.isActive(name) ?? false;
	}

	setStyle(css: string) {
		if (!this.#previewStyle) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		this.#previewStyle.textContent = `
			:where(html, body) {
				margin: 0;
				padding: 0;

				:where(&, *) {
					box-sizing: border-box;
				}
			}

			iframe,
			[contenteditable] {
				padding: 1rem;
				block-size: 100%;
				box-sizing: border-box;
			}

			[contenteditable]:focus-visible {
				outline: none;
			}

			${css}

			a:any-link {
				pointer-events: none !important;
			}
		`;
	}

	syncWysiwygToTextarea() {
		let html = this.editor.getHTML();
		html = html.replaceAll('<p></p>', '');
		this.#setToTextarea(html);
	}

	toggleBlockquote() {
		this.editor.chain().focus().toggleBlockquote().run();
	}

	toggleBold() {
		this.editor.chain().focus().toggleBold().run();
	}

	toggleBulletList() {
		this.editor.chain().focus().toggleBulletList().run();
	}

	toggleButtonLikeLink(options?: { href: string }) {
		this.editor.chain().focus().toggleButtonLikeLink(options).run();
	}

	toggleCode() {
		this.editor.chain().focus().toggleCode().run();
	}

	toggleFlexBox() {
		this.editor.chain().focus().toggleFlexBox().run();
	}

	toggleHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
		this.editor.chain().focus().toggleHeading({ level }).run();
	}

	toggleItalic() {
		this.editor.chain().focus().toggleItalic().run();
	}

	toggleLink(options?: { href: string }) {
		this.editor.chain().focus().toggleLink(options).run();
	}

	toggleNote() {
		this.editor.chain().focus().toggleNote().run();
	}

	toggleOrderedList() {
		this.editor.chain().focus().toggleOrderedList().run();
	}

	toggleStrike() {
		this.editor.chain().focus().toggleStrike().run();
	}

	toggleUnderline() {
		this.editor.chain().focus().toggleUnderline().run();
	}

	#setToTextarea(html: string) {
		if (!this.#textarea || !this.#textareaDescriptor) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		this.#textareaDescriptor.set?.call(this.#textarea, html);
	}

	#transaction(editor: Editor) {
		const data: Transaction = {
			state: {
				bold: {
					disabled: !editor.can().chain().focus().toggleBold().run(),
					active: editor.isActive('bold'),
				},
				italic: {
					disabled: !editor.can().chain().focus().toggleItalic().run(),
					active: editor.isActive('italic'),
				},
				underline: {
					disabled: !editor.can().chain().focus().toggleUnderline().run(),
					active: editor.isActive('underline'),
				},
				strike: {
					disabled: !editor.can().chain().focus().toggleStrike().run(),
					active: editor.isActive('strike'),
				},
				code: {
					disabled: !editor.can().chain().focus().toggleCode().run(),
					active: editor.isActive('code'),
				},
				link: {
					disabled: !editor.can().chain().focus().toggleLink().run(),
					active: editor.isActive('link'),
				},
				buttonLikeLink: {
					disabled: !editor.can().chain().focus().toggleButtonLikeLink().run(),
					active: editor.isActive('buttonLikeLink'),
				},
				blockquote: {
					disabled: !editor.can().chain().focus().toggleBlockquote().run(),
					active: editor.isActive('blockquote'),
				},
				bulletList: {
					disabled: !editor.can().chain().focus().toggleBulletList().run(),
					active: editor.isActive('bulletList'),
				},
				orderedList: {
					disabled: !editor.can().chain().focus().toggleOrderedList().run(),
					active: editor.isActive('orderedList'),
				},
				note: {
					disabled: !editor.can().chain().focus().toggleNote().run(),
					active: editor.isActive('note'),
				},
				h1: {
					disabled: !editor.can().chain().focus().toggleHeading({ level: 1 }).run(),
					active: editor.isActive('heading', { level: 1 }),
				},
				h2: {
					disabled: !editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
					active: editor.isActive('heading', { level: 2 }),
				},
				h3: {
					disabled: !editor.can().chain().focus().toggleHeading({ level: 3 }).run(),
					active: editor.isActive('heading', { level: 3 }),
				},
				h4: {
					disabled: !editor.can().chain().focus().toggleHeading({ level: 4 }).run(),
					active: editor.isActive('heading', { level: 4 }),
				},
				h5: {
					disabled: !editor.can().chain().focus().toggleHeading({ level: 5 }).run(),
					active: editor.isActive('heading', { level: 5 }),
				},
				h6: {
					disabled: !editor.can().chain().focus().toggleHeading({ level: 6 }).run(),
					active: editor.isActive('heading', { level: 6 }),
				},
				flexBox: {
					disabled: !editor.can().chain().focus().toggleFlexBox().run(),
					active: editor.isActive('flexBox'),
				},
			},
		};

		return data;
	}

	static extensions: Extensions | null = null;

	static wrapperElement: ElementSeed | null = null;
}
