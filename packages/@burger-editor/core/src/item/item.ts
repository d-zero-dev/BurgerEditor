import type { ItemEditorDialog } from '../item-editor-dialog.js';
import type { ItemData } from './types.js';

import { strToDOM } from '@burger-editor/utils';
import semver from 'semver';

import { BurgerEditorEngine } from '../engine/engine.js';

import { dataFromHtml } from './data-form-html.js';
import { dataToHtml } from './data-to-html.js';
import { ItemEditorService } from './item-editor-service.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elMap = new WeakMap<HTMLElement, Item<any, {}>>();

export class Item<
	T extends ItemData,
	C extends { [key: string]: unknown },
	N extends keyof T & string = keyof T & string,
> {
	readonly editor: ItemEditorDialog<T, C>;
	readonly name: string;
	readonly #el: HTMLElement;
	readonly #engine: BurgerEditorEngine;
	#isOld = false;
	readonly #service: ItemEditorService<T, C, N>;
	#version: string;

	get el() {
		return this.#el;
	}

	get version() {
		return this.#version;
	}

	get isOld() {
		return this.#isOld;
	}

	// eslint-disable-next-line no-restricted-syntax
	private constructor(engine: BurgerEditorEngine, html: HTMLElement | string) {
		let el: HTMLElement;
		if (typeof html === 'string') {
			el = strToDOM(html);
		} else {
			el = html;
		}

		elMap.set(el, this);

		this.#el = el;

		this.#el.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.#openEditor();
		});

		this.#engine = engine;

		let name = el.dataset.bgi;
		if (!name) {
			name = 'unknown';
			el.dataset.bgi = name;
		}
		this.name = name;

		let version = el.dataset.bgiVer;
		if (!version) {
			version = '0.0.0';
			el.dataset.bgiVer = version;
		}
		this.#version = version;
		const originVersion = engine.items.get(this.name)?.version ?? '0.0.0';
		this.#isOld = semver.lt(this.#version, originVersion);

		const seed = BurgerEditorEngine.getItemSeed<T, C, N>(this.name);

		if (!seed) {
			throw new Error(`Seed not found: ${this.name}`);
		}

		this.#service = new ItemEditorService<T, C, N>(this, seed);

		this.editor = engine.itemEditorDialog as unknown as ItemEditorDialog<T, C>;
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

		if (this.#isOld) {
			await this.#service.migrateElement(data, this);
		}
	}

	isDisable() {
		return this.#service.isDisable(this);
	}

	async upgrade() {
		if (!this.#isOld) {
			return;
		}
		const newTemplate = this.#engine.items.get(this.name)?.template;
		if (!newTemplate) {
			return;
		}
		const newEl = strToDOM(newTemplate);
		const v = newEl.dataset.bgiVer!;
		const itemEditor = BurgerEditorEngine.getItemSeed(this.name);
		const currentData = itemEditor
			? // @ts-ignore
				itemEditor.migrate(this)
			: this.export();
		const newTemplateData = dataFromHtml(newEl.innerHTML);
		const data = { ...newTemplateData, ...currentData } as T;
		this.el.innerHTML = newEl.innerHTML;
		this.el.dataset.bgiVer = v;
		await this.import(data);
		this.#version = v;
		this.#isOld = false;
	}

	#openEditor() {
		this.editor.open(this.#service);
	}

	static async new<T extends ItemData, C extends { [key: string]: unknown }>(
		engine: BurgerEditorEngine,
		html: HTMLElement | string,
		initData: Partial<T> = {},
	) {
		const item = new Item<T, C>(engine, html);
		await item.import(initData);
		return item;
	}

	static getInstance(el: HTMLElement) {
		return elMap.get(el);
	}
}
