import IconBlockquote from '@tabler/icons/outline/blockquote.svg?raw';
import IconBold from '@tabler/icons/outline/bold.svg?raw';
import IconCode from '@tabler/icons/outline/code.svg?raw';
import IconH1 from '@tabler/icons/outline/h-1.svg?raw';
import IconH2 from '@tabler/icons/outline/h-2.svg?raw';
import IconH3 from '@tabler/icons/outline/h-3.svg?raw';
import IconH4 from '@tabler/icons/outline/h-4.svg?raw';
import IconH5 from '@tabler/icons/outline/h-5.svg?raw';
import IconH6 from '@tabler/icons/outline/h-6.svg?raw';
import IconItalic from '@tabler/icons/outline/italic.svg?raw';
import IconLink from '@tabler/icons/outline/link.svg?raw';
import IconOrderedList from '@tabler/icons/outline/list-numbers.svg?raw';
import IconBulletList from '@tabler/icons/outline/list.svg?raw';
import IconNotes from '@tabler/icons/outline/notes.svg?raw';
import IconStrikethrough from '@tabler/icons/outline/strikethrough.svg?raw';
import IconUnderline from '@tabler/icons/outline/underline.svg?raw';
import { Editor, Node } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';

/**
 *
 * @param global
 */
export function defineBgeWysiwygEditorElement(global: Window = window) {
	const tagName = `bge-wysiwyg-editor`;
	if (!global.customElements.get(tagName)) {
		global.customElements.define(tagName, BgeWysiwygEditorElement);
	}
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		note: {
			toggleNote: () => ReturnType;
		};
	}
}

export class BgeWysiwygEditorElement extends HTMLElement {
	#editor: Editor;
	#editorRoot: HTMLDivElement;
	#style: HTMLStyleElement;
	#textarea: HTMLTextAreaElement;
	#textareaDescriptor: PropertyDescriptor;
	#tiptapStyle: string;

	get name() {
		return this.getAttribute('name') ?? '';
	}

	get value() {
		return this.#textarea.value;
	}

	constructor() {
		super();

		const initialValue = this.innerHTML.trim();

		this.attachShadow({ mode: 'open' });

		const label = this.getAttribute('label') ?? '内容';

		const commands =
			// Get commands from attribute
			this.getAttribute('commands')
				?.split(',')
				.map((command) => command.trim().toLowerCase()) ??
				// Default commands
				[
					'bold',
					'italic',
					'underline',
					'strikethrough',
					'link',
					'blockquote',
					'bullet-list',
					'ordered-list',
					'note',
					'h3',
					'h4',
					'h5',
					'h6',
				];

		this.shadowRoot!.innerHTML = `
			<fieldset>
				<legend>${label}</legend>
				<div data-bge-toolbar>
					<div data-bge-toolbar-group>
						${commands.includes('bold') ? `<button type="button" data-bge-toolbar-button="bold">${IconBold}</button>` : ''}
						${commands.includes('italic') ? `<button type="button" data-bge-toolbar-button="italic">${IconItalic}</button>` : ''}
						${commands.includes('strikethrough') ? `<button type="button" data-bge-toolbar-button="strikethrough">${IconStrikethrough}</button>` : ''}
						${commands.includes('underline') ? `<button type="button" data-bge-toolbar-button="underline">${IconUnderline}</button>` : ''}
						${commands.includes('code') ? `<button type="button" data-bge-toolbar-button="code">${IconCode}</button>` : ''}
						${commands.includes('link') ? `<button type="button" data-bge-toolbar-button="link">${IconLink}</button>` : ''}
						${commands.includes('blockquote') ? `<button type="button" data-bge-toolbar-button="blockquote">${IconBlockquote}</button>` : ''}
						${commands.includes('bullet-list') ? `<button type="button" data-bge-toolbar-button="bullet-list">${IconBulletList}</button>` : ''}
						${commands.includes('ordered-list') ? `<button type="button" data-bge-toolbar-button="ordered-list">${IconOrderedList}</button>` : ''}
						${commands.includes('note') ? `<button type="button" data-bge-toolbar-button="note">${IconNotes}</button>` : ''}
						${commands.includes('h1') ? `<button type="button" data-bge-toolbar-button="h1">${IconH1}</button>` : ''}
						${commands.includes('h2') ? `<button type="button" data-bge-toolbar-button="h2">${IconH2}</button>` : ''}
						${commands.includes('h3') ? `<button type="button" data-bge-toolbar-button="h3">${IconH3}</button>` : ''}
						${commands.includes('h4') ? `<button type="button" data-bge-toolbar-button="h4">${IconH4}</button>` : ''}
						${commands.includes('h5') ? `<button type="button" data-bge-toolbar-button="h5">${IconH5}</button>` : ''}
						${commands.includes('h6') ? `<button type="button" data-bge-toolbar-button="h6">${IconH6}</button>` : ''}
					</div>
					<div data-bge-toolbar-group>
						<button type="button" data-bge-toolbar-button="html-mode">HTML Mode</button>
					</div>
				</div>
				<div data-bge-mode="wysiwyg">
					<div data-bge-preview><div data-bge-editor-root></div></div>
					<textarea aria-label="${label} HTML"></textarea>
				</div>
			</fieldset>
		`;

		this.#style = document.createElement('style');
		this.shadowRoot!.append(this.#style);

		this.#editorRoot = this.shadowRoot!.querySelector('[data-bge-editor-root]')!;

		this.#editorRoot.dataset.bgi = this.getAttribute('item-name') ?? '';

		this.#textarea = this.shadowRoot!.querySelector('textarea')!;

		const buttons = this.shadowRoot!.querySelectorAll<HTMLButtonElement>(
			'[data-bge-toolbar-button]',
		);

		for (const button of buttons) {
			button.addEventListener('click', () => bindToggle(button, editor));
		}

		const editor = new Editor({
			element: this.#editorRoot,
			extensions: [
				Node.create({
					name: 'general-block',
					group: 'block',
					content: 'block*',
					defining: true,
					priority: 0,
					addAttributes() {
						return {
							class: {
								parseHTML(node) {
									return node.getAttribute('class');
								},
							},
						};
					},
					parseHTML() {
						return [
							{
								tag: 'div:not(dl > *)',
								getAttrs: (node) => {
									return {
										class: node.getAttribute('class'),
									};
								},
							},
						];
					},
					renderHTML({ HTMLAttributes }) {
						return ['div', HTMLAttributes, 0];
					},
				}),
				Node.create({
					name: 'descriptionList',
					group: 'block',
					content: 'descriptionListTermGroup+',
					defining: true,
					parseHTML() {
						return [{ tag: 'dl' }];
					},
					renderHTML({ HTMLAttributes }) {
						return ['dl', HTMLAttributes, 0];
					},
				}),
				Node.create({
					name: 'descriptionListTermGroup',
					content: 'descriptionListTerm descriptionListDetail',
					priority: 10,
					parseHTML() {
						return [{ tag: 'div:is(dl > *)' }];
					},
					renderHTML({ HTMLAttributes }) {
						return ['div', HTMLAttributes, 0];
					},
				}),
				Node.create({
					name: 'descriptionListTerm',
					content: 'inline*',
					parseHTML() {
						return [{ tag: 'dt' }];
					},
					renderHTML({ HTMLAttributes }) {
						return ['dt', HTMLAttributes, 0];
					},
				}),
				Node.create({
					name: 'descriptionListDetail',
					content: 'paragraph block*',
					parseHTML() {
						return [{ tag: 'dd' }];
					},
					renderHTML({ HTMLAttributes }) {
						return ['dd', HTMLAttributes, 0];
					},
				}),
				Node.create({
					name: 'note',
					group: 'block',
					content: 'paragraph block*',
					defining: true,
					priority: 100_000,
					parseHTML() {
						return [
							{
								tag: 'div[role="note"]',
								getAttrs: (node) => {
									return {
										role: node.getAttribute('role'),
									};
								},
							},
						];
					},
					renderHTML() {
						return ['div', { role: 'note' }, 0];
					},
					addCommands() {
						return {
							toggleNote:
								() =>
								({ commands }) => {
									return commands.toggleWrap(this.name);
								},
						};
					},
				}),
				StarterKit.configure({
					link: {
						HTMLAttributes: {
							target: null,
							rel: null,
						},
					},
				}),
				TableKit,
			],
			autofocus: this.hasAttribute('autofocus'),
			onTransaction: ({ editor }) => {
				for (const button of buttons) {
					bindPressed(button, editor);
				}
			},
			onUpdate: () => {
				this.syncWysiwygToTextarea();
			},
		});

		const htmlModeButton = this.shadowRoot!.querySelector<HTMLButtonElement>(
			'[data-bge-toolbar-button="html-mode"]',
		)!;
		htmlModeButton.addEventListener('click', () => {
			htmlModeButton.ariaPressed =
				htmlModeButton.ariaPressed === 'true' ? 'false' : 'true';
			const mode = htmlModeButton.ariaPressed === 'true' ? 'html' : 'wysiwyg';
			this.shadowRoot!.querySelector<HTMLDivElement>(`[data-bge-mode]`)?.setAttribute(
				'data-bge-mode',
				mode,
			);
			if (mode === 'wysiwyg') {
				this.#editor.commands.setContent(this.#textarea.value);
			}
		});

		this.#editor = editor;

		const contentEditable =
			this.shadowRoot!.querySelector<HTMLElement>('[contenteditable]')!;
		contentEditable.ariaLabel = `${label} WYSIWYG`;

		this.#tiptapStyle =
			document.querySelector<HTMLStyleElement>('style[data-tiptap-style]')?.textContent ??
			'';

		const textareaDescriptor = Object.getOwnPropertyDescriptor(
			HTMLTextAreaElement.prototype,
			'value',
		);

		if (!textareaDescriptor) {
			throw new Error('textarea.value is not defined');
		}

		this.#textareaDescriptor = textareaDescriptor;

		Object.defineProperty(this.#textarea, 'value', {
			get: () => {
				return this.#textareaDescriptor?.get?.call(this.#textarea) ?? '';
			},
			set: (val) => {
				this.#editor.commands.setContent(val);
				this.#setToTextarea(val);
			},
		});

		if (initialValue) {
			this.#textarea.value = initialValue;
		}
	}

	setStyle(css: string) {
		this.#style.textContent = `
			:host {
				display: block;
				inline-size: 100%;
			}

			:where(fieldset) {
				padding: 1em;
				border: 1px solid var(--bge-border-color);
				border-radius: var(--border-radius);
			}

			${this.#tiptapStyle}

			@scope ([data-bge-preview]) {
				${css}

				a:any-link {
					pointer-events: none !important;
				}
			}

			textarea,
			[data-bge-preview]  {
				block-size: 50svh;
				inline-size: 100%;
				resize: vertical;
				overflow-y: auto;
				background: var(--bge-lightest-color);
				border: 1px solid var(--bge-border-color);
				border-radius: var(--border-radius);
			}

			[data-bge-preview] {
				&:focus-within {
					--bge-border-color: var(--bge-ui-primary-color);
					--bge-outline-color: var(--bge-ui-primary-color);
					outline: var(--bge-focus-outline-width) solid var(--bge-outline-color);
				}
			}

			[contenteditable] {
				padding: 1rem;
				block-size: 100%;
				box-sizing: border-box;
			}

			[contenteditable]:focus-visible {
				outline: none;
			}

			textarea {
				font-family: var(--bge-font-family-monospace);
			}

			[data-bge-mode="wysiwyg"] textarea {
				display: none;
			}

			[data-bge-mode="html"] [data-bge-preview] {
				display: none;
			}

			[data-bge-label] {
				margin-block-end: 0.5em;
			}

			[data-bge-toolbar] {
				display: flex;
				flex-wrap: wrap;
				gap: 0.25em;
				align-items: center;
				justify-content: space-between;
				margin-block-end: 0.5em;
			}

			[data-bge-toolbar-group] {
				display: flex;
				flex-wrap: wrap;
				gap: 0.25em;
				align-items: center;
			}

			[data-bge-toolbar-button] {
				--size: 1lh;
				--stroke-width: 1.5;
				--padding: 0.25em;
				font-size: inherit;
				border: none;
				background: none;
				cursor: pointer;
				padding: 0.25em;
				background: var(--bge-lightest-color);
				border: 1px solid var(--bge-border-color);
				border-radius: var(--border-radius);

				&:hover,
				&:focus-visible {
					--bge-border-color: var(--bge-ui-primary-color);
					--bge-outline-color: var(--bge-ui-primary-color);
					outline: var(--bge-focus-outline-width) solid var(--bge-outline-color);
				}

				&:disabled {
					color: inherit;
					outline: none;
					cursor: not-allowed;
					opacity: 0.3;
				}

				&[aria-pressed='true'] {
					--stroke-width: 2;
					color: #fff;
					background-color: var(--bge-ui-primary-color);

					&:focus-visible {
						box-shadow: 0 0 0 2px #fff inset;
					}
				}

				&:not(:has(svg)) {
					padding-inline: calc(var(--padding) * 3);
				}

				& > svg {
					inline-size: var(--size);
					block-size: var(--size);
					stroke-width: var(--stroke-width);
					stroke: currentcolor;
				}
			}`;
	}

	syncWysiwygToTextarea() {
		let html = this.#editor.getHTML();
		html = html.replaceAll('<p></p>', '');
		this.#setToTextarea(html);
	}

	#setToTextarea(html: string) {
		this.#textareaDescriptor?.set?.call(this.#textarea, html);
	}
}

/**
 *
 * @param button
 * @param editor
 */
function bindToggle(button: HTMLButtonElement, editor: Editor) {
	const buttonType = button.dataset.bgeToolbarButton;
	switch (buttonType) {
		case 'bold': {
			editor.chain().focus().toggleBold().run();
			break;
		}
		case 'italic': {
			editor.chain().focus().toggleItalic().run();
			break;
		}
		case 'underline': {
			editor.chain().focus().toggleUnderline().run();
			break;
		}
		case 'strikethrough': {
			editor.chain().focus().toggleStrike().run();
			break;
		}
		case 'code': {
			editor.chain().focus().toggleCode().run();
			break;
		}
		case 'link': {
			if (editor.isActive('link')) {
				if (confirm('Are you sure you want to remove the link?')) {
					editor.chain().focus().unsetLink().run();
				}
				break;
			}
			const link = prompt('Enter the link URL');
			if (!link) {
				break;
			}
			const classList = prompt('Enter the class name') ?? null;
			editor.chain().focus().toggleLink({ href: link, class: classList }).run();
			break;
		}
		case 'blockquote': {
			editor.chain().focus().toggleBlockquote().run();
			break;
		}
		case 'bullet-list': {
			editor.chain().focus().toggleBulletList().run();
			break;
		}
		case 'ordered-list': {
			editor.chain().focus().toggleOrderedList().run();
			break;
		}
		case 'note': {
			editor.chain().focus().toggleNote().run();
			break;
		}
		case 'h2': {
			editor.chain().focus().toggleHeading({ level: 2 }).run();
			break;
		}
		case 'h3': {
			editor.chain().focus().toggleHeading({ level: 3 }).run();
			break;
		}
		case 'h4': {
			editor.chain().focus().toggleHeading({ level: 4 }).run();
			break;
		}
		case 'h5': {
			editor.chain().focus().toggleHeading({ level: 5 }).run();
			break;
		}
		case 'h6': {
			editor.chain().focus().toggleHeading({ level: 6 }).run();
			break;
		}
	}
}

/**
 *
 * @param button
 * @param editor
 */
function bindPressed(button: HTMLButtonElement, editor: Editor) {
	const buttonType = button.dataset.bgeToolbarButton;

	switch (buttonType) {
		case 'bold': {
			button.disabled = !editor.can().chain().focus().toggleBold().run();
			button.ariaPressed = editor.isActive('bold') ? 'true' : 'false';
			break;
		}
		case 'italic': {
			button.disabled = !editor.can().chain().focus().toggleItalic().run();
			button.ariaPressed = editor.isActive('italic') ? 'true' : 'false';
			break;
		}
		case 'underline': {
			button.disabled = !editor.can().chain().focus().toggleUnderline().run();
			button.ariaPressed = editor.isActive('underline') ? 'true' : 'false';
			break;
		}
		case 'strikethrough': {
			button.disabled = !editor.can().chain().focus().toggleStrike().run();
			button.ariaPressed = editor.isActive('strike') ? 'true' : 'false';
			break;
		}
		case 'code': {
			button.disabled = !editor.can().chain().focus().toggleCode().run();
			button.ariaPressed = editor.isActive('code') ? 'true' : 'false';
			break;
		}
		case 'link': {
			button.disabled = !editor.can().chain().focus().toggleLink().run();
			button.ariaPressed = editor.isActive('link') ? 'true' : 'false';
			break;
		}
		case 'blockquote': {
			button.disabled = !editor.can().chain().focus().toggleBlockquote().run();
			button.ariaPressed = editor.isActive('blockquote') ? 'true' : 'false';
			break;
		}
		case 'bullet-list': {
			button.disabled = !editor.can().chain().focus().toggleBulletList().run();
			button.ariaPressed = editor.isActive('bulletList') ? 'true' : 'false';
			break;
		}
		case 'ordered-list': {
			button.disabled = !editor.can().chain().focus().toggleOrderedList().run();
			button.ariaPressed = editor.isActive('orderedList') ? 'true' : 'false';
			break;
		}
		case 'note': {
			button.disabled = !editor.can().chain().focus().toggleNote().run();
			button.ariaPressed = editor.isActive('note') ? 'true' : 'false';
			break;
		}
		case 'h2': {
			button.disabled = !editor.can().chain().focus().toggleHeading({ level: 2 }).run();
			button.ariaPressed = editor.isActive('heading', { level: 2 }) ? 'true' : 'false';
			break;
		}
		case 'h3': {
			button.disabled = !editor.can().chain().focus().toggleHeading({ level: 3 }).run();
			button.ariaPressed = editor.isActive('heading', { level: 3 }) ? 'true' : 'false';
			break;
		}
		case 'h4': {
			button.disabled = !editor.can().chain().focus().toggleHeading({ level: 4 }).run();
			button.ariaPressed = editor.isActive('heading', { level: 4 }) ? 'true' : 'false';
			break;
		}
		case 'h5': {
			button.disabled = !editor.can().chain().focus().toggleHeading({ level: 5 }).run();
			button.ariaPressed = editor.isActive('heading', { level: 5 }) ? 'true' : 'false';
			break;
		}
		case 'h6': {
			button.disabled = !editor.can().chain().focus().toggleHeading({ level: 6 }).run();
			button.ariaPressed = editor.isActive('heading', { level: 6 }) ? 'true' : 'false';
			break;
		}
	}
}
