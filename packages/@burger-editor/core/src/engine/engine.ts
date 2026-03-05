import type { ContainerType } from '../block/types.js';
import type { DialogSettings } from '../editor-dialog.js';
import type { ItemSeed } from '../item/types.js';
import type {
	BurgerEditorEngineOptions,
	UIOptions,
	Config,
	FileAPI,
	BlockItem,
	BlockData,
} from '../types.js';

import { BurgerBlock } from '../block/block.js';
import { BlockCatalogDialog } from '../block-catalog-dialog.js';
import { BlockOptionsDialog } from '../block-options-dialog.js';
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
import { EditableArea } from '../editable-area.js';
import { createBgeEvent } from '../event/create-bge-event.js';
import { HealthMonitor } from '../health-monitor.js';
import { getItemEditorTemplate } from '../item/get-item-editor-template.js';
import { Item } from '../item/item.js';
import { ItemEditorDialog } from '../item-editor-dialog.js';

type ConfirmCallback = () => Promise<boolean> | boolean;

export class BurgerEditorEngine {
	readonly blockCatalogDialog: BlockCatalogDialog;
	readonly blockOptionsDialog: BlockOptionsDialog;
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
	readonly itemEditorDialog: ItemEditorDialog<{}, {}>;
	readonly items: Map<string, ItemSeed>;
	readonly serverAPI: FileAPI;
	readonly storageKey: {
		readonly blockClipboard: string;
	};
	readonly ui: UIOptions;
	readonly viewArea: HTMLElement;
	#contentStylesheetCache: string | null = null;
	#current!: EditableArea;
	#currentBlock: BurgerBlock | null = null;
	readonly #draft!: EditableArea<'draft'> | null;
	readonly #healthMonitor: HealthMonitor;
	#isProcessed: boolean = false;
	readonly #main!: EditableArea<'main'>;
	#migrationCheck: ((dom: HTMLElement) => void) | null = null;

	get isProcessed() {
		return this.#isProcessed;
	}

	set isProcessed(isProcessed: boolean) {
		this.content.blockMenu.hide();
		this.#isProcessed = isProcessed;
	}

	get content() {
		return this.#current;
	}

	// eslint-disable-next-line no-restricted-syntax
	private constructor(options: BurgerEditorEngineOptions) {
		this.el = getElement(options.root);
		this.config = options.config;
		this.serverAPI = options.fileIO ?? {};
		this.ui = options.ui ?? {};
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

		const dialogSettings: DialogSettings = {
			onClosed: () => {
				this.componentObserver.off();
				this.save();
			},
			onOpen: () => {
				return this.isProcessed;
			},
			createEditorComponent: (el) => {
				const editorComponentSubClassName = el.dataset.bgeEditorUi;
				if (editorComponentSubClassName && this.#isUIName(editorComponentSubClassName)) {
					const cleanUpHook = this.ui[editorComponentSubClassName]?.(el, this);
					return cleanUpHook?.cleanUp;
				}
				return;
			},
			createDialogShell: options.dialogShell,
		};

		this.blockCatalogDialog = new BlockCatalogDialog(options.catalog, {
			...dialogSettings,
			addBlock: (blockData) => {
				return this.addBlock(blockData);
			},
		});

		this.blockOptionsDialog = new BlockOptionsDialog({
			...dialogSettings,
			onChangeBlock: (callback) => {
				this.el.addEventListener('bge:block-change', (e) => {
					callback(e.detail.block);
				});
			},
			getCurrentBlock: () => {
				return this.getCurrentBlock();
			},
		});

		this.itemEditorDialog = new ItemEditorDialog({
			...dialogSettings,
			config: this.config,
			onOpened: (data, editor) => {
				this.componentObserver.notify('open-editor', {
					data,
					editor,
				});
			},
			getComponentObserver: () => {
				return this.componentObserver;
			},
			getTemplate: (itemName: string) => {
				return getItemEditorTemplate(this, itemName);
			},
			getContentStylesheet: async () => {
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
			},
		});

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
	}

	clearCurrentBlock() {
		this.#currentBlock = null;
	}

	async draftToMain(confirm?: ConfirmCallback) {
		if (!this.#draft) {
			return false;
		}

		if (!(await confirm?.())) {
			return false;
		}

		if (this.#draft.isEmpty() || this.#draft.isSame(this.#main)) {
			await this.#draft.copyTo(this.#main);
			this.showMain();
			return true;
		}
		return false;
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

		if (!(await confirm?.())) {
			return false;
		}

		if (this.#main.isEmpty() || this.#main.isSame(this.#draft)) {
			await this.#main.copyTo(this.#draft);
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
			const item = Item.rebind(itemData, this.items, this.itemEditorDialog);
			return item.el;
		}

		const name = typeof itemData === 'string' ? itemData : itemData.name;
		const item = await Item.create(
			name,
			this.items,
			this.itemEditorDialog,
			typeof itemData === 'string' ? undefined : itemData.data,
		);
		return item.el;
	}

	#isUIName(name: string): name is keyof UIOptions {
		return name in this.ui;
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

	#show(to: EditableArea) {
		if (this.#current === to) {
			return;
		}
		this.#main.hide();
		this.#draft?.hide();
		to.show();
		this.#current = to;
		this.#current.update();
		this.migrationCheck(to.containerElement);
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

		// @ts-ignore force assign to readonly property
		engine.#main =
			//
			await EditableArea.new(
				'main',
				mainInitialContent,
				engine,
				options.blockMenu,
				options.initialInsertionButton,
				stylesheets,
				options.config.classList,
			);

		const draftInitialContent =
			typeof options.initialContents === 'string' ? null : options.initialContents.draft;

		// @ts-ignore force assign to readonly property
		engine.#draft =
			draftInitialContent == null
				? null
				: await EditableArea.new(
						'draft',
						draftInitialContent,
						engine,
						options.blockMenu,
						options.initialInsertionButton,
						stylesheets,
						options.config.classList,
					);

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
