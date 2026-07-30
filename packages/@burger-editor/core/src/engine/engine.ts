import type { ContainerType } from '../block/types.js';
import type { ItemSeed } from '../item/types.js';
import type {
	BurgerEditorEngineOptions,
	BurgerEditorView,
	BlockCatalog,
	Config,
	EditableAreaType,
	FileAPI,
	BlockItem,
	BlockData,
} from '../types.js';
import type { ConfirmCallback } from './copy-editable-area.js';

import { BurgerBlock } from '../block/block.js';
import { CommandBus } from '../command/command-bus.js';
import { ComponentObserver } from '../component-observer.js';
import { CSS_LAYER } from '../const.js';
import { createComponentStylesheet } from '../dom-helpers/create-component-stylesheet.js';
import { createStylesheetFromUrl } from '../dom-helpers/create-stylesheet-from-url.js';
import { createStylesheet } from '../dom-helpers/create-stylesheet.js';
import {
	getCustomProperties,
	getCustomProperty,
	getRepeatMinInlineSizeVariants,
} from '../dom-helpers/get-custom-properties.js';
import { getElement } from '../dom-helpers/get-element.js';
import { EditableContent } from '../editable-content.js';
import { createBgeEvent } from '../event/create-bge-event.js';
import { HealthMonitor } from '../health-monitor.js';
import { Item } from '../item/item.js';

import { copyEditableArea } from './copy-editable-area.js';
import { createDefaultView } from './default-view.js';
import { UIStateStore } from './ui-state.js';

export class BurgerEditorEngine {
	readonly catalog: BlockCatalog;
	readonly commandBus = new CommandBus();
	readonly componentObserver = new ComponentObserver();
	readonly config: Config;
	readonly css: {
		readonly stylesheets: readonly {
			readonly path: string;
			readonly layer?: string;
		}[];
		readonly classList: readonly string[];
		readonly generalCSS: string;
	};
	readonly el: HTMLElement;
	readonly items: Map<string, ItemSeed>;
	readonly serverAPI: FileAPI;
	readonly storageKey: {
		readonly blockClipboard: string;
	};
	readonly uiState = new UIStateStore();
	readonly viewArea: HTMLElement;
	#contentStylesheetCache: string | null = null;
	#current!: EditableContent<EditableAreaType>;
	#currentBlock: BurgerBlock | null = null;
	#draft!: EditableContent<'draft'> | null;
	readonly #healthMonitor: HealthMonitor;
	#main!: EditableContent<'main'>;
	#migrationCheck: ((dom: HTMLElement) => void) | null = null;
	#view!: BurgerEditorView;

	get isProcessed() {
		return this.uiState.getSnapshot().processing;
	}

	set isProcessed(isProcessed: boolean) {
		this.uiState.setProcessing(isProcessed);
	}

	get content() {
		return this.#current;
	}

	// eslint-disable-next-line no-restricted-syntax
	private constructor(options: BurgerEditorEngineOptions) {
		this.el = getElement(options.root);
		this.config = options.config;
		this.serverAPI = options.fileIO ?? {};
		this.catalog = options.catalog;
		this.storageKey = {
			blockClipboard: 'bge-copied-block',
			...options.storageKey,
		};

		// Health monitor setup
		this.#healthMonitor = new HealthMonitor({
			...options.healthCheck,
			onOffline: (timestamp) => {
				const event = createBgeEvent('bge:server-offline', { timestamp });
				this.el.dispatchEvent(event);
			},
			onOnline: (timestamp) => {
				const event = createBgeEvent('bge:server-online', { timestamp });
				this.el.dispatchEvent(event);
			},
		});

		this.css = {
			stylesheets: options.config.stylesheets ?? [],
			classList: options.config.classList ?? [],
			generalCSS: options.generalCSS,
		};

		if (
			this.config.googleMapsApiKey &&
			!document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]')
		) {
			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${this.config.googleMapsApiKey}&libraries=marker`;
			document.head.append(script);
		}

		this.items = new Map();
		if (options.items) {
			for (const [name, seed] of Object.entries(options.items)) {
				this.items.set(name, seed);
			}
		}

		const viewArea = document.createElement('div');
		viewArea.classList.add(...(options.viewAreaClassList ?? []));
		this.viewArea = viewArea;
		this.el.append(viewArea);

		this.commandBus.createReceiver(this.el);

		this.el.addEventListener('bge:saved', (e) => {
			const { main, draft } = e.detail;
			void options.onUpdated?.(main, draft);
		});

		this.componentObserver.on('select-block', ({ block }) => {
			this.setCurrentBlock(block);
		});
	}

	async addBlock(data: BlockData) {
		const block = await BurgerBlock.create(data, this.#createItemElement.bind(this));
		const message = block.isDisable();
		if (message) {
			alert(message);
			return;
		}
		await this.content.insertionPoint.insert(block);
		this.save();
	}

	/**
	 * Clean up resources and stop monitoring
	 */
	cleanUp() {
		this.#healthMonitor.stop();
		this.commandBus.destroy();
		this.#view.destroy();
	}

	clearCurrentBlock() {
		this.#currentBlock = null;
	}

	async draftToMain(confirm?: ConfirmCallback) {
		if (!this.#draft) {
			return false;
		}

		if (await copyEditableArea(this.#draft, this.#main, confirm)) {
			this.showMain();
			return true;
		}
		return false;
	}

	/**
	 * Resolve the CSS applied to the content (generalCSS plus non-layered
	 * stylesheets), for injection into rich-text editors.
	 * @returns The concatenated stylesheet text
	 */
	async getContentStylesheet(): Promise<string> {
		if (this.#contentStylesheetCache) {
			return this.#contentStylesheetCache;
		}
		const css = await Promise.all(
			this.css.stylesheets
				.filter((sheet) => sheet.layer == null)
				.map(async (sheet) => {
					const res = await fetch(sheet.path);
					return res.text();
				}),
		);
		// generalCSSを含める
		const stylesheets = [this.css.generalCSS, ...css];
		this.#contentStylesheetCache = stylesheets.join('\n');
		return this.#contentStylesheetCache;
	}
	getCurrentBlock() {
		if (!this.#currentBlock) {
			// eslint-disable-next-line no-console
			console.warn('block is unselected.');
		}
		return this.#currentBlock;
	}

	getCustomProperties(containerType?: ContainerType) {
		return getCustomProperties(
			this.#current.containerElement.ownerDocument,
			containerType,
		);
	}
	getCustomProperty(property: string | RegExp) {
		return getCustomProperty(this.#current.containerElement.ownerDocument, property);
	}
	/**
	 * Look up an editable content by area type.
	 * @param type - The editable area type
	 * @returns The editable content, or `null` when the page has no draft
	 * @example
	 * ```ts
	 * const html = engine.getEditableContent('draft')?.getContentsAsString();
	 * ```
	 */
	getEditableContent(type: EditableAreaType): EditableContent<EditableAreaType> | null {
		return type === 'main' ? this.#main : this.#draft;
	}

	getRepeatMinInlineSizeVariants() {
		return getRepeatMinInlineSizeVariants(this.#current.containerElement.ownerDocument);
	}

	hasDraft() {
		return !!this.#draft;
	}

	isSetBlock() {
		return !!this.#currentBlock;
	}

	async mainToDraft(confirm?: ConfirmCallback) {
		if (!this.#draft) {
			return false;
		}

		if (await copyEditableArea(this.#main, this.#draft, confirm)) {
			this.showDraft();
			return true;
		}
		return false;
	}

	migrationCheck(dom: HTMLElement) {
		this.#migrationCheck?.(dom);
	}

	registerMigrationCheck(callback: (dom: HTMLElement) => void) {
		this.#migrationCheck = callback;
		this.migrationCheck(this.#current.containerElement);
	}

	/**
	 * HTML要素からブロックを復元する
	 * HTML要素から完全にBlockDefinitionを解析してブロック作成
	 * @param element HTML要素
	 * @returns 復元されたBurgerBlock
	 */
	restoreBlockFromElement(element: HTMLElement) {
		return BurgerBlock.rebind(element, this.#createItemElement.bind(this));
	}

	save() {
		this.#main.save();
		if (this.#draft) {
			this.#draft.save();
		}
		this.el.dispatchEvent(
			createBgeEvent('bge:saved', {
				main: this.#main.getContentsAsString(),
				draft: this.#draft?.getContentsAsString(),
			}),
		);
	}

	setCurrentBlock(block: BurgerBlock) {
		let isChanged = true;
		if (this.#currentBlock) {
			isChanged = !this.#currentBlock.is(block);
		}
		this.#currentBlock = block;
		if (isChanged) {
			this.el.dispatchEvent(
				createBgeEvent('bge:block-change', {
					block,
				}),
			);
		}
		return isChanged;
	}

	/**
	 * Set editor read-only state
	 * @param readOnly
	 */
	setReadOnly(readOnly: boolean) {
		if (readOnly) {
			this.el.inert = true;
			this.el.dataset.readonly = 'true';
			return;
		}

		this.el.inert = false;
		delete this.el.dataset.readonly;
	}

	showDraft() {
		if (!this.#draft) {
			return;
		}
		this.#show(this.#draft);
	}

	showMain() {
		this.#show(this.#main);
	}

	async #createItemElement(itemData: BlockItem | HTMLElement) {
		if (typeof itemData !== 'string' && 'localName' in itemData) {
			const item = Item.rebind(itemData, this.items, this.config);
			return item.el;
		}

		const name = typeof itemData === 'string' ? itemData : itemData.name;
		const item = await Item.create(
			name,
			this.items,
			this.config,
			typeof itemData === 'string' ? undefined : itemData.data,
		);
		return item.el;
	}

	/**
	 * Setup health event listeners for automatic read-only mode
	 */
	#setupHealthEventListeners() {
		this.el.addEventListener('bge:server-offline', () => {
			this.setReadOnly(true);
		});

		this.el.addEventListener('bge:server-online', () => {
			this.setReadOnly(false);
		});
	}

	#show(to: EditableContent<EditableAreaType>) {
		if (this.#current === to) {
			return;
		}
		this.#current = to;
		this.migrationCheck(to.containerElement);
		// 各エリアの表示・非表示はUI層がこのイベントを購読して宣言的に
		// 描画する。エンジンはUI要素の属性を書き換えない
		this.el.dispatchEvent(
			createBgeEvent('bge:switch-content', {
				content: this.#current.type,
			}),
		);
	}

	static readonly BLOCK_ID_PREFIX = 'bge-';
	static readonly STORAGE_KEY_OF_COPIED_BLOCK = 'bge-copied-block';

	static async new(options: BurgerEditorEngineOptions) {
		const engine = new BurgerEditorEngine(options);

		const layers = createStylesheet(
			`@layer ${CSS_LAYER.base}, ${CSS_LAYER.components}, ${CSS_LAYER.ui};`,
		);

		const baseStylesheet = createComponentStylesheet(
			options.items,
			options.generalCSS,
			CSS_LAYER.base,
		);

		const componentStylesheets = await Promise.all(
			options.config.stylesheets.map(async (stylesheet) => {
				return createStylesheetFromUrl(
					stylesheet.path,
					stylesheet.layer ?? CSS_LAYER.components,
				);
			}),
		);

		const stylesheets = [
			{
				path: layers,
				id: 'layers',
			},
			{
				path: baseStylesheet,
				id: 'base-stylesheet',
			},
			...componentStylesheets.map(({ blob, originalUrl }) => ({
				path: blob,
				id: originalUrl,
			})),
		];

		const mainInitialContent =
			typeof options.initialContents === 'string'
				? options.initialContents
				: options.initialContents.main;

		engine.#view = options.view ?? createDefaultView();

		const mainHost = await engine.#view.createAreaHost({
			type: 'main',
			engine,
			initialContent: mainInitialContent,
			stylesheets,
			classList: options.config.classList,
		});
		engine.#main = await EditableContent.new(
			'main',
			mainInitialContent,
			engine,
			mainHost,
		);

		const draftInitialContent =
			typeof options.initialContents === 'string' ? null : options.initialContents.draft;

		if (draftInitialContent == null) {
			engine.#draft = null;
		} else {
			const draftHost = await engine.#view.createAreaHost({
				type: 'draft',
				engine,
				initialContent: draftInitialContent,
				stylesheets,
				classList: options.config.classList,
			});
			engine.#draft = await EditableContent.new(
				'draft',
				draftInitialContent,
				engine,
				draftHost,
			);
		}

		engine.#current = engine.#main;
		engine.showMain();
		engine.save();

		if (options.defineCustomElement) {
			await options.defineCustomElement({
				className: options.config.classList.join(' '),
				experimental: options.config.experimental,
			});
		}

		// Start health monitoring
		engine.#healthMonitor.start();
		engine.#setupHealthEventListeners();

		return engine;
	}
}
