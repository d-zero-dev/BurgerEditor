/**
 * Controller for the text-only editing mode.
 * Manages contenteditable elements within a container,
 * syncing their content back to a textarea.
 */
export class TextOnlyModeController {
	#container: HTMLDivElement | null = null;
	readonly #setToTextarea: (html: string) => void;

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
	#syncToTextarea = (): void => {
		if (!this.#container) {
			return;
		}
		const cleanHTML = this.cleanHTML();
		this.#setToTextarea(cleanHTML);
	};

	/**
	 * The text-only editing container element, or null if not yet activated.
	 */
	get container() {
		return this.#container;
	}

	/**
	 * @param setToTextarea - Callback to sync cleaned HTML back to the textarea
	 */
	constructor(setToTextarea: (html: string) => void) {
		this.#setToTextarea = setToTextarea;
	}

	/**
	 * text-onlyモードを有効化
	 * @param shadowRoot
	 * @param currentHTML
	 * @param structureChangeMessage
	 * @param previewStyleContent
	 */
	activate(
		shadowRoot: ShadowRoot,
		currentHTML: string,
		structureChangeMessage: HTMLDivElement | null,
		previewStyleContent: string | null,
	): void {
		if (!this.#container) {
			this.#container = document.createElement('div');
			this.#container.dataset.textOnlyEditor = '';
			const modeContainer = shadowRoot.querySelector('[data-bge-mode]')!;
			modeContainer.insertBefore(this.#container, structureChangeMessage);
		}

		const textOnlyStyle = document.createElement('style');
		textOnlyStyle.dataset.textOnlyStyle = '';
		if (previewStyleContent) {
			textOnlyStyle.textContent = previewStyleContent;
		}

		this.#container.innerHTML = currentHTML;
		this.#container.prepend(textOnlyStyle);

		this.#identifyEditableElements(this.#container);
		this.#attachEventListeners();

		shadowRoot.querySelector<HTMLDivElement>(`[data-bge-mode]`)!.dataset.bgeMode =
			'text-only';
	}

	/**
	 * contenteditable属性を削除してクリーンなHTMLを返す
	 */
	cleanHTML(): string {
		if (!this.#container) {
			return '';
		}

		const clone = this.#container.cloneNode(true) as HTMLDivElement;

		const editableElements = clone.querySelectorAll('[contenteditable="plaintext-only"]');
		for (const el of editableElements) {
			el.removeAttribute('contenteditable');
		}

		const styleElements = clone.querySelectorAll('[data-text-only-style]');
		for (const el of styleElements) {
			el.remove();
		}

		return clone.innerHTML;
	}

	/**
	 * text-onlyモードを無効化
	 */
	deactivate(): void {
		if (!this.#container) {
			return;
		}

		const editableElements = this.#container.querySelectorAll<HTMLElement>(
			'[contenteditable="plaintext-only"]',
		);

		for (const el of editableElements) {
			el.removeEventListener('keydown', this.#preventEnterKey);
			el.removeEventListener('input', this.#syncToTextarea);
		}

		this.#container.innerHTML = '';
	}

	/**
	 * text-onlyモードの値を取得
	 * @param textareaValue
	 */
	getValue(textareaValue: string): string {
		if (!this.#container) {
			return textareaValue;
		}
		return this.cleanHTML();
	}

	/**
	 * text-onlyモードに値を設定
	 * @param value
	 * @param shadowRoot
	 * @param structureChangeMessage
	 * @param previewStyleContent
	 */
	setValue(
		value: string,
		shadowRoot: ShadowRoot,
		structureChangeMessage: HTMLDivElement | null,
		previewStyleContent: string | null,
	): void {
		this.deactivate();
		this.#setToTextarea(value);
		this.activate(shadowRoot, value, structureChangeMessage, previewStyleContent);
	}

	#attachEventListeners(): void {
		if (!this.#container) {
			return;
		}

		const editableElements = this.#container.querySelectorAll<HTMLElement>(
			'[contenteditable="plaintext-only"]',
		);

		for (const el of editableElements) {
			el.addEventListener('keydown', this.#preventEnterKey);
			el.addEventListener('input', this.#syncToTextarea);
		}
	}

	#identifyEditableElements(container: HTMLElement): void {
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
			acceptNode: (node) => {
				const element = node as HTMLElement;
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

		for (const el of editableElements) {
			el.setAttribute('contenteditable', 'plaintext-only');
		}
	}
}
