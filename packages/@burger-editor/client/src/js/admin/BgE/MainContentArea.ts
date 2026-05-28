import type DraftContentArea from './DraftContentArea.js';

import ContentArea from './ContentArea.js';

/**
 * 本稿（公開中コンテンツ）の編集領域。初期状態で表示。
 */
export default class MainContentArea extends ContentArea {
	/**
	 * コンストラクタ
	 * @param node HTML要素
	 * @param storageNode コンテンツの内容を格納するinput要素
	 */
	constructor(node: HTMLElement | null, storageNode: HTMLInputElement) {
		super(node, storageNode, 'bge-main-content');
		this.show();
	}

	/**
	 * 内容をコピーする
	 * @param contentArea
	 */
	override copyTo(contentArea: DraftContentArea) {
		super.copyTo(contentArea);
	}
}
