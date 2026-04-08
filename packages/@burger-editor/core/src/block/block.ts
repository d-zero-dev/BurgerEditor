import type { ContainerFrameSemantics, CreateItemElement } from './types.js';
import type { BurgerEditorEngine } from '../engine/engine.js';
import type { Item } from '../item/item.js';
import type { ItemData } from '../item/types.js';
import type { BlockData } from '../types.js';

import { changeFrameSemantics } from './change-frame-semantics.js';
import { createPlainStructuredBlockElement } from './create-plain-structured-block-element.js';
import { exportOptions } from './export-options.js';
import { importOptions } from './import-options.js';
import { parseHTMLToBlockData } from './parse-html-to-definition.js';
import { updateGridItems } from './update-grid-items.js';

const bbMap = new WeakMap<BurgerBlock, HTMLElement>();

let _lastUID = 0;

export class BurgerBlock {
	#createItemElement: CreateItemElement;
	#items: readonly Item<ItemData, {}>[] = [];
	#uid: number;

	get items() {
		return this.#items;
	}

	set items(items: readonly Item<ItemData, {}>[]) {
		this.#items = items;
	}

	get id() {
		return this.el.id;
	}

	get el() {
		return bbMap.get(this)!;
	}

	// eslint-disable-next-line no-restricted-syntax
	private constructor(createItemElement: CreateItemElement) {
		this.#uid = _lastUID++;
		this.#createItemElement = createItemElement;
	}

	/**
	 * Change the semantic type of container frame and groups
	 * @param frameSemantics - The semantic type to change to
	 */
	changeFrameSemantics(frameSemantics: ContainerFrameSemantics) {
		changeFrameSemantics(this.el, frameSemantics);
	}

	clone() {
		const originalData: BlockData = this.#export();
		const newBlock = BurgerBlock.create(originalData, this.#createItemElement);
		return newBlock;
	}

	existNext() {
		return !!this.el.nextElementSibling;
	}

	existPrev() {
		return !!this.el.previousElementSibling;
	}

	exportOptions() {
		return exportOptions(this.el);
	}

	getHTMLStringify() {
		return this.el.outerHTML;
	}

	async importJSONString(jsonString: string) {
		const data = JSON.parse(jsonString) as BlockData;
		try {
			await this.#import(data);
		} catch (error) {
			throw new Error(`ImportError: ${error instanceof Error ? error.message : error}`);
		}
	}

	importOptions(options: Partial<BlockData>) {
		importOptions(this.el, options);
	}

	importTypes<
		T extends ItemData,
		C extends {
			[key: string]: unknown;
		},
		I = Item<T, C>,
	>(extractor: (i: number, item: I) => T) {
		for (const [i, item] of this.items.entries()) {
			void item.import(extractor(i, item as I));
		}
	}

	is(block: BurgerBlock) {
		return this.#uid === block.#uid;
	}

	isDisable() {
		let msg = '';
		for (const type of this.items) {
			msg = type.isDisable();
			if (msg) {
				break;
			}
		}
		return msg;
	}

	isMutable() {
		return this.el.matches(':not([data-bge-container*=":immutable"])');
	}

	remove() {
		this.el.remove();
	}

	toJSONStringify(space?: string | number) {
		return JSON.stringify(this.#export(), null, space);
	}

	updateGridItems(addOrRemove: 1 | -1, engine: BurgerEditorEngine) {
		updateGridItems(
			[...this.el.querySelectorAll('[data-bge-group]')],
			engine,
			addOrRemove,
			this.items,
			(items) => (this.items = items),
		);
	}

	#create(data: BlockData) {
		return createPlainStructuredBlockElement(data, this.#createItemElement);
	}

	#export() {
		return parseHTMLToBlockData(this.el);
	}

	#fallbackBlockData(html: string): BlockData {
		return {
			name: 'text',
			containerProps: {
				type: 'grid',
				columns: 1,
			},
			classList: [],
			items: [[{ name: 'wysiwyg', data: { wysiwyg: html } }]],
		};
	}

	async #import(data: BlockData) {
		this.el.replaceWith(
			await createPlainStructuredBlockElement(data, this.#createItemElement),
		);
	}

	async #rebind(el: HTMLElement) {
		if (isBurgerBlockElement(el)) {
			const itemContainers = el.querySelectorAll('[data-bge-item]');
			for (const itemContainer of itemContainers) {
				const itemElements = itemContainer.querySelectorAll<HTMLElement>('[data-bgi]');
				for (const itemElement of itemElements) {
					await this.#createItemElement(itemElement);
				}
			}
			return el;
		}

		// eslint-disable-next-line no-console
		console.error('%o is not a burger block', el);
		const fallbackEl = await createPlainStructuredBlockElement(
			this.#fallbackBlockData(el.outerHTML),
			this.#createItemElement,
		);
		el.replaceWith(fallbackEl);
		return fallbackEl;
	}

	#set(el: HTMLElement) {
		bbMap.set(this, el);
		BurgerBlock.#blocks.set(this.el, this);
	}

	static #blocks = new WeakMap<HTMLElement, BurgerBlock>();

	static async create(data: BlockData, createItemElement: CreateItemElement) {
		const block = new BurgerBlock(createItemElement);
		const el = await block.#create(data);
		block.#set(el);
		return block;
	}

	static async rebind(el: HTMLElement, createItemElement: CreateItemElement) {
		const block = new BurgerBlock(createItemElement);
		const newEl = await block.#rebind(el);
		block.#set(newEl);
		return block;
	}

	static getBlock(el: HTMLElement) {
		const block = this.#blocks.get(el);
		if (!block) {
			throw new Error('Do not get BurgerBlock instance.');
		}
		return block;
	}
}

/**
 *
 * @param el
 */
function isBurgerBlockElement(el: HTMLElement) {
	return el.matches(
		[
			'[data-bge-name][data-bge-container]:has(>[data-bge-container-frame]>[data-bge-group]>[data-bge-item])',
		].join(','),
	);
}
