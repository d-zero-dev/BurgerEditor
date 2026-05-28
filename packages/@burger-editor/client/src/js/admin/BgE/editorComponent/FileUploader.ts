import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import semver from 'semver';

import * as BgE from '../../BgE.js';

import EditorComponent from './EditorComponent.js';

/**
 * ファイルアップロードAPIのレスポンス
 */
export interface IFileUploaderResponse {
	error: boolean;
	data: IUploadFileInfo[];
	pagination: IPaginationInfo;
}

/**
 * アップロードしたファイルの情報
 */
export interface IUploadFileInfo {
	/**
	 * ファイルID
	 * @deprecated
	 */
	fileId: string;

	/**
	 * @since 5.0.0
	 */
	fileid: string;

	/**
	 * タイムスタンプ
	 */
	filetime: string;

	/**
	 * ファイル名
	 */
	name: string;

	/**
	 * オリジナルファイル容量
	 */
	original: number;

	/**
	 * ファイル容量
	 */
	size: number;

	/**
	 * サムネイル画像のファイル容量
	 */
	thumb: number;

	/**
	 * ファイルのURL
	 */
	url: string;
}

/**
 * アップロードファイルリストのページネーション情報
 */
export interface IPaginationInfo {
	/**
	 * ページネーションの最大ページ数
	 */
	pageMaxNumber: number;

	/**
	 * 現在表示ページ番号
	 */
	currentPageNumber: string;

	/**
	 * 選択済みファイルID
	 */
	selectedFileId: string;
}

/**
 * ファイルアップロードのHTTP通信を担うコア処理
 */
class UploaderCore {
	#name: string;
	#url: string;

	constructor(name: string, url: string) {
		this.#name = name;
		this.#url = url;
	}

	/**
	 * ファイルをサーバへ送信する
	 * @param file
	 * @param bcToken
	 */
	send(file: File, bcToken?: string) {
		const fd = new FormData();
		fd.append(this.#name, file, file.name);
		if (bcToken) {
			fd.append('_csrfToken', bcToken);
		}
		const xhr = new XMLHttpRequest();
		xhr.addEventListener('load', this.#fileUploaded.bind(this), false);
		xhr.addEventListener('error', this.#fileUploadError.bind(this), false);
		xhr.open('POST', this.#url, true);
		xhr.send(fd);
	}

	#fileUploaded(e: ProgressEvent) {
		if (!e.target) {
			return;
		}
		const resultData: IFileUploaderResponse = JSON.parse(
			(e.target as XMLHttpRequest).responseText,
		);
		if (resultData.error) {
			// アップロード失敗
			BgE.componentObserver.notify('bge-file-upload-error', 'Server Error');
		} else {
			// アップロード成功
			BgE.componentObserver.notify('bge-file-upload-complete', resultData);
		}
	}

	#fileUploadError() {
		BgE.componentObserver.notify('bge-file-upload-error', 'XHR Error');
	}
}

/**
 * ファイルアップロード要素
 */
export default class FileUploader extends EditorComponent {
	/**
	 * コンテナ
	 */
	$container: JQuery;

	/**
	 * ドロップエリア
	 */
	$drop: JQuery;

	/**
	 * アップロードをリクエストするAPIのURL
	 */
	uploadURL: string | null;

	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);

		this.$container = $('<div class="bge-file-uploader-container" />');
		this.$drop = $('<div class="bge-file-uploader-drop-area" />');

		this.$el.wrap(this.$drop);
		this.$drop.wrap(this.$container);

		this.$el.on('change', this.#change.bind(this));
		this.$drop.on('drop', this.#drop.bind(this));
		this.uploadURL = BgE.config.api ? BgE.config.api.fileUpload : null;

		this.editorDialog.$el
			.on('dragenter', (e) => {
				this.editorDialog.$el.addClass('bge-state-drag');
				e.preventDefault();
			})
			.on('dragover', (e) => {
				e.preventDefault();
			})
			.on('drop', this.#drop.bind(this))
			.on('dragend mouseleave mouseenter', (e) => {
				this.editorDialog.$el.removeClass('bge-state-drag');
				e.stopPropagation();
			});
	}

	#change(e: JQueryEventObject) {
		const input = e.originalEvent.target as HTMLInputElement;
		const files = input.files;
		if (files) {
			this.#upload(files);
		}
	}

	#drop(e: JQueryEventObject) {
		const event = e.originalEvent as DragEvent;
		if (event.dataTransfer) {
			const files = event.dataTransfer.files;
			this.#upload(files);
		}
		this.editorDialog.$el.removeClass('bge-state-drag');
		e.preventDefault();
	}

	#sendFile(uploader: UploaderCore, file: File) {
		if (semver.lt(BgE.config.cmsVersion!, '5.0.0')) {
			uploader.send(file);
			return;
		}

		// 5系以降の場合、CSRFトークンを取得してからアップロードする
		const xhr = new XMLHttpRequest();
		const baseUrl = $.bcUtil?.baseUrl || '';
		xhr.open('GET', `${baseUrl}/baser-core/bc_form/get_token?requestview=false`);
		xhr.addEventListener('load', () => {
			if (xhr.readyState === 4 && xhr.status === 200) {
				uploader.send(file, xhr.responseText);
			}
		});
		xhr.send();
	}

	/**
	 * アップロードする
	 *
	 * 複数のファイルに対応可能だが、
	 * 受け取る側のシステムが未対応のため、ファイルの数だけリクエストして
	 * ファイルの数だけレスポンスをさばく必要がある
	 * @param files
	 */
	#upload(files: FileList) {
		if (this.uploadURL) {
			const name = this.$el.attr('name') || `${this.$el.data('post-name')}`;
			const uploader = new UploaderCore(name, this.uploadURL);

			for (const file of files) {
				if (this._fileValidation(file)) {
					this.#sendFile(uploader, file);
				}
			}
		} else {
			// eslint-disable-next-line no-console
			console.warn('アップロードAPIのパスが不明です。');
		}
	}

	/**
	 * アップロード前のファイルバリデーション
	 * @param file
	 */
	protected _fileValidation(file: File) {
		return !!file;
	}
}
