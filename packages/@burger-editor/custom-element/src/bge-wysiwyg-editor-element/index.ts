import type { BgeWysiwygElement } from '../bge-wysiwyg-element/index.js';
import type { BgeMode, EditorState } from '../bge-wysiwyg-element/types.js';
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
import { getCurrentEditorState } from '../utils/get-current-editor-state.js';

/**
 * ツールバーボタン型（kebab-case）をEditorStateキー（camelCase）にマッピング
 * ボタン名とstateキーが異なる8箇所を処理
 */
const BUTTON_TO_STATE_KEY_MAP: Record<string, keyof EditorState> = {
	bold: 'bold',
	italic: 'italic',
	underline: 'underline',
	strikethrough: 'strike',
	code: 'code',
	link: 'link',
	'button-like-link': 'buttonLikeLink',
	blockquote: 'blockquote',
	'bullet-list': 'bulletList',
	'ordered-list': 'orderedList',
	note: 'note',
	h1: 'h1',
	h2: 'h2',
	h3: 'h3',
	h4: 'h4',
	h5: 'h5',
	h6: 'h6',
	'flex-box': 'flexBox',
	subscript: 'subscript',
	superscript: 'superscript',
	'align-start': 'alignStart',
	'align-center': 'alignCenter',
	'align-end': 'alignEnd',
	image: 'image',
} as const;

export interface BgeWysiwygEditorElementOptions {
	extensions?: Extensions;
	wrapperElement?: ElementSeed;
	experimental?: {
		textOnlyMode?: boolean;
	};
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

	if (options?.experimental?.textOnlyMode !== undefined) {
		BgeWysiwygEditorElement.experimentalTextOnlyMode = options.experimental.textOnlyMode;
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

	/**
	 * 現在のエディタモードを取得
	 * @returns 'wysiwyg' | 'html' | 'text-only'
	 */
	get mode(): BgeMode {
		if (!this.#wysiwygElement) {
			throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
		}
		return this.#wysiwygElement.mode;
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
						${
							BgeWysiwygEditorElement.experimentalTextOnlyMode
								? `<select data-bge-mode-selector>
								<option value="wysiwyg">デザインモード</option>
								<option value="text-only">テキスト編集モード</option>
								<option value="html">HTMLモード</option>
							</select>`
								: `<button type="button" data-bge-toolbar-button="html-mode">HTML Mode</button>`
						}
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
				updateButtonState(button, event.detail.state, this);
			}
		});

		// structure-changeイベント（HTMLモード切り替え時）にもボタン状態を更新
		this.#wysiwygElement.addEventListener('bge:structure-change', () => {
			const currentState = getCurrentEditorState(this.#wysiwygElement!);
			for (const button of buttons) {
				updateButtonState(button, currentState, this);
			}
		});

		// マークアップボタンの初期状態を設定
		const initialState = getCurrentEditorState(this.#wysiwygElement);
		for (const button of buttons) {
			updateButtonState(button, initialState, this);
		}

		// experimental.textOnlyMode による UI 分岐
		if (BgeWysiwygEditorElement.experimentalTextOnlyMode) {
			// experimental.textOnlyMode = true: Select要素で3モード切り替え
			const modeSelector = this.querySelector<HTMLSelectElement>(
				'[data-bge-mode-selector]',
			);
			if (!modeSelector) {
				throw new Error('Mode selector not found');
			}

			// 初期状態のselect値を設定
			modeSelector.value = this.#wysiwygElement.mode;

			// デザインモードオプションの参照を取得
			const wysiwygOption = modeSelector.querySelector<HTMLOptionElement>(
				'option[value="wysiwyg"]',
			);

			// 構造変更イベントでデザインモードオプションをdisable/enable
			const handleStructureChange = (event: Event) => {
				const hasStructureChange = (event as CustomEvent<{ hasStructureChange: boolean }>)
					.detail.hasStructureChange;
				if (wysiwygOption) {
					wysiwygOption.disabled = hasStructureChange;
				}
				// モードが変更された可能性があるので、セレクトボックスの値も同期
				modeSelector.value = this.#wysiwygElement!.mode;
			};
			this.#wysiwygElement.addEventListener(
				'bge:structure-change',
				handleStructureChange,
			);

			// 初期状態のデザインモードオプションを設定（イベントリスナー登録後）
			if (wysiwygOption) {
				wysiwygOption.disabled = this.#wysiwygElement.hasStructureChange;
			}

			// Selectのchangeイベントハンドラー
			modeSelector.addEventListener('change', () => {
				if (!this.#wysiwygElement) {
					throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
				}

				const newMode = modeSelector.value as BgeMode;
				const currentMode = this.#wysiwygElement.mode;

				// モードを設定
				this.#wysiwygElement.mode = newMode;

				// 実際にモードが変更されたか確認
				if (this.#wysiwygElement.mode === newMode) {
					// モード変更成功時、全ボタンを即座に更新
					const currentState = getCurrentEditorState(this.#wysiwygElement);
					for (const button of buttons) {
						updateButtonState(button, currentState, this);
					}
				} else {
					// 切り替えが防止された場合、selectの値を元に戻す
					modeSelector.value = currentMode;
				}
			});
		} else {
			// experimental.textOnlyMode = false: HTMLモードボタンのみ（text-only実装前の動作）
			const htmlModeButton = this.querySelector<HTMLButtonElement>(
				'[data-bge-toolbar-button="html-mode"]',
			);
			if (!htmlModeButton) {
				throw new Error('HTML mode button not found');
			}

			// HTMLモードボタンのクリックハンドラー（text-only実装前の動作）
			htmlModeButton.addEventListener('click', () => {
				if (!this.#wysiwygElement) {
					throw new ReferenceError('<bge-wysiwyg-editor> is not connected');
				}

				const currentMode = this.#wysiwygElement.mode;
				const newMode = currentMode === 'html' ? 'wysiwyg' : 'html';

				htmlModeButton.ariaPressed = newMode === 'html' ? 'true' : 'false';
				this.#wysiwygElement.mode = newMode;

				if (this.#wysiwygElement.mode === newMode) {
					// モード変更成功時、全ボタンを即座に更新
					const currentState = getCurrentEditorState(this.#wysiwygElement);
					for (const button of buttons) {
						updateButtonState(button, currentState, this);
					}

					const hasStructureChange = this.#wysiwygElement.hasStructureChange;
					htmlModeButton.disabled = newMode === 'html' && hasStructureChange;
				} else {
					htmlModeButton.ariaPressed = currentMode === 'html' ? 'true' : 'false';
				}
			});

			// 構造変更イベントでボタンのdisabled状態を更新
			this.#wysiwygElement.addEventListener('bge:structure-change', (event) => {
				const hasStructureChange = (event as CustomEvent<{ hasStructureChange: boolean }>)
					.detail.hasStructureChange;
				const isHtmlMode = this.#wysiwygElement!.mode === 'html';
				htmlModeButton.disabled = isHtmlMode && hasStructureChange;
			});

			// 初期状態を設定（イベントリスナー登録後）
			const isHtmlMode = this.#wysiwygElement.mode === 'html';
			htmlModeButton.ariaPressed = isHtmlMode ? 'true' : 'false';
			htmlModeButton.disabled = isHtmlMode && this.#wysiwygElement.hasStructureChange;
		}
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

	static experimentalTextOnlyMode: boolean = false;

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
 * 現在のエディタ状態をオンデマンドで取得
 * モード切り替え直後のボタン更新に使用
 * @param wysiwygElement
 */
/**
 * エディタ状態に基づいて単一ボタンのdisabledとaria-pressed状態を更新
 * @param button - 更新するボタン要素
 * @param state - 全ボタンの状態を含む現在のエディタ状態
 * @param editorElement - モード確認用のエディタ要素
 */
function updateButtonState(
	button: HTMLButtonElement,
	state: EditorState,
	editorElement: BgeWysiwygEditorElement,
) {
	const buttonType = button.dataset.bgeToolbarButton;

	if (!buttonType) {
		return;
	}

	// モード切り替えボタンはスキップ - 独自の状態管理
	if (buttonType === 'html-mode' || buttonType === 'text-only-mode') {
		return;
	}

	// このボタン型に対応するstateキーを取得
	const stateKey = BUTTON_TO_STATE_KEY_MAP[buttonType];

	if (!stateKey) {
		// 未知のボタン型 - 開発時に警告だがクラッシュはしない
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.warn(`Unknown button type: ${buttonType}`);
		}
		return;
	}

	// 非WYSIWYGモードかチェック
	const currentMode = editorElement.mode;
	const isNonWysiwygMode = currentMode === 'html' || currentMode === 'text-only';

	// エディタ状態からボタン状態を更新
	const buttonState = state[stateKey];
	button.disabled = isNonWysiwygMode || buttonState.disabled;
	button.ariaPressed = buttonState.active ? 'true' : 'false';
}
