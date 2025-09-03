import type { BlockData, BlockOptions, ContainerFrameSemantics } from './types.js';
import type { BurgerEditorEngine } from '../engine/engine.js';
import type { ItemData } from '../item/types.js';

import { Item } from '../item/item.js';

import { createUnknownBlock } from './create-unknown-block.js';
import { exportOptions } from './export-options.js';
import { importOptions } from './import-options.js';
import { updateGridItems } from './update-grid-items.js';

const bbMap = new WeakMap<BurgerBlock, HTMLElement>();

let _lastUID = 0;

export class BurgerBlock {
	readonly engine: BurgerEditorEngine;
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
	private constructor(
		engine: BurgerEditorEngine,
		elementOrBlockName: HTMLElement | string,
	) {
		this.#uid = _lastUID++;
		this.engine = engine;

		if (typeof elementOrBlockName === 'string') {
			const el = engine.getBlockTemplate(elementOrBlockName);
			if (el) {
				bbMap.set(this, el);
			}
		} else if (elementOrBlockName) {
			const el = elementOrBlockName;
			bbMap.set(this, el);
		} else {
			throw new Error('Do not create BurgerBlock. A base element is empty.');
		}

		BurgerBlock.#blocks.set(this.el, this);
	}

	/**
	 * Change the semantic type of container frame and groups
	 * @param frameSemantics - The semantic type to change to
	 */
	changeFrameSemantics(frameSemantics: ContainerFrameSemantics) {
		const containerFrame = this.el.querySelector('[data-bge-container-frame]');
		if (!containerFrame) {
			throw new Error('Container frame not found');
		}

		// Backup current state for rollback
		const backup = this.#export();

		try {
			// Determine target elements
			const frameTagName = frameSemantics === 'div' ? 'div' : frameSemantics;
			const groupTagName = frameSemantics === 'div' ? 'div' : 'li';

			// Create new container frame element
			const newFrame = document.createElement(frameTagName);
			this.#copyAttributes(containerFrame, newFrame);

			// Transform groups
			const groups = containerFrame.querySelectorAll('[data-bge-group]');
			for (const group of groups) {
				const newGroup = document.createElement(groupTagName);
				this.#copyAttributes(group, newGroup);

				// Move all child content
				while (group.firstChild) {
					newGroup.append(group.firstChild);
				}

				newFrame.append(newGroup);
			}

			// Replace old frame with new frame
			containerFrame.parentNode?.replaceChild(newFrame, containerFrame);

			// Update internal references
			BurgerBlock.#blocks.set(this.el, this);

			// Update options with new frameSemantics
			const currentOptions = this.exportOptions();
			this.importOptions({
				...currentOptions,
				props: {
					...currentOptions.props,
					frameSemantics,
				},
			});
		} catch (error) {
			// Rollback on error
			this.#import(backup);
			throw new Error(
				`Frame semantics change failed: ${error instanceof Error ? error.message : error}`,
			);
		}
	}
	clone() {
		const originalData: BlockData = this.#export();
		const newBlock = new BurgerBlock(this.engine, this.el.dataset.bgeName ?? 'unknown');
		newBlock.#import(originalData);
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

	importJSONString(jsonString: string) {
		const data = JSON.parse(jsonString) as BlockData;
		try {
			this.#import(data);
		} catch (error) {
			throw new Error(`ImportError: ${error instanceof Error ? error.message : error}`);
		}
	}

	importOptions(options: BlockOptions) {
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
		return this.el.matches(
			':not([data-bge-container*=":immutable"]):has(>[data-bge-container-frame]>[data-bge-group])',
		);
	}

	remove() {
		this.el.remove();
	}

	toJSONStringify(space?: string | number) {
		return JSON.stringify(this.#export(), null, space);
	}

	async updateGridItems(addOrRemove: 1 | -1) {
		await updateGridItems(
			[...this.el.querySelectorAll('[data-bge-group]')],
			this.engine,
			addOrRemove,
			this.items,
			(items) => (this.items = items),
		);
	}

	/**
	 * Copy all attributes from source to target element
	 * @param source - Source element
	 * @param target - Target element
	 */
	#copyAttributes(source: Element, target: Element) {
		for (const attr of source.attributes) {
			target.setAttribute(attr.name, attr.value);
		}

		// Copy classes
		target.className = source.className;
	}

	#export() {
		const data: BlockData = {
			...this.exportOptions(),
			itemData: this.items.map((type) => type.export()),
		};
		return data;
	}

	#import(data: BlockData) {
		for (const [i, typeData] of data.itemData.entries()) {
			void this.items[i]?.import(typeData);
		}
		importOptions(this.el, data);
	}

	async #init() {
		for (const $item of this.el.querySelectorAll<HTMLElement>('[data-bgi], [data-bgt]')) {
			const item = await Item.new(this.engine, $item);
			(this.items as Item<ItemData, {}>[])[this.items.length] = item;
		}
	}

	static #blocks = new WeakMap<HTMLElement, BurgerBlock>();

	static async new(engine: BurgerEditorEngine, elementOrBlockName: HTMLElement | string) {
		const block = new BurgerBlock(engine, elementOrBlockName);
		await block.#init();
		return block;
	}

	static async createUnknownBlock(html: string, engine: BurgerEditorEngine) {
		return createUnknownBlock(html, engine);
	}

	static getBlock(el: HTMLElement) {
		const block = this.#blocks.get(el);
		if (!block) {
			throw new Error('Do not get BurgerBlock instance.');
		}
		return block;
	}
}
