import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';

import EditorComponent from './EditorComponent.js';

/**
 * ファイルアップロードメッセンジャークラス
 */
export default class FileUploadMessenger extends EditorComponent {
	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		BgE.componentObserver.on('bge-file-upload-complete', this.#uploadComplete, this);
		BgE.componentObserver.on('bge-file-upload-error', this.#uploadError, this);
		BgE.componentObserver.on('bge-file-delete-success', this.#deleteSuccess, this);
		BgE.componentObserver.on('bge-file-delete-error', this.#deleteError, this);
	}

	/**
	 * ファイル削除エラーのメッセージを表示する
	 *
	 * オブザーバから通知を受けて発火
	 * @param err エラーメッセージ
	 */
	#deleteError(err: string) {
		const $err: JQuery = this.$el;
		$err
			.html(`<p style="color:red;">ファイルの削除に失敗しました（${err}）</p>`)
			.delay(500)
			.slideDown(() => {
				$err.delay(2000).slideUp(() => {
					$err.empty();
				});
			});
	}

	/**
	 * ファイル削除完了のメッセージを表示する
	 *
	 * オブザーバから通知を受けて発火
	 *
	 */
	#deleteSuccess() {
		const $err = this.$el;
		$err
			.html('<p style="color:green;">ファイルの削除が完了しました</p>')
			.delay(500)
			.slideDown(() => {
				$err.delay(2000).slideUp(() => {
					$err.empty();
				});
			});
	}

	/**
	 * アップロード完了のメッセージを表示する
	 *
	 * オブザーバから通知を受けて発火
	 *
	 */
	#uploadComplete() {
		const $err = this.$el;
		$err
			.html('<p style="color:green;">アップロードが完了しました</p>')
			.delay(500)
			.slideDown(() => {
				$err.delay(2000).slideUp(() => {
					$err.empty();
				});
			});
	}

	/**
	 * アップロードエラーのメッセージを表示する
	 *
	 * オブザーバから通知を受けて発火
	 * @param err エラーメッセージ
	 */
	#uploadError(err: string) {
		const $err: JQuery = this.$el;
		$err
			.html(`<p style="color:red;">アップロードに失敗しました（${err}）</p>`)
			.delay(500)
			.slideDown(() => {
				$err.delay(2000).slideUp(() => {
					$err.empty();
				});
			});
	}
}
