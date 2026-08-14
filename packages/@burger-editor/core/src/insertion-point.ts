import type { BurgerBlock } from './block/block.js';
import type { BurgerEditorEngine } from './engine/engine.js';

import { beginProcessing } from './engine/processing-scope.js';

export class InsertionPoint {
	readonly el: HTMLElement;
	#engine: BurgerEditorEngine;

	#insertTarget: {
		block: BurgerBlock | null;
		toTop: boolean;
	} | null = null;

	constructor(engine: BurgerEditorEngine) {
		this.el = document.createElement('div');
		this.el.dataset.bgeComponent = 'insert-point';
		this.#engine = engine;
	}

	async insert(insertionBlock: BurgerBlock) {
		if (this.#insertTarget === null) {
			throw new Error(`InsertionPoint is not set`);
		}

		if (this.#insertTarget.block === null) {
			this.#engine.content.containerElement.append(this.el);
		} else {
			const targetElement = this.#insertTarget.toTop
				? this.#insertTarget.block.el
				: this.#insertTarget.block.el.nextElementSibling;
			this.#engine.content.containerElement.insertBefore(this.el, targetElement);
		}

		using _processing = beginProcessing(this.#engine);
		if (this.el.parentElement === null) {
			throw new Error(`InsertionPoint is not added to the DOM tree`);
		}
		this.el.append(insertionBlock.el);

		// 演出（マーカーの展開アニメーション）はUI層のhostに委譲する。
		// host が演出を持たない場合は即時完了として扱う
		await this.#engine.content.animateInsertion(this.el);

		// unwrap相当の処理: 親要素の前に要素を挿入し、親要素を削除
		if (this.el.parentNode) {
			this.el.parentNode.insertBefore(insertionBlock.el, this.el);
		}
		this.el.remove();
		this.#engine.save();
		return insertionBlock;
	}

	set(targetBlock: BurgerBlock | null, toTop: boolean) {
		this.#insertTarget = {
			block: targetBlock,
			toTop,
		};
	}
}
