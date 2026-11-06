/**
 * フィールド名ごとの値。リストの中のフィールドは配列、リストの中のリストの
 * フィールドは、外側の項目ごとの配列の配列になる（深さに制限はない）。
 * @example
 * ```ts
 * const data: FrozenPattyData = {
 * 	title: ['A', 'B'],
 * 	label: [['a1', 'a2'], ['b1']],
 * };
 * ```
 */
export interface FrozenPattyData {
	[filed: string]: PrimitiveData;
}

/**
 * リストの項目 1 つ分のデータ（配列を 1 段剥がしたもの）。入れ子のリストの値は、
 * まだ配列のまま。
 * @example
 * ```ts
 * // { title: ['A', 'B'], label: [['a1', 'a2'], ['b1']] } の 0 番目
 * const item: FrozenPattyFlattenData = { title: 'A', label: ['a1', 'a2'] };
 * ```
 */
export interface FrozenPattyFlattenData {
	[field: string]: PrimitiveData;
}

export interface FieldDefinition {
	fieldName: string;
	propName?: string;
}

export type PrimitiveDatum = string | number | boolean | null | undefined;

/**
 * フィールドの値。配列はリスト、配列の配列はリストの中のリスト。
 * @example
 * ```ts
 * const scalar: PrimitiveData = 'text';
 * const list: PrimitiveData = ['a', 'b'];
 * const nested: PrimitiveData = [['a1', 'a2'], ['b1']];
 * ```
 */
export type PrimitiveData = PrimitiveDatum | PrimitiveData[];

export type Filter = <T>(value: T) => T;
