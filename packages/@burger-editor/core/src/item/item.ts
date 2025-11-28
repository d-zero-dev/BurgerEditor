import type { ItemEditorDialog } from '../item-editor-dialog.js';
import type { ItemData, ItemSeed } from './types.js';

import { replacePlaceholders } from '../utils/replace-placeholders.js';

import { createUnknownContentItem } from './create-item.js';
import { dataFromHtml } from './data-from-html.js';
import { dataToHtml } from './data-to-html.js';
import { ItemEditorService } from './item-editor-service.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elMap = new WeakMap<HTMLElement, Item<any, any>>();

export class Item<
	T extends ItemData,
	C extends { [key: string]: unknown },
	N extends keyof T & string = keyof T & string,
> {
	readonly editor: ItemEditorDialog<T, C>;
	readonly name: string;
	readonly #el: HTMLElement;
	readonly #service: ItemEditorService<T, C, N>;
	#version: string;

	get el() {
		return this.#el;
	}

	get version() {
		return this.#version;
	}

	// eslint-disable-next-line no-restricted-syntax
	private constructor(
		seed: ItemSeed<N, T, C> | null,
		el: HTMLElement,
		editor: ItemEditorDialog<T, C>,
	) {
		elMap.set(el, this);
		this.#el = el;

		this.#el.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void this.#openEditor();
		});

		// Synthesize fallback seed when missing
		const effectiveSeed = seed ?? createUnknownContentItem<T, C, N>(el);

		this.name = effectiveSeed.name;
		this.#version = effectiveSeed.version;

		this.#service = new ItemEditorService<T, C, N>(this, effectiveSeed);
		this.editor = editor;
	}

	export() {
		return dataFromHtml(this.el.innerHTML) as T;
	}

	async import(newData: Partial<T>, fromDialogChanges = false) {
		const currentData = this.export();
		let data: T = {
			...currentData,
			...newData,
		};
		if (fromDialogChanges) {
			data = await this.#service.beforeChange(data, this.editor);
		}

		this.el.innerHTML = dataToHtml(this.el.innerHTML, data);
	}

	isDisable() {
		return this.#service.isDisable(this);
	}

	async #openEditor() {
		await this.editor.open(this.#service);
	}

	static async create<T extends ItemData, C extends { [key: string]: unknown }>(
		name: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		itemSeeds: ReadonlyMap<string, ItemSeed<string, any, any>>,
		editor: ItemEditorDialog<T, C>,
		initData: Partial<T> = {},
	) {
		const seed: ItemSeed<string, T, C> | null = itemSeeds.get(name) ?? null;
		const wrapper = document.createElement('div');
		wrapper.dataset.bgi = name;

		if (seed) {
			const version = seed.version;
			wrapper.dataset.bgiVer = version;
			wrapper.innerHTML = replacePlaceholders(seed.template, editor.config);
		} else {
			// Fallback: keep requested name, no version, empty HTML; constructor synthesizes seed
			wrapper.innerHTML = '';
		}

		const item = new Item<T, C>(seed, wrapper, editor);
		await item.import(initData);
		return item;
	}

	static rebind<T extends ItemData, C extends { [key: string]: unknown }>(
		el: HTMLElement,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		itemSeeds: ReadonlyMap<string, ItemSeed<string, any, any>>,
		editor: ItemEditorDialog<T, C>,
	) {
		const name = el.dataset.bgi;
		if (!name) {
			throw new Error('data-bgi not found');
		}
		const seed: ItemSeed<string, T, C> | null = itemSeeds.get(name) ?? null;
		const item = new Item<T, C>(seed, el, editor);
		return item;
	}

	static getInstance(el: HTMLElement) {
		return elMap.get(el);
	}
}
