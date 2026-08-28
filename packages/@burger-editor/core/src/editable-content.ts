import type { BurgerEditorEngine } from './engine/engine.js';
import type { EditableAreaHost, EditableAreaType } from './types.js';

import { sanitizeAttrs } from './dom-helpers/sanitize-attrs.js';
import { InsertionPoint } from './insertion-point.js';

/**
 * The engine-side half of an editable area: block restoration,
 * serialization and sanitization of the content container.
 *
 * Presentation (the iframe/textarea shell, visibility, visual/source
 * mode, sizing, menus) lives entirely in the UI layer behind the
 * `BurgerEditorView` port — this class only ever touches the
 * `containerElement` handed over by the host, so it cannot conflict
 * with UI-owned state.
 */
export class EditableContent<T extends EditableAreaType = 'main'> {
	readonly insertionPoint: InsertionPoint;
	readonly type: T;
	readonly #containerElement: HTMLElement;
	readonly #engine: BurgerEditorEngine;
	readonly #host: EditableAreaHost;

	get containerElement() {
		return this.#containerElement;
	}

	constructor(
		type: T,
		initialContent: string,
		engine: BurgerEditorEngine,
		host: EditableAreaHost,
	) {
		this.type = type;
		this.#engine = engine;
		this.#host = host;
		this.#containerElement = host.containerElement;
		this.setContentsAsString(initialContent);
		this.insertionPoint = new InsertionPoint(this.#engine);
	}

	/**
	 * Run the host's insertion animation, or resolve immediately when the
	 * host does not provide one (headless usage).
	 * @param markerEl - The marker element wrapping the inserted block
	 */
	async animateInsertion(markerEl: HTMLElement): Promise<void> {
		await this.#host.animateInsertion?.(markerEl);
	}

	async copyTo<T2 extends Exclude<EditableAreaType, T>>(
		editableContent: EditableContent<T2>,
	) {
		await editableContent.replaceContents(this.getContentsAsString());
	}

	getContentsAsString() {
		return this.#containerElement.innerHTML.trim();
	}

	isEmpty() {
		return this.getContentsAsString() === '';
	}

	isSame(editableContent: EditableContent<EditableAreaType>) {
		return this.getContentsAsString() === editableContent.getContentsAsString();
	}

	/**
	 * Replace the entire content from an HTML string and rebind block/item
	 * instances. Use this when the DOM is rebuilt from raw HTML (e.g. leaving
	 * source mode). Does not dispatch `bge:saved` — call `engine.save()`
	 * afterward when the change should be announced to the UI.
	 * @param html - Full HTML for the editable area container
	 * @example
	 * ```ts
	 * await content.replaceContents(editedHtml);
	 * engine.save();
	 * ```
	 */
	async replaceContents(html: string): Promise<void> {
		this.setContentsAsString(html);
		await this.#init();
	}
	save(content?: string) {
		if (content) {
			this.setContentsAsString(content);
		}

		for (const el of this.containerElement.querySelectorAll<HTMLElement>(
			'[data-bge-container]',
		)) {
			sanitizeAttrs(el);
		}
	}

	setContentsAsDOM(element: HTMLElement) {
		this.#containerElement.innerHTML = '';
		this.#containerElement.insertAdjacentElement('beforeend', element);
	}

	setContentsAsString(htmlString: string) {
		this.#containerElement.innerHTML = htmlString.trim();
	}

	async #init() {
		const contentString = this.getContentsAsString();
		if (
			contentString !== '' &&
			this.containerElement.querySelectorAll(
				'[data-bge-name], [data-bgb], .bgb-container, .bg-editor-block-container, .cb-editor-block-container',
			).length === 0
		) {
			const block = await this.#engine.createFallbackBlockFromHTML(contentString);
			this.setContentsAsDOM(block.el);
		} else {
			for (const el of this.containerElement.children) {
				if (el.matches('[data-bge-name]')) {
					continue;
				}
				await this.#engine.restoreBlockFromElement(el as HTMLElement);
			}

			for (const el of this.containerElement.querySelectorAll<HTMLElement>(
				'[data-bge-name]',
			)) {
				await this.#engine.restoreBlockFromElement(el);
			}
		}
		this.#engine.migrationCheck(this.#containerElement);
		this.save();
	}

	static async new<T extends EditableAreaType = 'main'>(
		type: T,
		initialContent: string,
		engine: BurgerEditorEngine,
		host: EditableAreaHost,
	) {
		const editableContent = new EditableContent(type, initialContent, engine, host);
		await editableContent.#init();
		return editableContent;
	}
}
