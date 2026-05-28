import type BurgerBlock from './BurgerBlock.js';

import * as BgE from '../BgE.js';

import BurgerEditorElement from './BurgerEditorElement.js';

/**
 * ブロック挿入位置を表すラッパー要素。
 * 新規ブロックをこの要素内に配置し、slideDown アニメーション後に unwrap して展開する。
 * アニメーション中の DOM 位置を安定させるための一時コンテナ。
 */
export default class InsertionPoint extends BurgerEditorElement {
	constructor() {
		super(document.createElement('div'));
		this.node.dataset.bge = 'insertion-point';
	}

	/**
	 * コンテンツ領域の末尾に挿入ポイントを配置する
	 */
	initSet() {
		BgE.currentContentArea.containerElement.append(this.node);
	}

	/**
	 * ブロックを挿入ポイントに配置し、slideDown アニメーション後に展開する
	 * @param insertionBlock 挿入するブロック
	 * @returns アニメーション完了時に解決するPromise
	 */
	insert(insertionBlock: BurgerBlock) {
		return new Promise<BurgerBlock>((resolve) => {
			BgE.editorStatus.isProcessed = true;
			this.node.append(insertionBlock.node);
			BgE.currentContentArea.update();
			this.node.style.height = 'auto';
			this.node.style.height = `${this.node.getBoundingClientRect().height}px`;
			const $addPoint = $(this.node);
			void $addPoint
				.hide()
				.slideDown()
				.promise()
				.done(() => {
					$(insertionBlock.node).unwrap(); // unwrapメソッドでthis.nodeはnullにならない
					BgE.editorStatus.isProcessed = false;
					BgE.save();
					resolve(insertionBlock);
				});
		});
	}

	/**
	 * 対象ブロックの前後に挿入ポイントを配置する
	 * @param targetBlock 基準となるブロック
	 * @param after true なら後ろ、false なら前に配置
	 */
	set(targetBlock: BurgerBlock, after: boolean = true) {
		const targetElement: HTMLElement = targetBlock.node;
		if (after) {
			BgE.currentContentArea.containerElement.insertBefore(
				this.node,
				targetElement.nextSibling,
			);
		} else {
			BgE.currentContentArea.containerElement.insertBefore(this.node, targetElement);
		}
	}

	/**
	 * 空の挿入ポイントを DOM から除去する
	 */
	unset() {
		if (this.node.innerHTML === '') {
			if (this.node.remove) {
				this.node.remove();
			} else {
				if (this.node.parentNode) {
					this.node.remove();
				}
			}
		}
	}
}
