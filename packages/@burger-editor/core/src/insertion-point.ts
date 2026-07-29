import type { BurgerBlock } from './block/block.js';
import type { BurgerEditorEngine } from './engine/engine.js';

import { EditorUI } from './editor-ui.js';

const INSERTION_ANIMATION_DURATION_MS = 400;

export class InsertionPoint extends EditorUI {
	#animationDurationMs: number;
	#engine: BurgerEditorEngine;

	#insertTarget: {
		block: BurgerBlock | null;
		toTop: boolean;
	} | null = null;

	constructor(
		engine: BurgerEditorEngine,
		animationDurationMs: number = INSERTION_ANIMATION_DURATION_MS,
	) {
		super('insert-point', document.createElement('div'));
		this.#engine = engine;
		this.#animationDurationMs = animationDurationMs;
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
			const targetHeight = this.el.getBoundingClientRect().height;
			this.el.style.overflow = 'hidden';

			// unwrap相当の処理: 親要素の前に要素を挿入し、親要素を削除
			const finish = () => {
				const parent = this.el;
				const child = insertionBlock.el;

				if (parent.parentNode) {
					parent.parentNode.insertBefore(child, parent);
				}

				this.el.remove();
				this.#engine.save();
				this.#engine.isProcessed = false;
				resolve(insertionBlock);
			};

			// CSSトランジション + transitionend は、トランジション時間が0の場合
			// （prefers-reduced-motion 等）にイベントが発火せず isProcessed が
			// 固着するため使わない。Web Animations API の finished は duration
			// に関わらず必ず解決するので、それを完了検知に使う
			const reducedMotion = window.matchMedia?.(
				'(prefers-reduced-motion: reduce)',
			).matches;
			const animation = this.el.animate(
				[{ height: '0px' }, { height: `${targetHeight}px` }],
				{ duration: reducedMotion ? 0 : this.#animationDurationMs, easing: 'ease' },
			);
			animation.finished.then(finish, finish);
		});
	}

	set(targetBlock: BurgerBlock | null, toTop: boolean) {
		this.#insertTarget = {
			block: targetBlock,
			toTop,
		};
	}
}
