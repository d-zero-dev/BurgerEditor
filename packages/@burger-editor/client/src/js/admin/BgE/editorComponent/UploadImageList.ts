import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';

import UploadFileList from './UploadFileList.js';

/**
 * アップロード画像リスト要素
 */
export default class UploadImageList extends UploadFileList {
	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		this.listURL = BgE.config.api ? BgE.config.api.imgList : null;
	}
}
