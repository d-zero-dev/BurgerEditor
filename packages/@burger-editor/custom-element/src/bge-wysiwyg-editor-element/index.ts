import type { BgeWysiwygElement } from '../bge-wysiwyg-element/index.js';
import type { EditorState } from '../bge-wysiwyg-element/types.js';
import type { ElementSeed } from '../utils/types.js';
import type { Extensions } from '@tiptap/core';

import IconAlignBoxCenterStretch from '@tabler/icons/outline/align-box-center-stretch.svg?raw';
import IconAlignCenter from '@tabler/icons/outline/align-center.svg?raw';
import IconAlignLeft from '@tabler/icons/outline/align-left.svg?raw';
import IconAlignRight from '@tabler/icons/outline/align-right.svg?raw';
import IconBlockquote from '@tabler/icons/outline/blockquote.svg?raw';
import IconBold from '@tabler/icons/outline/bold.svg?raw';
import IconCloud from '@tabler/icons/outline/cloud.svg?raw';
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
import IconSubscript from '@tabler/icons/outline/subscript.svg?raw';
import IconSuperscript from '@tabler/icons/outline/superscript.svg?raw';
import IconUnderline from '@tabler/icons/outline/underline.svg?raw';

import { defineBgeWysiwygElement } from '../bge-wysiwyg-element/index.js';

export interface BgeWysiwygEditorElementOptions {
	extensions?: Extensions;
	wrapperElement?: ElementSeed;
}

/**
 *
 * @param options
 * @param global
 */
export function defineBgeWysiwygEditorElement(
	options?: BgeWysiwygEditorElementOptions,
	global: Window = window,
) {
	defineBgeWysiwygElement(options, global);

	if (options?.wrapperElement) {
		BgeWysiwygEditorElement.wrapperElement = options.wrapperElement;
	}

	const tagName = `bge-wysiwyg-editor`;
	if (!global.customElements.get(tagName)) {
		global.customElements.define(tagName, BgeWysiwygEditorElement);
	}
}

export class BgeWysiwygEditorElement extends HTMLElement {
	#wysiwygElement: BgeWysiwygElement | null = null;

	get editor() {
		if (!this.#wysiwygElement) {
			throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
		}
		return this.#wysiwygElement.editor;
	}

	get name() {
		return this.getAttribute('name') ?? '';
	}

	get value() {
		if (!this.#wysiwygElement) {
			throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
		}
		return this.#wysiwygElement.value;
	}

	constructor() {
		super();

		const initialValue = this.innerHTML.trim();
		const label = this.getAttribute('label') ?? '内容';
		const itemName = this.getAttribute('item-name');

		const commands: ReadonlyArray<string> =
			// Get commands from attribute
			this.getAttribute('commands')
				?.split(',')
				.map((command) => command.trim().toLowerCase()) ??
			// Default commands
			BgeWysiwygEditorElement.defaultCommands;

		this.innerHTML = `
			<fieldset>
				<legend>${label}</legend>
				<div data-bge-toolbar>
					<div data-bge-toolbar-group>
						${commands.includes('bold') ? `<button type="button" data-bge-toolbar-button="bold">${IconBold}</button>` : ''}
						${commands.includes('italic') ? `<button type="button" data-bge-toolbar-button="italic">${IconItalic}</button>` : ''}
						${commands.includes('strikethrough') ? `<button type="button" data-bge-toolbar-button="strikethrough">${IconStrikethrough}</button>` : ''}
						${commands.includes('underline') ? `<button type="button" data-bge-toolbar-button="underline">${IconUnderline}</button>` : ''}
						${commands.includes('subscript') ? `<button type="button" data-bge-toolbar-button="subscript">${IconSubscript}</button>` : ''}
						${commands.includes('superscript') ? `<button type="button" data-bge-toolbar-button="superscript">${IconSuperscript}</button>` : ''}
						${commands.includes('code') ? `<button type="button" data-bge-toolbar-button="code">${IconCode}</button>` : ''}
						${commands.includes('link') ? `<button type="button" data-bge-toolbar-button="link">${IconLink}</button>` : ''}
						${commands.includes('button-like-link') ? `<button type="button" data-bge-toolbar-button="button-like-link">${IconCloud}</button>` : ''}
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
						${commands.includes('flex-box') ? `<button type="button" data-bge-toolbar-button="flex-box"><span data-bge-rotate>${IconAlignBoxCenterStretch}</span></button>` : ''}
						${commands.includes('align-start') ? `<button type="button" data-bge-toolbar-button="align-start">${IconAlignLeft}</button>` : ''}
						${commands.includes('align-center') ? `<button type="button" data-bge-toolbar-button="align-center">${IconAlignCenter}</button>` : ''}
						${commands.includes('align-end') ? `<button type="button" data-bge-toolbar-button="align-end">${IconAlignRight}</button>` : ''}
					</div>
					<div data-bge-toolbar-group>
						<button type="button" data-bge-toolbar-button="html-mode">HTML Mode</button>
					</div>
				</div>
				<bge-wysiwyg ${itemName ? `item-name="${itemName}"` : ''}>
					${initialValue}
				</bge-wysiwyg>
			</fieldset>
		`;

		const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(
			Element.prototype,
			'innerHTML',
		)!;
		Object.defineProperty(this, 'innerHTML', {
			configurable: true,
			enumerable: true,
			get() {
				return innerHTMLDescriptor.get!.call(this);
			},
			set: (value: string) => {
				if (!this.#wysiwygElement) {
					throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
				}
				this.#wysiwygElement.value = value;
			},
		});
	}

	connectedCallback() {
		this.#wysiwygElement = this.querySelector<BgeWysiwygElement>('bge-wysiwyg')!;

		if (!this.#wysiwygElement) {
			throw new Error('bge-wysiwyg-editor is not connected');
		}

		const buttons = this.querySelectorAll<HTMLButtonElement>('[data-bge-toolbar-button]');

		for (const button of buttons) {
			button.addEventListener('click', () => {
				if (!this.#wysiwygElement) {
					throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
				}
				bindToggle(button, this.#wysiwygElement);
			});
		}

		this.#wysiwygElement.addEventListener('transaction', (event) => {
			for (const button of buttons) {
				updateButtonState(button, event.detail.state);
			}
		});

		const htmlModeButton = this.querySelector<HTMLButtonElement>(
			'[data-bge-toolbar-button="html-mode"]',
		)!;

		// 構造変更イベントをリッスンしてボタンのdisabled状態を更新
		this.#wysiwygElement.addEventListener('bge:structure-change', (event) => {
			const hasStructureChange = (event as CustomEvent<{ hasStructureChange: boolean }>)
				.detail.hasStructureChange;
			const isHtmlMode = this.#wysiwygElement?.mode === 'html';

			// HTMLモードかつ構造変更がある場合のみdisabled
			htmlModeButton.disabled = isHtmlMode && hasStructureChange;
		});

		// 初期状態を設定
		const initialHasStructureChange = this.#wysiwygElement.hasStructureChange;
		const initialIsHtmlMode = this.#wysiwygElement.mode === 'html';
		htmlModeButton.disabled = initialIsHtmlMode && initialHasStructureChange;

		htmlModeButton.addEventListener('click', () => {
			if (!this.#wysiwygElement) {
				throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
			}

			const currentMode = this.#wysiwygElement.mode;
			const newMode = currentMode === 'html' ? 'wysiwyg' : 'html';

			// ボタンの状態を更新
			htmlModeButton.ariaPressed = newMode === 'html' ? 'true' : 'false';

			// モードを設定（切り替えが防止された場合、mode setter内でreturnされる）
			this.#wysiwygElement.mode = newMode;

			// 実際にモードが変更されたか確認
			if (this.#wysiwygElement.mode === newMode) {
				// モードが変更された場合、disabled状態を更新
				const hasStructureChange = this.#wysiwygElement.hasStructureChange;
				htmlModeButton.disabled = newMode === 'html' && hasStructureChange;
			} else {
				// 切り替えが防止された場合、ボタンの状態を元に戻す
				htmlModeButton.ariaPressed = currentMode === 'html' ? 'true' : 'false';
			}
		});
	}

	setStyle(css: string) {
		if (!this.#wysiwygElement) {
			throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
		}
		this.#wysiwygElement.setStyle(css);
	}

	syncWysiwygToTextarea() {
		if (!this.#wysiwygElement) {
			throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
		}
		this.#wysiwygElement.syncWysiwygToTextarea();
	}

	static extensions: Extensions | null = null;

	static wrapperElement: ElementSeed | null = null;

	static defaultCommands = [
		'bold',
		'italic',
		'underline',
		'strikethrough',
		'subscript',
		'superscript',
		'link',
		'button-like-link',
		'blockquote',
		'bullet-list',
		'ordered-list',
		'note',
		'h3',
		'h4',
		'h5',
		'h6',
		'flex-box',
		'align-start',
		'align-center',
		'align-end',
	] as const;
}

/**
 *
 * @param button
 * @param wysiwygElement
 */
function bindToggle(button: HTMLButtonElement, wysiwygElement: BgeWysiwygElement) {
	const buttonType = button.dataset.bgeToolbarButton;
	switch (buttonType) {
		case 'bold': {
			wysiwygElement.toggleBold();
			break;
		}
		case 'italic': {
			wysiwygElement.toggleItalic();
			break;
		}
		case 'underline': {
			wysiwygElement.toggleUnderline();
			break;
		}
		case 'strikethrough': {
			wysiwygElement.toggleStrike();
			break;
		}
		case 'code': {
			wysiwygElement.toggleCode();
			break;
		}
		case 'link': {
			if (wysiwygElement.isActive('link')) {
				if (confirm('Are you sure you want to remove the link?')) {
					wysiwygElement.toggleLink();
				}
				break;
			}
			const link = prompt('Enter the link URL');
			if (!link) {
				break;
			}
			wysiwygElement.toggleLink({ href: link });
			break;
		}
		case 'button-like-link': {
			if (wysiwygElement.isActive('buttonLikeLink')) {
				if (confirm('Are you sure you want to remove the button-like-link?')) {
					wysiwygElement.toggleButtonLikeLink();
				}
				break;
			}
			const link = prompt('Enter the link URL');
			if (!link) {
				break;
			}
			wysiwygElement.toggleButtonLikeLink({ href: link });
			break;
		}
		case 'blockquote': {
			wysiwygElement.toggleBlockquote();
			break;
		}
		case 'bullet-list': {
			wysiwygElement.toggleBulletList();
			break;
		}
		case 'ordered-list': {
			wysiwygElement.toggleOrderedList();
			break;
		}
		case 'note': {
			wysiwygElement.toggleNote();
			break;
		}
		case 'h2': {
			wysiwygElement.toggleHeading(2);
			break;
		}
		case 'h3': {
			wysiwygElement.toggleHeading(3);
			break;
		}
		case 'h4': {
			wysiwygElement.toggleHeading(4);
			break;
		}
		case 'h5': {
			wysiwygElement.toggleHeading(5);
			break;
		}
		case 'h6': {
			wysiwygElement.toggleHeading(6);
			break;
		}
		case 'flex-box': {
			wysiwygElement.toggleFlexBox();
			break;
		}
		case 'subscript': {
			wysiwygElement.toggleSubscript();
			break;
		}
		case 'superscript': {
			wysiwygElement.toggleSuperscript();
			break;
		}
		case 'align-start': {
			wysiwygElement.toggleAlign('start');
			break;
		}
		case 'align-center': {
			wysiwygElement.toggleAlign('center');
			break;
		}
		case 'align-end': {
			wysiwygElement.toggleAlign('end');
			break;
		}
	}
}

/**
 *
 * @param button
 * @param state
 */
function updateButtonState(button: HTMLButtonElement, state: EditorState) {
	const buttonType = button.dataset.bgeToolbarButton;

	switch (buttonType) {
		case 'bold': {
			button.disabled = state.bold.disabled;
			button.ariaPressed = state.bold.active ? 'true' : 'false';
			break;
		}
		case 'italic': {
			button.disabled = state.italic.disabled;
			button.ariaPressed = state.italic.active ? 'true' : 'false';
			break;
		}
		case 'underline': {
			button.disabled = state.underline.disabled;
			button.ariaPressed = state.underline.active ? 'true' : 'false';
			break;
		}
		case 'strikethrough': {
			button.disabled = state.strike.disabled;
			button.ariaPressed = state.strike.active ? 'true' : 'false';
			break;
		}
		case 'code': {
			button.disabled = state.code.disabled;
			button.ariaPressed = state.code.active ? 'true' : 'false';
			break;
		}
		case 'link': {
			button.disabled = state.link.disabled;
			button.ariaPressed = state.link.active ? 'true' : 'false';
			break;
		}
		case 'button-like-link': {
			button.disabled = state.buttonLikeLink.disabled;
			button.ariaPressed = state.buttonLikeLink.active ? 'true' : 'false';
			break;
		}
		case 'blockquote': {
			button.disabled = state.blockquote.disabled;
			button.ariaPressed = state.blockquote.active ? 'true' : 'false';
			break;
		}
		case 'bullet-list': {
			button.disabled = state.bulletList.disabled;
			button.ariaPressed = state.bulletList.active ? 'true' : 'false';
			break;
		}
		case 'ordered-list': {
			button.disabled = state.orderedList.disabled;
			button.ariaPressed = state.orderedList.active ? 'true' : 'false';
			break;
		}
		case 'note': {
			button.disabled = state.note.disabled;
			button.ariaPressed = state.note.active ? 'true' : 'false';
			break;
		}
		case 'h2': {
			button.disabled = state.h2.disabled;
			button.ariaPressed = state.h2.active ? 'true' : 'false';
			break;
		}
		case 'h3': {
			button.disabled = state.h3.disabled;
			button.ariaPressed = state.h3.active ? 'true' : 'false';
			break;
		}
		case 'h4': {
			button.disabled = state.h4.disabled;
			button.ariaPressed = state.h4.active ? 'true' : 'false';
			break;
		}
		case 'h5': {
			button.disabled = state.h5.disabled;
			button.ariaPressed = state.h5.active ? 'true' : 'false';
			break;
		}
		case 'h6': {
			button.disabled = state.h6.disabled;
			button.ariaPressed = state.h6.active ? 'true' : 'false';
			break;
		}
		case 'flex-box': {
			button.disabled = state.flexBox.disabled;
			button.ariaPressed = state.flexBox.active ? 'true' : 'false';
			break;
		}
		case 'subscript': {
			button.disabled = state.subscript.disabled;
			button.ariaPressed = state.subscript.active ? 'true' : 'false';
			break;
		}
		case 'superscript': {
			button.disabled = state.superscript.disabled;
			button.ariaPressed = state.superscript.active ? 'true' : 'false';
			break;
		}
		case 'align-start': {
			button.disabled = state.alignStart.disabled;
			button.ariaPressed = state.alignStart.active ? 'true' : 'false';
			break;
		}
		case 'align-center': {
			button.disabled = state.alignCenter.disabled;
			button.ariaPressed = state.alignCenter.active ? 'true' : 'false';
			break;
		}
		case 'align-end': {
			button.disabled = state.alignEnd.disabled;
			button.ariaPressed = state.alignEnd.active ? 'true' : 'false';
			break;
		}
	}
}
