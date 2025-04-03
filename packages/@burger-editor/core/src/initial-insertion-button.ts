import type { BurgerEditorEngine } from './engine/engine.js';
import type { InsertionPoint } from './insertion-point.js';

import { EditorUI } from './editor-ui.js';

export class InitialInsertionButton extends EditorUI {
	#afterInsert: () => void;
	#engine: BurgerEditorEngine;
	#insertionPoint: InsertionPoint;

	constructor(
		insertionPoint: InsertionPoint,
		engine: BurgerEditorEngine,
		afterInsert: () => void,
	) {
		super('initial-insertion', document.createElement('div'));
		this.#insertionPoint = insertionPoint;
		this.#engine = engine;
		this.#afterInsert = afterInsert;

		this.el.innerHTML =
			'<button class="insert_after" type="button">下に要素を追加</button>';

		const button = this.el.querySelector('button');
		if (button) {
			button.addEventListener('click', this.#insert.bind(this));
		}
	}

	#insert() {
		if (this.#engine.isProcessed) {
			return;
		}
		this.hide();
		this.#insertionPoint.set(null, false);
		this.#afterInsert();
	}
}
