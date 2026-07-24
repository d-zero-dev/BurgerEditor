/**
 * 要素を期待するコンストラクタの型にナローイングして返す
 *
 * DOMクエリの戻り値（`Element`/`HTMLElement`）を具体的なサブタイプとして
 * 扱いたい場合に、キャストの代わりに実行時検証付きで絞り込む
 * @param el 検証対象の要素
 * @param ctor 期待する要素のコンストラクタ
 * @param context エラーメッセージに含める文脈（取得に使ったラベルなど）
 * @returns ナローイングされた要素
 * @throws {TypeError} 要素が期待する型のインスタンスでない場合
 * @example
 * ```ts
 * const input = narrowElement(
 * 	screen.getByLabelText('タイトル'),
 * 	HTMLInputElement,
 * 	'タイトル',
 * );
 * input.value; // HTMLInputElementとして型安全にアクセスできる
 * ```
 */
export function narrowElement<T extends Element>(
	el: Element,
	ctor: new () => T,
	context?: string,
): T {
	if (!(el instanceof ctor)) {
		throw new TypeError(
			`Expected ${ctor.name}${context ? ` for ${context}` : ''}, got ${el.constructor.name}`,
		);
	}
	return el;
}
