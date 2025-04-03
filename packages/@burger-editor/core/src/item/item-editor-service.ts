import type { ItemEditorDialog } from '../item-editor-dialog.js';
import type { Item } from './item.js';
import type { ItemData, ItemSeed } from './types.js';
import type { Submitter } from '../dom-helpers/types.js';

export class ItemEditorService<
	T extends ItemData,
	C extends { [key: string]: unknown },
	N extends keyof T & string = keyof T & string,
> {
	readonly #beforeChange?: (
		newData: Readonly<T>,
		editor: ItemEditorDialog<T, C>,
	) => Promise<T> | T;
	readonly #beforeOpen?: (data: Readonly<T>, editor: ItemEditorDialog<T, C>) => T;
	readonly #data?: C;
	readonly #isDisable?: (item: Item<T, C>) => string;
	readonly #item: Item<T, C>;

	readonly #migrate?: (item: Item<T, C>) => T;
	readonly #migrateElement?: (data: T, item: Item<T, C>) => Promise<void> | void;
	readonly #onSubmit?: (e: SubmitEvent, submitter: Submitter) => boolean | void;
	readonly #open?: (data: Readonly<T>, editor: ItemEditorDialog<T, C>) => void;

	get item() {
		return this.#item;
	}

	constructor(item: Item<T, C, N>, seed: ItemSeed<N, T, C>) {
		this.#item = item;
		const options = seed.editorOptions ?? {};

		if (options.beforeOpen) {
			this.#beforeOpen = options.beforeOpen;
		}
		if (options.open) {
			this.#open = options.open;
		}
		if (options.beforeChange) {
			this.#beforeChange = options.beforeChange;
		}
		if (options.onSubmit) {
			this.#onSubmit = options.onSubmit;
		}
		if (options.migrate) {
			this.#migrate = options.migrate;
		}
		if (options.migrateElement) {
			this.#migrateElement = options.migrateElement;
		}
		if (options.isDisable) {
			this.#isDisable = options.isDisable;
		}
		this.#data = options.customData;
	}

	async beforeChange(newValues: Readonly<T>, editor: ItemEditorDialog<T, C>): Promise<T> {
		if (this.#beforeChange) {
			return this.#beforeChange(newValues, editor);
		}
		return newValues;
	}

	beforeOpen(data: Readonly<T>, editor: ItemEditorDialog<T, C>): T {
		if (this.#beforeOpen) {
			return this.#beforeOpen(data, editor);
		}
		return data;
	}

	getData<D extends keyof C = keyof C>(customProperty: D) {
		return this.#data?.[customProperty] ?? null;
	}

	isDisable(item: Item<T, C>) {
		return this.#isDisable?.(item) ?? '';
	}

	migrate(item: Item<T, C>): ItemData {
		return this.#migrate ? this.#migrate(item) : item.export();
	}

	async migrateElement(data: T, item: Item<T, C>) {
		await this.#migrateElement?.(data, item);
	}

	onSubmit?(e: SubmitEvent, submitter: Submitter): boolean | void {
		return this.#onSubmit?.(e, submitter);
	}

	open(data: Readonly<T>, editor: ItemEditorDialog<T, C>) {
		this.#open?.(data, editor);
	}

	setData<D extends keyof C = keyof C>(customProperty: D, value: C[D]) {
		if (!this.#data) {
			return;
		}
		this.#data[customProperty] = value;
	}
}
