/** ホバー中ブロックの CSS アンカー名（`position-anchor` の参照先） */
export const BGE_BLOCK_MENU_BLOCK_ANCHOR = '--bge-current-block';

/**
 * ブロック内アイテム（`[data-bgi]`）の CSS アンカー名を返す。
 * @param index - ブロック内の出現順（0 始まり）
 * @example
 * ```ts
 * bgeBlockMenuItemAnchorName(0); // '--bge-block-menu-item-0'
 * ```
 */
export function bgeBlockMenuItemAnchorName(
	index: number,
): `--bge-block-menu-item-${number}` {
	return `--bge-block-menu-item-${index}`;
}

/**
 * @param blockEl - `[data-bge-container]` のブロック要素
 */
export function clearBlockMenuAnchors(blockEl: HTMLElement): void {
	blockEl.style.removeProperty('anchor-name');
	for (const itemEl of blockEl.querySelectorAll<HTMLElement>('[data-bgi]')) {
		itemEl.style.removeProperty('anchor-name');
	}
}

/**
 * メニューとアイテムオーバーレイが参照するアンカーをブロック DOM に付与する。
 * `itemEls` は `Item.getInstance` で解決済みの `[data-bgi]` だけを渡す（オーバーレイの
 * `value` インデックスと `itemsRef` が同じ並びになる）。
 * @param blockEl - `[data-bge-container]` のブロック要素
 * @param itemEls - アンカーを付与するアイテム要素（出現順）
 * @returns 付与したアイテムアンカー名の一覧（オーバーレイの `position-anchor` 用）
 */
export function applyBlockMenuAnchors(
	blockEl: HTMLElement,
	itemEls: readonly HTMLElement[],
): readonly string[] {
	blockEl.style.setProperty('anchor-name', BGE_BLOCK_MENU_BLOCK_ANCHOR);
	const anchorNames: string[] = [];
	for (const [index, itemEl] of itemEls.entries()) {
		const name = bgeBlockMenuItemAnchorName(index);
		itemEl.style.setProperty('anchor-name', name);
		anchorNames.push(name);
	}
	return anchorNames;
}
