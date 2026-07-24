import type { ItemSeed, ItemData } from './types.js';

/**
 * アイテム定義（seed）を作成する
 *
 * 実体はジェネリクスを保存する型付きidentityヘルパー。`T`（保存データ型）を
 * 明示することで、`toEditorState`/`toItemData`/`Editor` のprops型が
 * すべて連動して推論される。エディタUIは `Editor` にReactコンポーネントを
 * 渡して宣言し、保存データ⇄編集状態の変換は純関数で行う。
 * @param item - アイテム定義。`template` はfrozen-patty形式（`data-bge`属性）のHTML
 * @example
 * ```tsx
 * export default createItem<{ titleH2: string }>({
 * 	version: __VERSION__,
 * 	name: 'title-h2',
 * 	template,
 * 	style,
 * 	Editor({ state, setState }) {
 * 		return (
 * 			<input
 * 				type="text"
 * 				value={state.titleH2 ?? ''}
 * 				onChange={(e) => setState({ ...state, titleH2: e.currentTarget.value })}
 * 			/>
 * 		);
 * 	},
 * });
 * ```
 */
export function createItem<
	T extends ItemData = {},
	C extends { [key: string]: unknown } = {},
	N extends string = string,
	E = T,
>(item: ItemSeed<N, T, C, E>) {
	return {
		...item,
		get _(): T {
			throw new Error('This is a test only property');
		},
	};
}

/**
 * Create a fallback unknown-content item seed from element data
 * @param el Element with data-bgi attribute
 * @param fallbackName Default name when data-bgi is missing
 */
export function createUnknownContentItem<
	T extends ItemData = {},
	C extends { [key: string]: unknown } = {},
	N extends string = string,
>(el: HTMLElement, fallbackName: N = 'unknown-content' as N): ItemSeed<N, T, C> {
	return createItem<T, C, N>({
		name: (el.dataset.bgi as N) ?? fallbackName,
		version: el.dataset.bgiVer ?? '0.0.0',
		template: el.innerHTML ?? '',
		style: '',
	});
}
