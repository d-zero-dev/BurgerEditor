import type { ItemEditorDialog } from '../item-editor-dialog.js';
import type { Item } from './item.js';
import type { Submitter } from '../dom-helpers/types.js';

export type ItemPrimitiveData = string | number | boolean | null | undefined;

export interface ItemData {
	[key: string]: ItemPrimitiveData | ItemPrimitiveData[];
}

export interface ItemMataData {
	readonly key: keyof ItemData;
	readonly datum: ItemPrimitiveData;
	readonly isArray: boolean;
}

export interface ItemSeed<
	N extends string = string,
	T extends ItemData = {},
	C extends {
		[key: string]: unknown;
	} = {},
> {
	/**
	 * Version
	 */
	version: string;

	/**
	 * Item name
	 */
	name: N;

	/**
	 * HTML template
	 */
	template: string;

	/**
	 * CSS
	 */
	style: string;

	/**
	 * Initial data
	 * @param item
	 * @returns
	 */
	init?: (item: Item<T, C>) => T | Promise<T>;

	/**
	 * Editor HTML template
	 */
	editor: string;

	/**
	 * Editor lifecycle
	 *
	 * ---
	 *
	 * `open`
	 * ```
	 * ┌─────────────────┐
	 * │ beforeOpen      │
	 * ├─────────────────┤
	 * │ Item::export    │
	 * ├─────────────────┤
	 * │ Dialog::import  │
	 * ├─────────────────┤
	 * │ Dialog::open    │
	 * ├─────────────────┤
	 * │ open            │
	 * └─────────────────┘
	 * ```
	 *
	 * ---
	 *
	 * `complete`
	 * ```
	 * ┌──────────────────┐
	 * │ onSubmit         │
	 * ├──────────────────┤
	 * │ Dialog::extract  │
	 * ├──────────────────┤
	 * │ Item::import     │
	 * ├──────────────────┤
	 * │ beforeChange     │
	 * ├──────────────────┤
	 * │ <OVERWRITE HTML> │
	 * ├──────────────────┤
	 * │ migrateElement   │
	 * ├──────────────────┤
	 * │ change           │
	 * ├──────────────────┤
	 * │ Dialog::complete │
	 * └──────────────────┘
	 * ```
	 */
	editorOptions?: ItemEditorOptions<T, C>;
}

export interface ItemEditorOptions<
	T extends ItemData,
	C extends { [key: string]: unknown } = {},
> {
	customData?: C;
	open?(data: Readonly<T>, editor: ItemEditorDialog<T, C>): Promise<void> | void;
	beforeChange?(newData: Readonly<T>, editor: ItemEditorDialog<T, C>): Promise<T> | T;
	beforeOpen?(data: Readonly<T>, editor: ItemEditorDialog<T, C>): T;
	isDisable?(item: Item<T, C>): string;
	migrate?(item: Item<T, C>): T;
	migrateElement?(data: T, item: Item<T, C>): Promise<void> | void;
	onSubmit?(e: SubmitEvent, submitter: Submitter): boolean | void;
}
