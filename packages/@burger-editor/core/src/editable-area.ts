import type { BurgerEditorEngine } from './engine/engine.js';
import type { UICreator } from './types.js';

import { BurgerBlock } from './block/block.js';
import { BlockMenu } from './block-menu.js';
import { appendStylesheetTo } from './dom-helpers/append-stylesheet-to.js';
import { sanitizeAttrs } from './dom-helpers/sanitize-attrs.js';
import { EditorUI } from './editor-ui.js';
import { InitialInsertionButton } from './initial-insertion-button.js';
import { InsertionPoint } from './insertion-point.js';

const CONTAINER_PADDING = 10;
const CONTENT_ID = 'bge-editable-area';

type EditableAreaType = 'main' | 'draft';

export interface EditableAreaOptions<T extends EditableAreaType> {
	readonly type: T;
	readonly initialContent: string;
	readonly stylesheets?: readonly string[];
	readonly classList?: readonly string[];
}

export class EditableArea<T extends EditableAreaType = 'main'> extends EditorUI {
	readonly blockMenu: BlockMenu;
	readonly insertionPoint: InsertionPoint;
	readonly type: 'main' | 'draft';
	readonly #containerElement: HTMLElement;
	readonly #engine: BurgerEditorEngine;
	readonly #frameElement: HTMLIFrameElement;
	readonly #insertionButton: InitialInsertionButton;
	#isVisualMode = true;
	readonly #sourceTextarea: HTMLTextAreaElement;

	get containerElement() {
		return this.#containerElement;
	}

	get isVisualMode() {
		return this.#isVisualMode;
	}

	constructor(
		type: T,
		initialContent: string,
		engine: BurgerEditorEngine,
		createBlockMenu: UICreator,
		stylesheets: readonly string[] = [],
		classList: readonly string[] = [],
	) {
		const viewNode = document.createElement('div');
		super(`${type}-editable-area`, viewNode);

		this.type = type;

		this.#engine = engine;
		this.#engine.viewArea.append(viewNode);

		this.#sourceTextarea = document.createElement('textarea');
		this.#sourceTextarea.spellcheck = false;
		viewNode.append(this.#sourceTextarea);

		this.#frameElement = document.createElement('iframe');
		this.#frameElement.setAttribute('width', '100%;');
		this.#frameElement.setAttribute('scrolling', 'no');
		viewNode.append(this.#frameElement);

		if (!this.#frameElement.contentWindow) {
			throw new Error('Impossible error: The contentWindow of created iframe is null.');
		}

		this.#frameElement.contentWindow.document.open();
		this.#frameElement.contentWindow.document.close();

		for (const cssPath of stylesheets) {
			appendStylesheetTo(this.#frameElement.contentWindow.document, cssPath);
		}

		this.#frameElement.contentWindow.document.body.setAttribute(
			'style',
			'margin: 0; border: 0;',
		);

		this.#containerElement =
			this.#frameElement.contentWindow.document.createElement('div');
		this.#containerElement.id = CONTENT_ID;
		this.#containerElement.style.setProperty(
			'padding',
			`${CONTAINER_PADDING}px`,
			'important',
		);
		this.#containerElement.style.setProperty('overflow', 'hidden', 'important');
		this.#containerElement.style.setProperty('margin', '0', 'important');
		this.#containerElement.style.setProperty('box-sizing', 'border-box', 'important');
		this.#containerElement.classList.add(...classList);
		this.#containerElement.innerHTML = initialContent;
		this.#containerElement.dataset.bgeComponent = 'editable-area';

		this.blockMenu = new BlockMenu(
			this.#engine,
			this.#frameElement.contentWindow.document.createElement('div'),
			(el: HTMLElement) => createBlockMenu(el, engine),
		);

		this.insertionPoint = new InsertionPoint(this.#engine);

		this.#insertionButton = new InitialInsertionButton(
			this.insertionPoint,
			this.#engine,
			() => this.#engine.blockCatalogDialog.open(),
		);

		const els = this.#frameElement.contentWindow.document.createDocumentFragment();
		els.append(this.blockMenu.el);
		els.append(this.#insertionButton.el);
		els.append(this.#containerElement);
		this.#frameElement.contentWindow.document.body.append(els);

		window.addEventListener('resize', this.#setHeightTrigger.bind(this), true);
		// eslint-disable-next-line no-restricted-syntax
		window.addEventListener('DOMContentLoaded', this.#setHeightTrigger.bind(this), false);
		window.document.addEventListener('load', this.#setHeightTrigger.bind(this), true);
		this.#frameElement.contentWindow.addEventListener(
			'resize',
			this.#setHeightTrigger.bind(this),
			true,
		);
		// eslint-disable-next-line no-restricted-syntax
		this.#frameElement.contentWindow.addEventListener(
			'DOMContentLoaded',
			this.#setHeightTrigger.bind(this),
			false,
		);
		this.#frameElement.contentWindow.document.addEventListener(
			'load',
			this.#setHeightTrigger.bind(this),
			true,
		);
		this.#sourceTextarea.addEventListener('blur', this.#saveSource.bind(this), false);
	}

	async copyTo<T2 extends Exclude<EditableAreaType, T>>(editableArea: EditableArea<T2>) {
		editableArea.setContentsAsString(this.getContentsAsString());
		await editableArea.#init();
	}

	getContentsAsString() {
		return this.#containerElement.innerHTML.trim();
	}

	isEmpty() {
		return this.getContentsAsString() === '';
	}

	isSame(editableArea: EditableArea) {
		return this.getContentsAsString() === editableArea.getContentsAsString();
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

		this.update();

		const value = this.getContentsAsString();
		this.#sourceTextarea.value = value;
	}

	setContentsAsDOM(element: HTMLElement) {
		this.#containerElement.innerHTML = '';
		this.#containerElement.insertAdjacentElement('beforeend', element);
	}

	setContentsAsString(htmlString: string) {
		this.#containerElement.innerHTML = htmlString.trim();
	}

	toggleDisplayMode() {
		this.#saveSource();
		this.#switchMode(!this.#isVisualMode);
	}

	update() {
		this.#setHeightTrigger();
		this.#showInsertionButton();
	}

	async #init() {
		if (
			!this.isEmpty() &&
			this.containerElement.querySelectorAll(
				'[data-bge-name], [data-bgb], .bgb-container, .bg-editor-block-container, .cb-editor-block-container',
			).length === 0
		) {
			const block = await BurgerBlock.createUnknownBlock(
				this.getContentsAsString(),
				this.#engine,
			);
			this.setContentsAsDOM(block.el);
		} else {
			for (const el of this.containerElement.children) {
				if (el.matches('[data-bge-name]')) {
					continue;
				}
				await BurgerBlock.createUnknownBlock(el.outerHTML, this.#engine);
				el.remove();
			}

			for (const el of this.containerElement.querySelectorAll<HTMLElement>(
				'[data-bge-name]',
			)) {
				await BurgerBlock.new(this.#engine, el);
			}
		}
		this.#engine.migrationCheck(this.#containerElement);
		this.save();
		this.#switchMode(true);
	}

	#saveSource(): void {
		if (!this.#isVisualMode) {
			this.setContentsAsString(this.#sourceTextarea.value);
			this.save();
		}
	}

	#setHeight(): void {
		const height =
			this.#containerElement.getBoundingClientRect().height + CONTAINER_PADDING * 2;
		this.#frameElement.setAttribute('height', `${height}`);
	}

	#setHeightTrigger(): void {
		requestAnimationFrame(() => this.#setHeight());
	}

	#showInsertionButton() {
		if (this.isEmpty()) {
			this.#insertionButton.show();
		} else {
			this.#insertionButton.hide();
		}
	}

	#switchMode(visualMode: boolean): void {
		this.#isVisualMode = visualMode;
		this.el.dataset.bgeComponentMode = this.#isVisualMode ? 'visual' : 'source';
		this.#frameElement.hidden = !visualMode;
		this.#sourceTextarea.hidden = !!visualMode;
		this.#sourceTextarea.disabled = !!visualMode;
	}

	static async new<T extends EditableAreaType = 'main'>(
		type: T,
		initialContent: string,
		engine: BurgerEditorEngine,
		createBlockMenu: UICreator,
		stylesheets?: readonly string[],
		classList?: readonly string[],
	) {
		const editableArea = new EditableArea(
			type,
			initialContent,
			engine,
			createBlockMenu,
			stylesheets,
			classList,
		);
		await editableArea.#init();
		return editableArea;
	}
}
