import type { BurgerBlock } from './block/block.js';
import type { BurgerEditorEngine } from './engine/engine.js';

import { EditorUI } from './editor-ui.js';

export class InsertionPoint extends EditorUI {
	#engine: BurgerEditorEngine;

	#insertTarget: {
		block: BurgerBlock | null;
		toTop: boolean;
	} | null = null;

	constructor(engine: BurgerEditorEngine) {
		super('insert-point', document.createElement('div'));
		this.#engine = engine;
	}

	insert(insertionBlock: BurgerBlock) {
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

		return new Promise<BurgerBlock>((resolve) => {
			this.#engine.isProcessed = true;
			if (this.el.parentElement === null) {
				throw new Error(`InsertionPoint is not added to the DOM tree`);
			}
			this.el.append(insertionBlock.el);
			this.#engine.content.update();
			this.el.style.height = 'auto';
			this.el.style.height = `${this.el.getBoundingClientRect().height}px`;

			// 要素を非表示にする
			this.el.style.display = 'none';

			// アニメーションの準備
			this.el.style.overflow = 'hidden';
			this.el.style.transition = 'height 0.4s ease';
			this.el.style.height = '0';

			// 表示してアニメーション開始
			this.el.style.display = '';

			// 次のフレームでアニメーション実行（表示状態に）
			requestAnimationFrame(() => {
				this.el.style.height = `${this.el.scrollHeight}px`;

				// アニメーション完了後の処理
				this.el.addEventListener(
					'transitionend',
					() => {
						// unwrap相当の処理: 親要素の前に要素を挿入し、親要素を削除
						const parent = this.el;
						const child = insertionBlock.el;

						if (parent.parentNode) {
							parent.parentNode.insertBefore(child, parent);
						}

						this.el.remove();
						this.#engine.save();
						this.#engine.isProcessed = false;
						resolve(insertionBlock);
					},
					{ once: true },
				);
			});
		});
	}

	set(targetBlock: BurgerBlock | null, toTop: boolean) {
		this.#insertTarget = {
			block: targetBlock,
			toTop,
		};
	}
}
