import type { BurgerEditorEngine } from '../engine/engine.js';
import type { Config } from '../types.js';
import type { Item } from './item.js';

export type ItemPrimitiveData = string | number | boolean | null | undefined;

export interface ItemData {
	[key: string]: ItemPrimitiveData | ItemPrimitiveData[];
}

export interface ItemMataData {
	readonly key: keyof ItemData;
	readonly datum: ItemPrimitiveData;
	readonly isArray: boolean;
}

/**
 * Props passed to an item's `Editor` component.
 *
 * `E` is the editor state shape — by default the item data itself, or the
 * result of `toEditorState` when the form works on a transformed view of
 * the data.
 */
export interface ItemEditorProps<
	T extends ItemData = ItemData,
	C extends { [key: string]: unknown } = {},
	E = T,
> {
	/**
	 * Current editor state. Render controlled inputs from this value.
	 */
	readonly state: E;

	/**
	 * Replace the editor state, either directly or via a functional update.
	 */
	readonly setState: (update: E | ((prev: E) => E)) => void;

	/**
	 * Engine configuration (sample paths, experimental item options, etc.).
	 */
	readonly config: Config;

	/**
	 * The engine instance, for access to server APIs and the component
	 * observer.
	 */
	readonly engine: BurgerEditorEngine;

	/**
	 * The content item being edited.
	 */
	readonly item: Item<T, C>;
}

/**
 * An item editor component. The UI layer renders it as a React component;
 * the return type is `unknown` so that this package stays free of React
 * type dependencies.
 */
export type ItemEditorComponent<
	T extends ItemData = ItemData,
	C extends { [key: string]: unknown } = {},
	E = T,
> = (props: ItemEditorProps<T, C, E>) => unknown;

export interface ItemSeed<
	N extends string = string,
	T extends ItemData = {},
	C extends {
		[key: string]: unknown;
	} = {},
	E = T,
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
	 * Item editor component. Receives the current editor state and renders
	 * a controlled form. Buttons inside the editor must use the Invoker
	 * Commands API (`command`/`commandfor`) — click handlers are forbidden.
	 */
	Editor?: ItemEditorComponent<T, C, E>;

	/**
	 * Derive the editor state from the item data when the editor opens.
	 * Pure function — replaces the data-transform half of `beforeOpen`.
	 * @param data - The item data being edited
	 * @param config - Engine configuration
	 * @returns The initial editor state
	 */
	toEditorState?: (data: Readonly<T>, config: Config) => E;

	/**
	 * Derive the item data to persist from the editor state on submit.
	 * Pure function — replaces `beforeChange`.
	 * @param state - The editor state at submit time
	 * @param config - Engine configuration
	 * @returns The item data to import into the content
	 */
	toItemData?: (state: Readonly<E>, config: Config) => T | Promise<T>;

	/**
	 * Non-editor lifecycle hooks.
	 */
	editorOptions?: ItemEditorOptions<T, C>;
}

export interface ItemEditorOptions<
	T extends ItemData,
	C extends { [key: string]: unknown } = {},
> {
	/**
	 * Return a non-empty message to prevent the block containing this item
	 * from being added.
	 * @param item - The item instance
	 */
	isDisable?(item: Item<T, C>): string;
}
