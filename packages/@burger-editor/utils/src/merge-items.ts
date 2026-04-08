/**
 * マージ操作が可能な汎用型
 * 任意のオブジェクト型にdeleteプロパティを追加する
 */
export type Mergeable<T extends Record<string, unknown>> = T & {
	readonly delete?: boolean;
};

/**
 * 汎用的なマージ関数
 * 指定されたキーフィールドを基準にアイテムのマージを行う
 * @param defaultItems デフォルトのアイテム配列
 * @param mergeItems マージ設定配列
 * @param keyField キーとなるフィールド名
 * @param isValidForAdd 新規追加時のバリデーション関数
 * @returns マージ後のアイテム配列
 * @example
 * ```typescript
 * // SelectableValue型での使用例
 * const result = mergeItems(
 *   [{ value: 'a', label: 'A' }],
 *   [{ value: 'b', label: 'B' }],
 *   'value',
 *   (item) => Boolean(item.label)
 * );
 *
 * // 独自型での使用例
 * interface User { id: string; name: string; }
 * const users = mergeItems(
 *   [{ id: '1', name: 'Alice' }],
 *   [{ id: '2', name: 'Bob' }],
 *   'id'
 * );
 * ```
 */
export function mergeItems<T extends Record<string, unknown>, K extends keyof T & string>(
	defaultItems: readonly T[],
	mergeItems: readonly Mergeable<Partial<T> & Pick<T, K>>[] | undefined,
	keyField: K,
	isValidForAdd?: (item: Mergeable<Partial<T> & Pick<T, K>>) => boolean,
): T[] {
	// マージ設定がない場合はデフォルトをそのまま返す
	if (!mergeItems) {
		return [...defaultItems];
	}

	let result = [...defaultItems];

	for (const mergeItem of mergeItems) {
		if (mergeItem.delete) {
			// 削除: キーが一致するものを除去
			const keyValue = mergeItem[keyField] as T[K];
			result = result.filter((item) => item[keyField] !== keyValue);
		} else {
			// 追加または更新
			const keyValue = mergeItem[keyField] as T[K];
			const existingIndex = result.findIndex((item) => item[keyField] === keyValue);

			if (existingIndex === -1) {
				// 新規追加: バリデーション通過が必要
				if (!isValidForAdd || isValidForAdd(mergeItem)) {
					result.push(mergeItem as T);
				}
			} else {
				// 既存の更新: マージする
				result[existingIndex] = { ...result[existingIndex], ...mergeItem } as T;
			}
		}
	}

	return result;
}
