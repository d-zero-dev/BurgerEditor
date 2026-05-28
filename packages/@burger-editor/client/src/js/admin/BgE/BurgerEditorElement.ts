/**
 * DOM 要素と表示状態（show/hide）を管理する基底クラス。
 * BlockMenu・InsertionPoint・InitialInsertionButton・ContentArea が継承する。
 */
abstract class BurgerEditorElement {
	/**
	 * HTML要素
	 *
	 */
	#node: HTMLElement;

	/**
	 * 表示状態
	 *
	 */
	#visible = false;

	/**
	 * HTML要素
	 */
	get node() {
		return this.#node;
	}

	/**
	 * コンストラクタ
	 * @param node HTML要素
	 */
	constructor(node: HTMLElement | null) {
		if (!node) {
			throw new Error('要素の取得に失敗しました。');
		}
		this.#node = node;
	}

	/**
	 * HTML要素の取得
	 *
	 */
	getNode(): HTMLElement {
		return this.#node;
	}

	/**
	 * 隠す
	 */
	hide() {
		this.#node.hidden = true;
		this.#visible = false;
	}

	/**
	 * 表示する
	 */
	show() {
		this.#node.hidden = false;
		this.#visible = true;
	}

	/**
	 * 表示状態
	 */
	visible() {
		return this.#visible;
	}
}

export default BurgerEditorElement;
