import type { ItemData, ItemSeed } from './types.js';
import type { Config } from '../types.js';

import { replacePlaceholders } from '../utils/replace-placeholders.js';

import { createUnknownContentItem } from './create-item.js';
import { dataFromHtml } from './data-from-html.js';
import { dataToHtml } from './data-to-html.js';
import { importItemHtml } from './import-item-html.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elMap = new WeakMap<HTMLElement, Item<any, any>>();

export class Item<
	T extends ItemData,
	C extends { [key: string]: unknown },
	N extends keyof T & string = keyof T & string,
> {
	readonly config: Config;
	readonly name: string;
	readonly seed: ItemSeed<N, T, C>;
	readonly #el: HTMLElement;
	#version: string;

	get el() {
		return this.#el;
	}

	get version() {
		return this.#version;
	}

	// eslint-disable-next-line no-restricted-syntax
	private constructor(seed: ItemSeed<N, T, C> | null, el: HTMLElement, config: Config) {
		elMap.set(el, this);
		this.#el = el;
		this.config = config;

		// Synthesize fallback seed when missing
		const effectiveSeed = seed ?? createUnknownContentItem<T, C, N>(el);

		this.name = effectiveSeed.name;
		this.#version = effectiveSeed.version;
		this.seed = effectiveSeed;
	}

	export() {
		return dataFromHtml(this.el.innerHTML) as T;
	}

	/**
	 * Write data into the item: the current data is read back from the item's
	 * HTML, merged with `newData`, passed through the seed's `normalizeItemData`,
	 * and rendered again. The saved HTML can therefore differ from `newData`
	 * where the seed normalizes it (for example, an image's second `<source>` never
	 * keeps an empty `media`).
	 * @param newData - The keys to change; the others keep their current values
	 * @example
	 * ```ts
	 * item.import({ path: ['/a.png', '/b.png'] });
	 * ```
	 */
	import(newData: Partial<T>) {
		this.el.innerHTML = importItemHtml(
			this.el.innerHTML,
			newData,
			this.seed,
			this.config,
		);
	}

	isDisable() {
		return this.seed.editorOptions?.isDisable?.(this) ?? '';
	}

	static create<T extends ItemData, C extends { [key: string]: unknown }>(
		name: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		itemSeeds: ReadonlyMap<string, ItemSeed<string, any, any>>,
		config: Config,
		initData: Partial<T> = {},
	) {
		const seed: ItemSeed<string, T, C> | null = itemSeeds.get(name) ?? null;
		const wrapper = Item.createWrapper(name, seed, config);
		const item = new Item<T, C>(seed, wrapper, config);
		item.import(initData);
		return item;
	}

	static createElement<T extends ItemData>(template: string, data: Partial<T>) {
		return dataToHtml(template, data);
	}

	static createWrapper<T extends ItemData, C extends { [key: string]: unknown }>(
		name: string,
		seed: ItemSeed<string, T, C> | null,
		config: Config,
	) {
		const wrapper = document.createElement('div');
		wrapper.dataset.bgi = name;

		if (seed) {
			const version = seed.version;
			wrapper.dataset.bgiVer = version;
			wrapper.innerHTML = replacePlaceholders(seed.template, config);
		}

		return wrapper;
	}

	static rebind<T extends ItemData, C extends { [key: string]: unknown }>(
		el: HTMLElement,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		itemSeeds: ReadonlyMap<string, ItemSeed<string, any, any>>,
		config: Config,
	) {
		const name = el.dataset.bgi;
		if (!name) {
			throw new Error('data-bgi not found');
		}
		const seed: ItemSeed<string, T, C> | null = itemSeeds.get(name) ?? null;
		const item = new Item<T, C>(seed, el, config);
		return item;
	}

	static getInstance(el: HTMLElement) {
		return elMap.get(el);
	}
}
