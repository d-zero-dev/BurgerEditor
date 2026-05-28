import type {
	IFileUploaderResponse,
	IUploadFileInfo,
	IPaginationInfo,
} from './FileUploader.js';
import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';
import Util from '../Util.js';

import EditorComponent from './EditorComponent.js';

/**
 * アップロードファイルリスト要素
 */
export default class UploadFileList extends EditorComponent {
	/**
	 * 現在のページ番号
	 */
	currentPageNo = 1;
	/**
	 * ファイルリストを取得するリクエストURL
	 */
	listURL: string | null = BgE.config.api ? BgE.config.api.fileList : null;

	/**
	 * 最大ページ数
	 */
	pageMaxNumber = 0;
	/**
	 * ファイルリストの1ページの件数
	 */
	pageSplitCount = 10;

	/**
	 * 検索文字列
	 */
	searchWord = '';

	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		const $editorDialog = editorDialog.$el;
		BgE.componentObserver.on('bge-file-upload-complete', this.#uploadComplete, this);
		BgE.componentObserver.on('bge-file-listup', this.#listup, this);
		BgE.componentObserver.on('bge-file-delete-success', this.#deleteSuccess, this);
		// 画像要素にイベントを登録（イベント移譲）
		$editorDialog.on('click', '.bg-upload-file', (e) => this._fileClick(e));
		$editorDialog.on('dblclick', '.bg-upload-file', (e) => this._fileDbClick(e));
		$editorDialog.on('click', '[data-bge-pagelink]', async (e) => {
			// ページネーションボタンにページ切り替えイベントを登録
			const $this = $(e.currentTarget);
			const targetPage = Number.parseFloat($this.attr('data-bge-pagelink') || '') || 0;
			await this.#loadList(this.searchWord, targetPage);
			return false;
		});
		$editorDialog.on('click', '.page-ctrl button', async (e) => {
			// ページネーションボタンにページ切り替えイベントを登録
			const $this = $(e.currentTarget);
			const vector = Number.parseFloat($this.attr('data-bge-page-vector') || '') || 0;
			await this.#loadList(this.searchWord, this.currentPageNo + vector);
			return false;
		});
	}

	/**
	 * ファイル削除後の処理
	 *
	 * オブザーバからファイル削除完了の通知を受けた時に
	 * リストを更新する
	 */
	#deleteSuccess() {
		// 表示ページ位置は維持して再読込
		void this.#loadList('', this.currentPageNo);
	}

	#generatePagination(currentPageNo: number) {
		const paginationHtml: string[] = [
			`
			<div
				class="pagination"
				data-bge-page-index="${currentPageNo - 1}"
				data-bge-page-last-index="${this.pageMaxNumber - currentPageNo}"
				data-bge-page-max="${this.pageMaxNumber}">`,
			`
			<div class="page-ctrl page-ctrl--prev"}>
				<button ${currentPageNo === 1 ? 'disabled' : ''} type="button" data-bge-page-vector="-1">前</button>
			</div>`,
			'<div class="page-numbers">',
		];
		for (let i = 1; i <= this.pageMaxNumber; i++) {
			paginationHtml.push(`
				<button
					type="button"
					class="number"
					data-bge-current="${+(currentPageNo === i)}"
					data-bge-page-dist="${Math.abs(currentPageNo - i)}"
					data-bge-pagelink="${i}"
					data-bge-page-index="${i - 1}"
					data-bge-page-last-index="${this.pageMaxNumber - i}"
				>
					${i}
				</button>`);
		}
		paginationHtml.push(
			'</div>',
			`
			<div class="page-ctrl page-ctrl--next">
				<button ${currentPageNo === this.pageMaxNumber ? 'disabled' : ''} type="button" data-bge-page-vector="1">次</button>
			</div>`,
			'</div>',
		);
		return paginationHtml.join('').replaceAll('\t', '');
	}

	/**
	 * ファイルリストを取得する
	 * @param searchWord オブザーバから通知された検索キーワード
	 */
	#listup(searchWord: string = '') {
		void this.#loadList(searchWord, 1);
	}

	/**
	 * リストをロードする
	 * @param filterWord フィルタリングキーワード
	 * @param targetPage 取得するページ番号（0：指定無し、1〜：該当ページ）
	 * @param selectedFilePath 選択済みファイルパス
	 */
	#loadList(
		filterWord: string = '',
		targetPage: number = 0,
		selectedFilePath: string = '',
	) {
		// 選択済み画像パスを取得
		let filePath: string = '';
		if (selectedFilePath == '') {
			const $editorArea = this.$el.parents('#ContentsEditArea');
			const $inputTarget = $editorArea.find('[name=bge-path]');
			filePath = $inputTarget.val() as string;
		} else {
			filePath = selectedFilePath;
		}

		return new Promise<void>((resolve, reject) => {
			if (this.listURL) {
				void $.ajax(this.listURL, {
					cache: false,
					type: 'GET',
					data: {
						word: filterWord,
						page: targetPage,
						selected: filePath,
					},
					dataType: 'json',
					success: (res: IFileUploaderResponse) => {
						this.searchWord = filterWord;
						this.#render(res.data, res.pagination);
						resolve();
					},
				});
			} else {
				// eslint-disable-next-line no-console
				console.warn('ファイルリストAPIのパスが不明です。');
				reject();
			}
		});
	}

	/**
	 * 取得したリストを出力する
	 * @param fileList ファイル情報リスト
	 * @param paginationInfo ページネーション情報
	 */
	#render(fileList: IUploadFileInfo[], paginationInfo: IPaginationInfo) {
		// DOMをリセット
		this.$el.children().remove();

		// ページング処理
		this.pageMaxNumber = paginationInfo.pageMaxNumber;
		const fileListHtml: string[] = [
			`<div data-bge-page="${paginationInfo.currentPageNumber}">`,
		];

		let selectedFileIndex: number = -1;

		$.each(fileList, (i, fileInfo) => {
			const isEmpty =
				i === 0 &&
				(fileInfo.fileId === '' || fileInfo.fileid === '') &&
				fileInfo.size === 0;

			const isSelected = fileInfo.fileId === paginationInfo.selectedFileId;
			if (isSelected) {
				selectedFileIndex = i;
			}

			fileListHtml.push(
				`<div class="bg-upload-file ${isSelected ? 'selected' : ''}" data-org-src="${fileInfo.url}" data-file-size="${
					fileInfo.size
				}" data-bge-empty="${isEmpty ? '1' : '0'}">
					<div class="file-box ${isEmpty ? 'file-box--no-image' : ''}" data-org-src="${fileInfo.url}"></div>
					<div class="file-info">
						<p><span class="file-info__label">ID</span><span class="bg-upload-id">${fileInfo.fileId ?? fileInfo.fileid}</span></p>
						<p><span class="file-info__label">名称</span><span class="bg-upload-filename" style="word-wrap: break-word;">${
							fileInfo.name
						}</span></p>
						<p><span class="file-info__label">更新</span>${fileInfo.filetime}</p>
						<p><span class="file-info__label">サイズ</span>${Util.formatByteSize(fileInfo.size)}</p>
					</div>
				</div>`,
			);
		});

		fileListHtml.push('</div>');

		this.$el.append(fileListHtml.join(''));

		// 選択されている画像のページ
		const targetPage = Number(paginationInfo.currentPageNumber);

		// 画像を描画
		this.$el.find('.file-box[data-org-src]').each((_, el) => {
			const $this = $(el);
			const src = $this.attr('data-org-src') || '';
			if (!$this.hasClass('file-box--no-image')) {
				$this.css('background-image', `url("${encodeURI(src)}")`);
			}
		});

		// 選択済み画像があれば選択する
		if (selectedFileIndex >= 0) {
			const selectedFile = fileList[selectedFileIndex];
			if (selectedFile && selectedFile.url) {
				this._select(selectedFile.url, selectedFile.size || 0, false);
			}
		}

		// 選択されている画像のあるページに切り替え
		this._changePageTab(targetPage);
	}

	/**
	 * アップロード完了時の処理
	 *
	 * オブザーバからアップロード完了の通知を受けた時に
	 * リストにファイルを追加する
	 * @param resultData ファイルリスト取得APIのレスポンス
	 */
	#uploadComplete(resultData: IFileUploaderResponse) {
		const fileList = resultData.data;
		const pagination = resultData.pagination;

		// 直前のアップロードデータ
		let info = fileList[0];
		if (info?.fileId === '' && info?.size === 0) {
			info = fileList[1];
		}
		if (!info) {
			throw new Error('アップロード情報が不正です。');
		}

		// 結果を描画
		this.#render(fileList, pagination);
	}

	/**
	 * ページネーションのタブを切り替える
	 * @param pageNo ページ番号
	 * @param distPageNo
	 */
	protected _changePageTab(distPageNo: number) {
		// パジネーション
		$('#ContentsEditArea .pagination').remove();
		if (this.pageMaxNumber > 1) {
			const paginationHtml = this.#generatePagination(distPageNo);
			this.$el.before(paginationHtml);
		}
		$('[data-bge-pagelink] a').removeClass('current');
		$(`[data-bge-pagelink=${distPageNo}] a`).addClass('current');
		$('[data-bge-page]').hide();
		const $currentPage = $(`[data-bge-page=${distPageNo}]`);
		const $selected = $currentPage.find('.bg-upload-file.selected');
		$currentPage.show();
		if ($selected.length > 0) {
			// $.fn.position メソッドの結果を正確にするためスクロール位置をリセット
			this.node.scrollTop = 0;
			// スクロール位置を移動
			this.node.scrollTop = $selected.position().top - 50;
		}
		this.currentPageNo = distPageNo;
	}

	/**
	 * ファイルクリック時の選択処理
	 * @param e
	 */
	protected _fileClick(e: JQuery.MouseEventBase) {
		const $this = $(e.currentTarget);
		const src = $this.attr('data-org-src') || '';
		const fileSize = Number.parseInt($this.attr('data-file-size') || '', 10) || 0;
		const isEmpty = $this.attr('data-bge-empty') === '1';
		this._select(src, fileSize, isEmpty);
		// selectedクラス切り替え
		this.editorDialog.$el.find('.bg-upload-file').removeClass('selected');
		$this.addClass('selected');
		BgE.componentObserver.notify('bge-file-select', { path: src, isEmpty });
		return false;
	}

	/**
	 * ファイルダブルクリック時の選択・確定処理
	 * @param e
	 */
	protected _fileDbClick(e: JQuery.MouseEventBase) {
		this._fileClick(e);
		// 完了ボタンクリックを発火
		$('.ui-dialog-buttonset button.last').trigger('click');
		return false;
	}

	/**
	 * ファイルを選択する
	 * @param path
	 * @param fileSize
	 * @param isEmpty
	 */
	protected _select(path: string, fileSize: number, isEmpty: boolean) {
		const $editorDialog = this.editorDialog.$el;
		$editorDialog.find('[name=bge-path]').val(path);
		$editorDialog.find('[name="bge-formated-size"]').val(Util.formatByteSize(fileSize));
		$editorDialog.find('[name="bge-size"]').val(`${fileSize}`);
		$editorDialog.find('[name="bge-empty"]').val(isEmpty ? '1' : '0');
	}

	/**
	 * TypeEditorDialog側の初期値読込が終わるまで一定時間待機する
	 */
	protected async _waitEditorImported() {
		const maxWaitNumber = 10;
		const sleep = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
		const $editorArea = this.$el.parents('#ContentsEditArea');
		const $imported = $editorArea.find('[name=bge-imported]');

		// [name=bge-imported]要素が存在かつvalueが空の場合は一定時間待機
		if ($imported.length > 0 && $imported.val() != 1) {
			for (let i: number = 0; i < maxWaitNumber; i++) {
				await sleep();
				if ($imported.val() == 1) break;
			}
		}
	}
	/**
	 * 初期化が終わったあとに処理を実行
	 */
	override async afterInit() {
		// ファイルリスト取得に必要な値を読み込むまで待機
		await this._waitEditorImported();

		// 画像をロードしてリストアップ
		await this.#loadList('');
	}
}
