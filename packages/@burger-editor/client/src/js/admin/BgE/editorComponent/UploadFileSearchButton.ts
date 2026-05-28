import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';

import EditorComponent from './EditorComponent.js';

/**
 * 検索ボタン
 */
export default class UploadFileSearchButton extends EditorComponent {
	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		this.$el.on('click', this.#search.bind(this));
	}

	/**
	 * 検索する
	 *
	 * 検索開始をオブザーバへ通知する
	 * @param e イベントオブジェクト
	 */
	#search() {
		BgE.componentObserver.notify('bge-file-search', null);
	}
}
