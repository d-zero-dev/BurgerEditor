import type BurgerBlock from './BgE/BurgerBlock.js';

/**
 * 現在選択中のブロックを追跡するシングルトン。
 * BlockMenu・BlockConfigDialog・コピー/削除/移動など複数箇所が「今のブロック」を参照するため、
 * 状態を1箇所に集約する。setCurrentBlock の返り値でブロック変更を検知し、
 * mousemove 時の不要な DOM 更新を抑制する。
 */
export default class BurgerEditor {
	#currentBlock: BurgerBlock | null = null;

	/**
	 * 選択中ブロックをクリアする
	 */
	clearCurrentBlock() {
		this.#currentBlock = null;
	}

	/**
	 * 選択中のブロックを取得する
	 * @returns 選択中のブロック（未選択時は null）
	 */
	getCurrentBlock() {
		if (!this.#currentBlock) {
			// eslint-disable-next-line no-console
			console.warn('block is unselected.');
		}
		return this.#currentBlock;
	}

	/**
	 * ブロックが選択されているか
	 * @returns 選択中の場合 true
	 */
	isSetBlock() {
		return !!this.#currentBlock;
	}

	/**
	 * 選択中のブロックを設定する
	 * @param block 設定するブロック
	 * @returns ブロックが変更された場合 true
	 */
	setCurrentBlock(block: BurgerBlock) {
		let isChanged = true;
		if (this.#currentBlock) {
			isChanged = !this.#currentBlock.is(block);
		}
		this.#currentBlock = block;
		return isChanged;
	}
}
