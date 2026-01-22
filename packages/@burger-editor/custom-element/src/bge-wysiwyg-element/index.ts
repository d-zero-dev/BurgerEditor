import type { BgeMode, BgeWysiwygElementOptions, Transaction } from './types.js';
import type { ElementSeed } from '../utils/types.js';
import type { Extensions } from '@tiptap/core';

import { normalizeHtmlStructure } from '@burger-editor/utils';
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

	if (options?.experimental?.textOnlyMode !== undefined) {
		BgeWysiwygElement.experimentalTextOnlyMode = options.experimental.textOnlyMode;
	}

	const tagName = `bge-wysiwyg`;
	if (!global.customElements.get(tagName)) {
		global.customElements.define(tagName, BgeWysiwygElement);
	}
}

export class BgeWysiwygElement extends HTMLElement {
	#editor: Editor | null = null;
	#editorRoot: HTMLDivElement | null = null;
	#hasStructureChange = false;
	#isExpectingHTML = false;
	#isInitializing = true;
	#previewStyle: HTMLStyleElement | null = null;
	#structureChangeMessage: HTMLDivElement | null = null;
	#textarea: HTMLTextAreaElement | null = null;
	#textareaDescriptor: PropertyDescriptor | null = null;
	#textOnlyContainer: HTMLDivElement | null = null;

	/**
	 * Enter キーを防止するハンドラー
	 * @param event
	 */
	#preventEnterKey = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
		}
	};
	/**
	 * text-onlyコンテナからtextareaへ同期
	 */
	#syncTextOnlyToTextarea = (): void => {
		if (this.mode !== 'text-only' || !this.#textOnlyContainer) {
			return;
		}

		// contenteditable属性を削除したクリーンなHTMLを生成
		const cleanHTML = this.#cleanTextOnlyHTML('');

		// textareaに同期
		this.#setToTextarea(cleanHTML);
	};
	get value() {
		if (!this.#textarea) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		// text-onlyモードの場合
		if (this.mode === 'text-only') {
			return this.#getTextOnlyValue();
		}

		// Wysiwygモードの場合、Tiptapエディタから値を取得
		if (this.mode === 'wysiwyg') {
			if (!this.#editor) {
				throw new ReferenceError('<bge-wysiwyg> is not connected');
			}
			let html = this.#editor.getHTML();
			html = html.replaceAll('<p></p>', '');
			return html;
		}

		// HTMLモードの場合、textareaから値を取得
		return this.#textarea.value;
	}

	set value(value: string) {
		if (!this.#textarea) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		// text-onlyモードの場合
		if (this.mode === 'text-only') {
			this.#setTextOnlyValue(value);
			return;
		}

		// HTMLモードの場合は常にネイティブsetterを使用
		if (this.mode === 'html') {
			this.#textareaDescriptor?.set?.call(this.#textarea, value);
			return;
		}

		// 初期化中、または初回の値設定時（現在の値が空）で、エディタが存在する場合、構造変更をチェック
		const isFirstValueSet = !this.#textarea.value || this.#textarea.value.trim() === '';
		const shouldCheckStructure =
			(this.#isInitializing || isFirstValueSet) && this.#editor && value;

		if (shouldCheckStructure) {
			// 渡されたvalueパラメータを使って構造チェック
			const expectedHTML = this.expectHTML(value);
			const isStructureSame = normalizeHtmlStructure(value, expectedHTML);

			if (!isStructureSame) {
				// 構造変更がある場合、HTMLモードに切り替え
				// ネイティブのsetterを使用してTiptapを経由せずに値を設定
				this.#textareaDescriptor?.set?.call(this.#textarea, value);
				this.shadowRoot!.querySelector<HTMLDivElement>(`[data-bge-mode]`)?.setAttribute(
					'data-bge-mode',
					'html',
				);
				this.#setStructureChange(true);
				return;
			}
		}

		// カスタムsetterを呼び出し、Tiptapを経由して値を設定
		this.#textarea.value = value;
	}

	get mode(): BgeMode {
		const modeAttr =
			this.shadowRoot?.querySelector<HTMLDivElement>(`[data-bge-mode]`)?.dataset.bgeMode;
		if (modeAttr === 'html') return 'html';
		if (modeAttr === 'text-only') return 'text-only';
		return 'wysiwyg';
	}

	set mode(mode: BgeMode) {
		if (!this.#editor || !this.#textarea) {
			return;
		}

		// text-onlyモードからの切り替え
		if (this.mode === 'text-only') {
			this.#deactivateTextOnlyMode();
		}

		// HTMLモードからWysiwygモードに切り替える場合、構造変更をチェック
		if (mode === 'wysiwyg' && this.mode === 'html' && this.#checkStructureChange()) {
			this.#setStructureChange(true);
			return;
		}

		// text-onlyモードに切り替える場合
		if (mode === 'text-only') {
			this.#activateTextOnlyMode();
			return;
		}

		this.shadowRoot!.querySelector<HTMLDivElement>(`[data-bge-mode]`)?.setAttribute(
			'data-bge-mode',
			mode,
		);
		if (mode === 'wysiwyg') {
			this.#editor.commands.setContent(this.#textarea.value);
			this.#setStructureChange(false);
		} else if (!this.#isInitializing) {
			this.#setStructureChange(this.#checkStructureChange());
		}
		this.#updateStructureChangeMessage();
	}

	get editor() {
		if (!this.#editor) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		return this.#editor;
	}

	get hasStructureChange(): boolean {
		return this.#hasStructureChange;
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

		const initialValue = this.innerHTML;
		const label = this.getAttribute('label') ?? '内容';
		const itemName = this.getAttribute('item-name');
		const messageId = `bge-structure-change-message-${Math.random().toString(36).slice(2, 11)}`;

		const structureChangeMessage = BgeWysiwygElement.experimentalTextOnlyMode
			? 'HTMLの構造がデザインモードに対応していません。HTMLモードまたはテキスト編集モードで編集してください。'
			: 'HTMLの構造がWYSIWYG（デザイン）モードに対応していません。HTMLモードで編集してください。';

		this.shadowRoot.innerHTML = `<div data-bge-mode="wysiwyg"><iframe></iframe><textarea aria-label="${label} HTML" aria-describedby="${messageId}"></textarea><div id="${messageId}" role="alert" aria-live="polite" style="display: none;">${structureChangeMessage}</div></div>`;

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

			[data-text-only-editor] {
				block-size: 50svh;
				inline-size: 100%;
				resize: vertical;
				overflow-y: auto;
				background: var(--bge-lightest-color);
				border: 1px solid var(--bge-border-color);
				border-radius: var(--border-radius);
				padding: 1rem;
				box-sizing: border-box;
			}

			[data-bge-mode="wysiwyg"] [data-text-only-editor],
			[data-bge-mode="html"] [data-text-only-editor] {
				display: none;
			}

			[data-bge-mode="text-only"] iframe,
			[data-bge-mode="text-only"] textarea {
				display: none;
			}

			[contenteditable="plaintext-only"] {
				outline: 1px dashed var(--bge-border-color);
				cursor: text;
			}

			[contenteditable="plaintext-only"]:hover {
				outline-color: var(--bge-ui-primary-color);
			}

			[contenteditable="plaintext-only"]:focus {
				outline: 2px solid var(--bge-ui-primary-color);
				outline-offset: 2px;
			}

			[role="alert"] {
				margin-block-start: 0.5rem;
				padding: 0.5rem;
				background-color: var(--bge-error-color, #fee);
				border: 1px solid var(--bge-error-border-color, #fcc);
				border-radius: var(--border-radius);
				color: var(--bge-error-text-color, #c00);
				font-size: 0.875rem;
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
		this.#structureChangeMessage = this.shadowRoot.querySelector<HTMLDivElement>(
			`#${messageId}`,
		);

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
			const expectedHTML = this.expectHTML(initialValue);
			const isStructureSame = normalizeHtmlStructure(initialValue, expectedHTML);

			if (isStructureSame) {
				this.#textarea.value = initialValue;
			} else {
				// 構造変更がある場合、HTMLモードに切り替え
				this.#textareaDescriptor.set?.call(this.#textarea, initialValue);
				this.shadowRoot
					.querySelector<HTMLDivElement>(`[data-bge-mode]`)
					?.setAttribute('data-bge-mode', 'html');
				this.#setStructureChange(true);
			}
		}

		// 初期化完了
		this.#isInitializing = false;

		// HTMLモードでフォーカスアウト時に構造変更をチェック
		this.#textarea.addEventListener('blur', () => {
			if (this.mode !== 'html') {
				return;
			}

			this.#setStructureChange(this.#checkStructureChange());
		});

		// HTMLモードで入力時に構造変更をチェック（解消された場合に状態を更新）
		this.#textarea.addEventListener('input', () => {
			if (this.mode !== 'html') {
				return;
			}

			this.#setStructureChange(this.#checkStructureChange());
		});
	}

	/**
	 * tiptapのwysiwygが出力するであろうHTMLをレンダリングせずに文字列で返す
	 * @param html 変換対象のHTML文字列
	 * @returns 変換後のHTML文字列
	 */
	expectHTML(html: string): string {
		// このチェックは到達不可能（すべての呼び出し元でthis.#editorの存在が保証されている）
		// ただし、型安全性のために残している
		if (!this.#editor) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		const originalContent = this.#editor.getHTML();
		this.#isExpectingHTML = true;
		this.#editor.commands.setContent(html);
		const result = this.#editor.getHTML().replaceAll('<p></p>', '');
		this.#editor.commands.setContent(originalContent);
		this.#isExpectingHTML = false;
		return result;
	}
	isActive(name: string) {
		return this.editor.isActive(name) ?? false;
	}

	setImage(options: { src: string; alt?: string; title?: string }) {
		this.editor.chain().focus().setImage(options).run();
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
			[contenteditable="true"] {
				padding: 1rem;
				block-size: 100%;
				box-sizing: border-box;
			}

			[contenteditable="true"]:focus-visible {
				outline: none;
			}

			${css}

			a:any-link {
				pointer-events: none !important;
			}
		`;
	}

	syncWysiwygToTextarea() {
		// expectHTML実行中は同期しない
		if (this.#isExpectingHTML) {
			return;
		}

		// HTMLモードの場合は同期しない（textareaの値が正しい値）
		if (this.mode === 'html') {
			return;
		}

		let html = this.editor.getHTML();
		html = html.replaceAll('<p></p>', '');
		this.#setToTextarea(html);
	}

	toggleAlign(alignment: 'start' | 'center' | 'end') {
		this.editor.chain().focus().toggleAlign(alignment).run();
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

	toggleSubscript() {
		this.editor.chain().focus().toggleSubscript().run();
	}

	toggleSuperscript() {
		this.editor.chain().focus().toggleSuperscript().run();
	}

	toggleUnderline() {
		this.editor.chain().focus().toggleUnderline().run();
	}

	/**
	 * text-onlyモードを有効化
	 */
	#activateTextOnlyMode(): void {
		// 1. 現在のHTMLを保存
		const currentHTML =
			this.mode === 'wysiwyg'
				? this.#editor!.getHTML().replaceAll('<p></p>', '')
				: this.#textarea!.value;

		// 2. text-onlyコンテナを作成（未作成の場合）
		if (!this.#textOnlyContainer) {
			this.#textOnlyContainer = document.createElement('div');
			this.#textOnlyContainer.dataset.textOnlyEditor = '';
			this.shadowRoot!.querySelector('[data-bge-mode]')!.append(this.#textOnlyContainer);
		}

		// 3. スタイルタグを作成してwysiwygと同じCSSを適用
		const textOnlyStyle = document.createElement('style');
		textOnlyStyle.dataset.textOnlyStyle = '';
		if (this.#previewStyle) {
			textOnlyStyle.textContent = this.#previewStyle.textContent;
		}

		// 4. text-onlyコンテナに直接HTMLを設定
		this.#textOnlyContainer.innerHTML = currentHTML;

		// 5. スタイルタグを先頭に追加
		this.#textOnlyContainer.prepend(textOnlyStyle);

		// 6. 編集可能要素を特定してcontenteditable付与
		this.#identifyEditableElements(this.#textOnlyContainer);

		// 7. イベントリスナーを設定
		this.#attachTextOnlyEventListeners();

		// 8. data-bge-mode属性を更新
		this.shadowRoot!.querySelector<HTMLDivElement>(`[data-bge-mode]`)!.dataset.bgeMode =
			'text-only';
	}
	/**
	 * text-onlyモード用のイベントリスナーを設定
	 */
	#attachTextOnlyEventListeners(): void {
		if (!this.#textOnlyContainer) {
			return;
		}

		const editableElements = this.#textOnlyContainer.querySelectorAll<HTMLElement>(
			'[contenteditable="plaintext-only"]',
		);

		for (const el of editableElements) {
			// Enterキー防止
			el.addEventListener('keydown', this.#preventEnterKey);

			// textareaへの同期
			el.addEventListener('input', this.#syncTextOnlyToTextarea);
		}
	}
	#checkStructureChange(): boolean {
		if (!this.#editor || !this.#textarea || this.mode !== 'html') {
			return false;
		}

		const expectedHTML = this.expectHTML(this.#textarea.value);
		const isStructureSame = normalizeHtmlStructure(this.#textarea.value, expectedHTML);

		return !isStructureSame;
	}

	/**
	 * contenteditable属性を削除してクリーンなHTMLを返す
	 * @param html
	 */
	#cleanTextOnlyHTML(html: string): string {
		if (!this.#textOnlyContainer) {
			return html;
		}

		// text-onlyコンテナのクローンを作成
		const clone = this.#textOnlyContainer.cloneNode(true) as HTMLDivElement;

		// contenteditable属性を削除
		const editableElements = clone.querySelectorAll('[contenteditable="plaintext-only"]');
		for (const el of editableElements) {
			el.removeAttribute('contenteditable');
		}

		// data-text-only-style要素を削除
		const styleElements = clone.querySelectorAll('[data-text-only-style]');
		for (const el of styleElements) {
			el.remove();
		}

		return clone.innerHTML;
	}
	/**
	 * text-onlyモードを無効化
	 */
	#deactivateTextOnlyMode(): void {
		if (!this.#textOnlyContainer) {
			return;
		}

		// イベントリスナーを削除
		const editableElements = this.#textOnlyContainer.querySelectorAll<HTMLElement>(
			'[contenteditable="plaintext-only"]',
		);

		for (const el of editableElements) {
			el.removeEventListener('keydown', this.#preventEnterKey);
			el.removeEventListener('input', this.#syncTextOnlyToTextarea);
		}

		// コンテナをクリア
		this.#textOnlyContainer.innerHTML = '';
	}
	/**
	 * text-onlyモードの値を取得
	 */
	#getTextOnlyValue(): string {
		if (!this.#textOnlyContainer) {
			return this.#textarea?.value ?? '';
		}

		return this.#cleanTextOnlyHTML('');
	}
	/**
	 * 編集可能要素を特定してcontenteditable="plaintext-only"を付与
	 * @param container
	 */
	#identifyEditableElements(container: HTMLElement): void {
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
			acceptNode: (node) => {
				const element = node as HTMLElement;

				// 直接の子にtextNodeがあるかチェック
				const hasDirectTextChild = [...element.childNodes].some(
					(child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
				);

				if (hasDirectTextChild) {
					return NodeFilter.FILTER_ACCEPT;
				}
				return NodeFilter.FILTER_SKIP;
			},
		});

		const editableElements: HTMLElement[] = [];
		let currentNode: Node | null;
		while ((currentNode = walker.nextNode())) {
			editableElements.push(currentNode as HTMLElement);
		}

		// contenteditable="plaintext-only"属性を付与
		for (const el of editableElements) {
			el.setAttribute('contenteditable', 'plaintext-only');
		}
	}

	#setStructureChange(hasChange: boolean): void {
		if (this.#hasStructureChange === hasChange) {
			return;
		}

		this.#hasStructureChange = hasChange;
		this.#updateStructureChangeMessage();
		this.dispatchEvent(
			new CustomEvent('bge:structure-change', {
				detail: { hasStructureChange: hasChange },
				bubbles: true,
				composed: true,
			}),
		);
	}
	/**
	 * text-onlyモードに値を設定
	 * @param value
	 */
	#setTextOnlyValue(value: string): void {
		// text-onlyモードを一旦非アクティブ化
		this.#deactivateTextOnlyMode();

		// textareaに値を設定
		this.#setToTextarea(value);

		// text-onlyモードを再アクティブ化
		this.#activateTextOnlyMode();
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
				subscript: {
					disabled: !editor.can().chain().focus().toggleSubscript().run(),
					active: editor.isActive('subscript'),
				},
				superscript: {
					disabled: !editor.can().chain().focus().toggleSuperscript().run(),
					active: editor.isActive('superscript'),
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
				image: {
					disabled: !editor.can().chain().focus().setImage({ src: '' }).run(),
					active: editor.isActive('image'),
				},
				alignStart: {
					disabled: !editor.can().chain().focus().toggleAlign('start').run(),
					active: editor.isActive('paragraph', { 'data-bgc-align': 'start' }),
				},
				alignCenter: {
					disabled: !editor.can().chain().focus().toggleAlign('center').run(),
					active: editor.isActive('paragraph', { 'data-bgc-align': 'center' }),
				},
				alignEnd: {
					disabled: !editor.can().chain().focus().toggleAlign('end').run(),
					active: editor.isActive('paragraph', { 'data-bgc-align': 'end' }),
				},
			},
		};

		return data;
	}
	#updateStructureChangeMessage(): void {
		if (!this.#structureChangeMessage) {
			return;
		}

		if (this.mode === 'html' && this.#hasStructureChange) {
			this.#structureChangeMessage.style.display = 'block';
		} else {
			this.#structureChangeMessage.style.display = 'none';
		}
	}

	static extensions: Extensions | null = null;

	static wrapperElement: ElementSeed | null = null;

	static experimentalTextOnlyMode: boolean = false;
}
