import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';

import UploadFileDeleter from './UploadFileDeleter.js';

/**
 * 画像削除要素
 */
export default class UploadImageDeleter extends UploadFileDeleter {
	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		this.deleteURL = BgE.config.api ? BgE.config.api.imgDelete : null;
	}
}
