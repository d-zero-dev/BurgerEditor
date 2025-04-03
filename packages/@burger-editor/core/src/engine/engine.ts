import type { ItemData, ItemSeed } from '../item/types.js';
import type { BurgerEditorEngineOptions, UIOptions, Config, FileAPI } from '../types.js';

import { BurgerBlock } from '../block/block.js';
import { BlockCatalogDialog } from '../block-catalog-dialog.js';
import { BlockOptionsDialog } from '../block-options-dialog.js';
import { ComponentObserver } from '../component-observer.js';
import { createComponentStylesheet } from '../dom-helpers/create-component-stylesheet.js';
import { getCustomProperties } from '../dom-helpers/get-custom-properties.js';
import { getElement } from '../dom-helpers/get-element.js';
import { EditableArea } from '../editable-area.js';
import { createBgeEvent } from '../event/create-bge-event.js';
import { ItemEditorDialog } from '../item-editor-dialog.js';

import { getBlockTemplate } from './get-block-template.js';

type ConfirmCallback = () => Promise<boolean> | boolean;

export class BurgerEditorEngine {
	readonly blockCatalogDialog: BlockCatalogDialog;
	readonly blockOptionsDialog: BlockOptionsDialog;
	readonly componentObserver = new ComponentObserver();
	readonly config: Config;
	readonly css: {
		readonly stylesheets: readonly string[];
		readonly classList: readonly string[];
		readonly generalCSS: string;
	};
	readonly defaultBlocks: ReadonlyMap<string, string>;
	readonly el: HTMLElement;
	readonly itemEditorDialog: ItemEditorDialog<{}, {}>;
	readonly items: Map<string, ItemSeed>;
	readonly serverAPI: FileAPI;
	readonly storageKey: {
		readonly blockClipboard: string;
	};
	readonly ui: UIOptions;
	readonly viewArea: HTMLElement;
	#current!: EditableArea;
	#currentBlock: BurgerBlock | null = null;
	readonly #draft!: EditableArea<'draft'> | null;
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

		this.css = {
			stylesheets: options.config.stylesheets ?? [],
			classList: options.config.classList ?? [],
			generalCSS: options.generalCSS,
		};

		this.defaultBlocks = new Map(
			Object.entries(options.blocks).map(([name, templateBlock]) => {
				const templateCode = templateBlock.template
					.replaceAll('%sampleImagePath%', options.config.sampleImagePath)
					.replaceAll('%googleMapsApiKey%', options.config.googleMapsApiKey ?? '');
				return [name, templateCode];
			}),
		);

		if (
			this.config.googleMapsApiKey &&
			!document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]')
		) {
			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${this.config.googleMapsApiKey}&libraries=marker`;
			document.head.append(script);
		}

		this.blockCatalogDialog = new BlockCatalogDialog(
			this,
			options.catalog,
			options.blocks,
		);

		this.blockOptionsDialog = new BlockOptionsDialog(this);

		this.itemEditorDialog = new ItemEditorDialog(this);

		this.items = new Map();
		if (options.items) {
			for (const [name, seed] of Object.entries(options.items)) {
				this.items.set(name, seed);
				BurgerEditorEngine.#addItem(seed);
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

	async addBlock(blockName: string) {
		const block = await BurgerBlock.new(this, blockName);
		const message = block.isDisable();
		if (message) {
			alert(message);
			return;
		}
		await this.content.insertionPoint.insert(block);
		this.save();
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

	getBlockTemplate(name: string) {
		return getBlockTemplate(this.defaultBlocks, name);
	}

	getCurrentBlock() {
		if (!this.#currentBlock) {
			// eslint-disable-next-line no-console
			console.warn('block is unselected.');
		}
		return this.#currentBlock;
	}

	getCustomProperties() {
		return getCustomProperties(this.#current);
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

	showDraft() {
		if (!this.#draft) {
			return;
		}
		this.#show(this.#draft);
	}

	showMain() {
		this.#show(this.#main);
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

	static readonly #itemSeeds = new Map<string, ItemSeed>();

	static async new(options: BurgerEditorEngineOptions) {
		const engine = new BurgerEditorEngine(options);

		const componentStylesheet = createComponentStylesheet(
			options.items,
			options.generalCSS,
		);

		const stylesheets = [componentStylesheet, ...(options.config.stylesheets ?? [])];

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
						stylesheets,
						options.config.classList,
					);

		engine.#current = engine.#main;
		engine.showMain();
		engine.save();

		return engine;
	}

	static #addItem(seed: ItemSeed) {
		if (this.#itemSeeds.has(seed.name)) {
			// eslint-disable-next-line no-console
			console.warn(`"${seed.name}" is already exists.`);
			return;
		}

		this.#itemSeeds.set(seed.name, seed);
	}

	static getItemSeed<
		T extends ItemData,
		C extends { [key: string]: unknown },
		N extends keyof T & string = keyof T & string,
	>(name: string) {
		const editor = this.#itemSeeds.get(name);
		return (editor ?? null) as ItemSeed<N, T, C> | null;
	}
}
