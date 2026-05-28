import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';

import UploadImageList from './UploadImageList.js';

/**
 * 複数選択対応のアップロード画像リスト要素
 */
export default class UploadImageListMultiSelect extends UploadImageList {
	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
	}

	/**
	 * ファイルクリック時の選択処理（単一選択のみ、パス設定を省略）
	 * @param e
	 */
	protected override _fileClick(e: JQuery.MouseEventBase) {
		const $this = $(e.currentTarget);
		// selectedクラス切り替え
		const src = $this.attr('data-org-src') || '';
		const isEmpty = $this.attr('data-bge-empty') === '1';
		this.editorDialog.$el.find('.bg-upload-file').removeClass('selected');
		$this.addClass('selected');
		BgE.componentObserver.notify('bge-file-select', { path: src, isEmpty });
		return false;
	}

	/**
	 * ファイルダブルクリック時にマルチフィールドへ追加する
	 * @param e
	 */
	protected override _fileDbClick(e: JQuery.MouseEventBase) {
		this._fileClick(e);
		const $this = $(e.currentTarget);
		const src = $this.attr('data-org-src') || '';
		const isEmpty = $this.attr('data-bge-empty') === '1';
		BgE.componentObserver.notify('bge-multi-field-add', { path: src, isEmpty });
		return false;
	}

	/**
	 * ファイルを選択する
	 * @param _
	 * @param __
	 * @param isEmpty
	 */
	protected override _select(_: string, __: number, isEmpty: boolean) {
		const $editorDialog = this.editorDialog.$el;
		$editorDialog.find('[name="bge-empty"]').val(isEmpty ? '1' : '0');
	}

	/**
	 * 初期化が終わったあとに処理を実行
	 */
	override async afterInit() {
		await super.afterInit();
		// 選択されている画像のあるページを最初に移動
		this._changePageTab(1);
		this.editorDialog.$el.find('.bg-upload-file').removeClass('selected');
	}
}
