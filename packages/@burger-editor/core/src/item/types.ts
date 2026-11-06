import type { Config } from '../types.js';
import type { Item } from './item.js';

export type ItemPrimitiveData = string | number | boolean | null | undefined;

/**
 * An item data value. An array is a `data-bge-list` list; an array of arrays
 * is a list nested in a list item (one inner array per outer item, e.g. the
 * `<picture>` images of each carousel slide).
 *
 * Why not a recursive type: frozen-patty reads any nesting depth, but a
 * recursive item data type makes the inferred types of the local server's
 * routes too deep for TypeScript (TS2589). No item template nests lists
 * deeper than two levels.
 * @example
 * ```ts
 * const flat: ItemDataValue = ['/a.png', '/a-sp.png'];
 * const nested: ItemDataValue = [['/a.png', '/a-sp.png'], ['/b.png']];
 * ```
 */
export type ItemDataValue =
	ItemPrimitiveData | ItemPrimitiveData[] | ItemPrimitiveData[][];

export interface ItemData {
	[key: string]: ItemDataValue;
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
 *
 * The engine and its `config` are not passed as props — the UI layer
 * renders `Editor` under an `EngineProvider`, so an `Editor` reaches them
 * with `@burger-editor/client/ui`'s `useEngine()` (`useEngine().config`
 * for the config). This keeps this package free of a React dependency
 * (`ItemEditorComponent`'s return type is `unknown`) while still letting
 * `Editor` read the engine like every other client UI component.
 * @example
 * ```tsx
 * function Editor({ state, setState }: ItemEditorProps<{ title: string }>) {
 * 	return (
 * 		<input
 * 			type="text"
 * 			value={state.title ?? ''}
 * 			onChange={(e) => setState({ ...state, title: e.currentTarget.value })}
 * 		/>
 * 	);
 * }
 * ```
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
	 * The content item being edited.
	 */
	readonly item: Item<T, C>;
}

/**
 * An item editor component. The UI layer renders it as a React component;
 * the return type is `unknown` so that this package stays free of React
 * type dependencies.
 * @example
 * ```tsx
 * const Editor: ItemEditorComponent<{ href: string }> = ({ state, setState }) => (
 * 	<input
 * 		type="url"
 * 		value={state.href ?? ''}
 * 		onChange={(e) => setState({ ...state, href: e.currentTarget.value })}
 * 	/>
 * );
 * ```
 */
export type ItemEditorComponent<
	T extends ItemData = ItemData,
	C extends { [key: string]: unknown } = {},
	E = T,
> = (props: ItemEditorProps<T, C, E>) => unknown;

/**
 * アイテムの静的定義
 *
 * コンテンツ出力（`template` + frozen-patty）と編集UI（`Editor` React
 * コンポーネント）の両方を1つのオブジェクトで宣言する。保存データ`T`と
 * 編集状態`E`を分離できる（`toEditorState`/`toItemData` で相互変換）のは、
 * 編集中にしか意味を持たない派生値（チェックボックス状態など）を保存
 * データに混ぜないため。定義は `createItem` を通して作成する（`@example`
 * はそちらを参照）。
 * @template N - アイテム名のリテラル型
 * @template T - 保存データ型（frozen-pattyでHTMLと相互変換される形）
 * @template C - カスタムデータ型
 * @template E - エディタ状態型。省略時は保存データと同型
 */
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
	 * Pure function — no DOM access; called once per dialog open.
	 * @param data - The item data being edited
	 * @param config - Engine configuration
	 * @returns The initial editor state
	 */
	toEditorState?: (data: Readonly<T>, config: Config) => E;

	/**
	 * Derive the item data to persist from the editor state on submit.
	 * Pure function — no DOM access; called when the editor form is submitted.
	 * @param state - The editor state at submit time
	 * @param config - Engine configuration
	 * @returns The item data to import into the content
	 * @throws {Error} When the state must not be saved (e.g. a required value is empty).
	 * The submit is cancelled: the editor dialog stays open and shows the error
	 * message, so write the message as a description of the state for the author.
	 * Note this runs only for edits made in the editor UI. Writes that skip it
	 * (agent tools) are checked by {@link ItemSeed.validateItemData} instead. Derive
	 * the reasons of both from one function (or have this call the other), so that a
	 * reason is written once; already saved HTML is not validated.
	 */
	toItemData?: (state: Readonly<E>, config: Config) => T | Promise<T>;

	/**
	 * Normalize the item data right before it becomes HTML.
	 *
	 * Unlike {@link ItemSeed.toItemData}, this runs on every path that turns
	 * item data into HTML, not only on a save from the editor UI: `Item.import`,
	 * `render()`, and any other writer (for example an agent tool) that renders
	 * item data. Use it for a value that must never be saved empty, whoever
	 * saves it. A writer that is given raw HTML instead of item data can read each
	 * item back from that HTML (`itemExport`) and run this on it.
	 *
	 * It must be idempotent (normalizing normalized data changes nothing): the
	 * editor UI runs it after `toItemData`, and a saved page runs through it on
	 * every later save. Return the same object when nothing changes: a writer
	 * that reads items back from raw HTML re-renders an item only when the
	 * returned object differs, so the HTML it was given stays as it was. It must
	 * not throw — validation belongs in {@link ItemSeed.validateItemData}.
	 * @param data - The item data to become HTML: the merged data when updating
	 * an existing item, or the supplied data (possibly partial) when creating one
	 * @param config - Engine configuration
	 * @returns The data to turn into HTML
	 * @example
	 * ```ts
	 * normalizeItemData: (data, config) => ({
	 * 	...data,
	 * 	media: (data.media ?? []).map((query, index) =>
	 * 		index > 0 && !query ? '(max-width: 767px)' : query,
	 * 	),
	 * }),
	 * ```
	 */
	normalizeItemData?: (data: Readonly<Partial<T>>, config: Config) => Partial<T>;

	/**
	 * Check item data that is about to be saved, on every path that skips
	 * {@link ItemSeed.toItemData} (the agent tools). A writer calls it after
	 * {@link ItemSeed.normalizeItemData}, on the data that would become HTML, and
	 * refuses to save when it returns a reason. Use it for a value that must never
	 * be saved in a state the editor UI would refuse (a link without a name, for
	 * example), whoever saves it.
	 *
	 * Pure, and it runs in Node.js: it must not import React or the browser UI, and
	 * the only DOM it may use is what Node gets from the DOM shim that the writer
	 * loads (`DOMParser`, to read a caption's text, for example). Write each reason
	 * for the author (the agent that reads it fixes its input from it). It must not
	 * throw — an agent sends arbitrary JSON, so treat a value of the wrong type as
	 * empty. Already saved HTML is not validated: it is opened as it is.
	 * @param data - The item data that would become HTML (possibly partial)
	 * @param config - Engine configuration
	 * @returns The reasons the data must not be saved. Empty when it may be saved
	 * @example
	 * ```ts
	 * validateItemData: (data) =>
	 * 	data.node !== 'div' && !data.alt?.[0]?.trim() ? ['alt is required'] : [],
	 * ```
	 */
	validateItemData?: (data: Readonly<Partial<T>>, config: Config) => readonly string[];

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
