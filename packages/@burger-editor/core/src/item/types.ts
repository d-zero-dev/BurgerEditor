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
