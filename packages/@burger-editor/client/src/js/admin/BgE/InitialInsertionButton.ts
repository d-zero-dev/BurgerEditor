import * as BgE from '../BgE.js';

import BurgerEditorElement from './BurgerEditorElement.js';

/**
 * コンテンツが空の時に表示される「下に要素を追加」ボタン。
 * 最初のブロック追加導線。ブロックが1つでも存在すれば非表示になる。
 */
export default class InitialInsertionButton extends BurgerEditorElement {
	constructor() {
		super(document.createElement('div'));

		this.node.classList.add('nodata-button');
		this.node.dataset.bge = 'initial-insertion';
		this.node.innerHTML =
			'<button class="insert_after" type="button">下に要素を追加</button>';

		const button = this.node.querySelector('button');
		if (button) {
			button.addEventListener('click', this.#insert.bind(this));
		}
	}

	#insert() {
		if (BgE.editorStatus.isProcessed) {
			return;
		}
		this.hide();
		BgE.insertionPoint.initSet();
		BgE.blockListDialog.open();
	}
}
