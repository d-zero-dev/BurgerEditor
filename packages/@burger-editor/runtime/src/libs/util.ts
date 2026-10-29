/**
 * `12px` のような計算済みスタイルの値を数値にする。数値として読めなければ 0
 * @param value
 */
export function px(value: string): number {
	return Number.parseFloat(value) || 0;
}

/**
 * index を 0 以上 length 未満に循環させる（負の数は末尾から数える）
 * @param index
 * @param length
 */
export function wrap(index: number, length: number): number {
	if (length <= 0) {
		return 0;
	}
	return ((index % length) + length) % length;
}
