import type { BurgerEditorEngine } from './engine/engine.js';
import type {
	BlockMenuCreator,
	EditableAreaShell,
	EditableAreaShellCreator,
	InitialInsertionButtonCreator,
} from './types.js';

import { CSS_LAYER } from './const.js';
import { appendStylesheetTo } from './dom-helpers/append-stylesheet-to.js';
import { createStylesheet } from './dom-helpers/create-stylesheet.js';
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
	readonly blockMenu: {
		readonly el: HTMLElement;
		hide(): void;
	};
	readonly insertionPoint: InsertionPoint;
	readonly type: 'main' | 'draft';
	readonly #containerElement: HTMLElement;
	readonly #engine: BurgerEditorEngine;
	readonly #frameElement: HTMLIFrameElement;
	readonly #insertionButton: {
		readonly el: HTMLElement;
		show(): void;
		hide(): void;
	};
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
		createBlockMenu: BlockMenuCreator,
		createInitialInsertionButton: InitialInsertionButtonCreator | undefined,
		stylesheets: readonly {
			readonly path: string;
			readonly id: string;
		}[] = [],
		classList: readonly string[] = [],
		createShell?: EditableAreaShellCreator,
	) {
		const shell = createShell
			? createShell({ type, initialContent, stylesheets, classList })
			: createDefaultEditableAreaShell(initialContent, classList);

		super(`${type}-editable-area`, shell.viewNode);

		this.type = type;

		this.#engine = engine;
		this.#engine.viewArea.append(shell.viewNode);

		this.#sourceTextarea = shell.sourceTextarea;
		this.#frameElement = shell.frameElement;
		this.#containerElement = shell.containerElement;

		if (!this.#frameElement.contentWindow) {
			throw new Error('Impossible error: The contentWindow of created iframe is null.');
		}

		const frameDoc = this.#frameElement.contentWindow.document;
		frameDoc.open();
		frameDoc.close();

		for (const { path, id } of stylesheets) {
			appendStylesheetTo(frameDoc, path, id);
		}

		frameDoc.body.setAttribute('style', 'margin: 0; border: 0;');

		const blockMenuEl = frameDoc.createElement('div');
		blockMenuEl.dataset.bgeComponent = 'block-menu';
		const blockMenuStylesheetUrl = createStylesheet(
			`[data-bge-component='block-menu'] {
				position: absolute;
				z-index: 2147483647;
				pointer-events: none;
			}`,
			CSS_LAYER.ui,
		);
		appendStylesheetTo(frameDoc, blockMenuStylesheetUrl, `block-menu-${CSS_LAYER.ui}`);
		const { hide: blockMenuHide } = createBlockMenu(blockMenuEl, engine);
		this.blockMenu = {
			el: blockMenuEl,
			hide: () => {
				blockMenuEl.hidden = true;
				blockMenuHide();
			},
		};

		this.insertionPoint = new InsertionPoint(this.#engine);

		const onInsert = () => {
			if (this.#engine.isProcessed) {
				return;
			}
			this.#insertionButton.hide();
			this.insertionPoint.set(null, false);
			this.#engine.blockCatalogDialog.open();
		};

		if (createInitialInsertionButton) {
			const buttonEl = frameDoc.createElement('div');
			buttonEl.dataset.bgeComponent = 'initial-insertion';
			createInitialInsertionButton(buttonEl, onInsert);
			this.#insertionButton = {
				el: buttonEl,
				show: () => {
					buttonEl.hidden = false;
				},
				hide: () => {
					buttonEl.hidden = true;
				},
			};
		} else {
			this.#insertionButton = new InitialInsertionButton(
				this.insertionPoint,
				this.#engine,
				() => this.#engine.blockCatalogDialog.open(),
			);
		}

		const els = frameDoc.createDocumentFragment();
		els.append(this.blockMenu.el);
		els.append(this.#insertionButton.el);
		els.append(this.#containerElement);
		frameDoc.body.append(els);

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
		frameDoc.addEventListener('load', this.#setHeightTrigger.bind(this), true);
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
			const block = await this.#engine.restoreBlockFromElement(this.containerElement);
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
		createBlockMenu: BlockMenuCreator,
		createInitialInsertionButton?: InitialInsertionButtonCreator,
		stylesheets?: readonly {
			readonly path: string;
			readonly id: string;
		}[],
		classList?: readonly string[],
		createShell?: EditableAreaShellCreator,
	) {
		const editableArea = new EditableArea(
			type,
			initialContent,
			engine,
			createBlockMenu,
			createInitialInsertionButton,
			stylesheets,
			classList,
			createShell,
		);
		await editableArea.#init();
		return editableArea;
	}
}

/**
 *
 * @param initialContent
 * @param classList
 */
function createDefaultEditableAreaShell(
	initialContent: string,
	classList: readonly string[],
): EditableAreaShell {
	const viewNode = document.createElement('div');

	const sourceTextarea = document.createElement('textarea');
	sourceTextarea.spellcheck = false;
	viewNode.append(sourceTextarea);

	const frameElement = document.createElement('iframe');
	frameElement.setAttribute('width', '100%;');
	frameElement.setAttribute('scrolling', 'no');
	viewNode.append(frameElement);

	const containerElement = document.createElement('div');
	containerElement.id = CONTENT_ID;
	containerElement.style.setProperty('padding', `${CONTAINER_PADDING}px`, 'important');
	containerElement.style.setProperty('overflow', 'hidden', 'important');
	containerElement.style.setProperty('margin', '0', 'important');
	containerElement.style.setProperty('box-sizing', 'border-box', 'important');
	containerElement.classList.add(...classList);
	containerElement.innerHTML = initialContent;
	containerElement.dataset.bgeComponent = 'editable-area';

	return {
		viewNode,
		frameElement,
		sourceTextarea,
		containerElement,
	};
}
