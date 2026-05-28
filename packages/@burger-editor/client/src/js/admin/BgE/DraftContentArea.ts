import type MainContentArea from './MainContentArea.js';

import ContentArea from './ContentArea.js';

/**
 * 下書き（未公開コンテンツ）の編集領域。初期状態で非表示。存在しない場合もある。
 */
export default class DraftContentArea extends ContentArea {
	/**
	 * コンストラクタ
	 * @param node HTML要素
	 * @param storageNode コンテンツの内容を格納するinput要素
	 */
	constructor(node: HTMLElement | null, storageNode: HTMLInputElement) {
		super(node, storageNode, 'bge-draft-content');
		this.hide();
	}

	/**
	 * 内容をコピーする
	 * @param contentArea
	 */
	override copyTo(contentArea: MainContentArea) {
		super.copyTo(contentArea);
	}
}
