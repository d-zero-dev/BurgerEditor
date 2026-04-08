import type { BgeMode, BgeWysiwygElementOptions, Transaction } from './types.js';
import type { ElementSeed } from '../utils/types.js';
import type { Extensions } from '@tiptap/core';

import { normalizeHtmlStructure } from '@burger-editor/utils';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { BgeWysiwygEditorKit } from '../tiptap-extentions/index.js';
import { createElement } from '../utils/create-element.js';
import { getCurrentEditorState } from '../utils/get-current-editor-state.js';

import { controlUIStyles, editorContentStyles } from './styles.js';
import { TextOnlyModeController } from './text-only-mode.js';

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
	#textOnlyMode: TextOnlyModeController | null = null;

	get value() {
		if (!this.#textarea) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		// text-onlyモードの場合
		if (this.mode === 'text-only') {
			return this.#textOnlyMode?.getValue(this.#textarea.value) ?? this.#textarea.value;
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
			this.#textOnlyMode?.setValue(
				value,
				this.shadowRoot!,
				this.#structureChangeMessage,
				this.#previewStyle?.textContent ?? null,
			);
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
			this.#textOnlyMode?.deactivate();
		}

		// HTMLモードからWysiwygモードに切り替える場合、構造変更をチェック
		if (mode === 'wysiwyg' && this.mode === 'html' && this.#checkStructureChange()) {
			this.#setStructureChange(true);
			return;
		}

		// text-onlyモードに切り替える場合
		if (mode === 'text-only') {
			const currentHTML =
				this.mode === 'wysiwyg'
					? this.#editor.getHTML().replaceAll('<p></p>', '')
					: this.#textarea.value;
			this.#textOnlyMode?.activate(
				this.shadowRoot!,
				currentHTML,
				this.#structureChangeMessage,
				this.#previewStyle?.textContent ?? null,
			);
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
		controlUIStyle.textContent = controlUIStyles;

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

		// Initialize text-only mode controller
		this.#textOnlyMode = new TextOnlyModeController((html) => {
			this.#setToTextarea(html);
		});

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

		this.#previewStyle.textContent = editorContentStyles(css);
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

	#checkStructureChange(): boolean {
		if (!this.#editor || !this.#textarea || this.mode !== 'html') {
			return false;
		}

		const expectedHTML = this.expectHTML(this.#textarea.value);
		const isStructureSame = normalizeHtmlStructure(this.#textarea.value, expectedHTML);

		return !isStructureSame;
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

	#setToTextarea(html: string) {
		if (!this.#textarea || !this.#textareaDescriptor) {
			throw new ReferenceError('<bge-wysiwyg> is not connected');
		}

		this.#textareaDescriptor.set?.call(this.#textarea, html);
	}

	#transaction(_editor: Editor) {
		const data: Transaction = {
			state: getCurrentEditorState(this),
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
