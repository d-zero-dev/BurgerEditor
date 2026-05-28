import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import semver from 'semver';

import * as BgE from '../../BgE.js';

import EditorComponent from './EditorComponent.js';

/**
 * ファイル削除要素
 */
export default class UploadFileDeleter extends EditorComponent {
	/**
	 * ファイル削除をリクエストするAPIのURL
	 */
	deleteURL: string | null;

	/**
	 * 削除するファイルのパス
	 */
	#deletePath: string | null = null;

	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		this.$el.on('click', this.#deletes.bind(this));
		this.deleteURL = BgE.config.api ? BgE.config.api.fileDelete : null;
		BgE.componentObserver.on('bge-file-select', this.#onSelect, this);
	}

	/**
	 * ファイルを削除する
	 *
	 * 削除結果はオブザーバへ通知される
	 * @param e イベントオブジェクト
	 */
	async #deletes() {
		if (this.deleteURL) {
			const $editorArea = this.$el.parents('#ContentsEditArea');
			const deleteFileUrl = this.#deletePath;

			if (!deleteFileUrl) {
				alert('ファイルが選択されていません。');
				return;
			}
			if (
				!confirm(
					'ファイルを削除します。よろしいですか?\n※ 記事にて利用中のファイルがあった場合 表示されなくなります',
				)
			) {
				return;
			}

			let csrfToken: string | undefined;
			if (semver.gte(BgE.config.cmsVersion!, '5.0.0')) {
				await new Promise<void>((res) => {
					$.bcToken?.check(() => {
						res();
					});
				});
				csrfToken = $.bcToken?.key ?? undefined;
			}

			await $.ajax(this.deleteURL, {
				cache: false,
				type: 'POST',
				data: {
					file: deleteFileUrl,
					_csrfToken: csrfToken,
				},
				success: (res: string) => {
					switch (res) {
						// 成功
						case '1': {
							$editorArea.find('div.selected').remove();
							$editorArea.find(`[name=bge-path][value="${deleteFileUrl}"]`).val('');
							// 通知
							BgE.componentObserver.notify('bge-file-delete-success', null);
							break;
						}
						default: {
							// 通知
							BgE.componentObserver.notify('bge-file-delete-error', '');
						}
					}
				},
			});
		} else {
			// eslint-disable-next-line no-console
			console.warn('削除APIのパスが不明です。');
		}
	}

	#onSelect({ path }: { path: string }) {
		this.#deletePath = path || null;
	}
}
