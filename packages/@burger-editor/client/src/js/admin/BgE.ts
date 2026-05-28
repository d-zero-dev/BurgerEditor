/**
 * エディタ全体のグルーコード。
 * 各クラスの初期化順序制御・共有状態の保持・Addon init.js からのアクセスポイント。
 * window.BgE として公開され、Addon 側の `BgE.registerTypeModule()` 呼び出しを受ける。
 *
 * 設定は PHP が `<script type="application/json">` で HTML に埋め込み、
 * getSettings() で同期的にパースする（Ajax 不要で DOM Ready 直後に初期化完了できる）。
 * @module
 */
import type { IBurgerTypeModuleConstructorOption } from './BgE/BurgerTypeModule.js';
import type ContentArea from './BgE/ContentArea.js';

import semver from 'semver';

import BurgerTypeModule from './BgE/BurgerTypeModule.js';
import DraftContentArea from './BgE/DraftContentArea.js';
import InsertionPoint from './BgE/InsertionPoint.js';
import MainContentArea from './BgE/MainContentArea.js';
import ComponentObserver from './BgE/editorComponent/ComponentObserver.js';
import FileUploadMessenger from './BgE/editorComponent/FileUploadMessenger.js';
import FileUploader from './BgE/editorComponent/FileUploader.js';
import ImageUploader from './BgE/editorComponent/ImageUploader.js';
import MultiFieldSelection from './BgE/editorComponent/MultiFieldSelection.js';
import MultiFieldSelector from './BgE/editorComponent/MultiFieldSelector.js';
import UploadFileDeleter from './BgE/editorComponent/UploadFileDeleter.js';
import UploadFileList from './BgE/editorComponent/UploadFileList.js';
import UploadFileSearchButton from './BgE/editorComponent/UploadFileSearchButton.js';
import UploadFileSearchForm from './BgE/editorComponent/UploadFileSearchForm.js';
import UploadImageDeleter from './BgE/editorComponent/UploadImageDeleter.js';
import UploadImageList from './BgE/editorComponent/UploadImageList.js';
import UploadImageListMultiSelect from './BgE/editorComponent/UploadImageListMultiSelect.js';
import BlockConfigDialog from './BgE/editorDialog/BlockConfigDialog.js';
import BlockListDialog from './BgE/editorDialog/BlockListDialog.js';
import TypeEditorDialog from './BgE/editorDialog/TypeEditorDialog.js';
import BurgerEditor from './BurgerEditor.js';

/**
 * バージョン
 */
export const version = '3.4.0';

/**
 * frozen-patty が data-bge 属性から抽出する値のプリミティブ型。
 * typeConvert オプションにより string 以外にも変換される。
 */
export type IBurgerTypeContentDatum = string | number | boolean | null | undefined;

/**
 * 1つのタイプが保持する全データの KV マップ。
 * キー名は data-bge 属性の定義名に対応。配列値は data-bge-list 内のリスト要素から生成。
 */
export interface IBurgerTypeContentData {
	[key: string]: IBurgerTypeContentDatum | IBurgerTypeContentDatum[];
}

/**
 * フォーム要素から抽出した中間表現。
 * Util.dataOptimize() で同名キーの isArray=true な値を配列にまとめて IBurgerTypeContentData にする。
 */
export interface IBurgerTypeContentRawMataDatum {
	key: keyof IBurgerTypeContentData;
	datum: IBurgerTypeContentDatum;
	isArray: boolean;
}

/**
 * 設定情報のインターフェイス
 */
export interface IBurgerEdintorConfig {
	cmsVersion?: string;
	api?: IBurgerEdintorConfigAPIs;
	utility?: IBurgerEdintorConfigUtility;
	blockClassOption?: Record<string, Record<string, string>>;
	ckeditorConfig?: Record<string, Record<string, unknown>>;

	/**
	 * タイプのバージョンリスト
	 */
	types?: {
		[typeName: string]: {
			version: string;
			tmpl: string;
		};
	};
	flag?: IBurgerEditorConfigFlag;

	/**
	 * `Config/setting.php`ファイルの`"Bge"`の情報
	 */
	setting?: {
		fileShare: boolean;
		autoWrapper: boolean;
		wrapperClass?: string;
		defaultImagePopup: boolean;
		publishTimer: boolean;
		noResizeExtension: string[];
		uploadImageSize: {
			imgSizeWidthMax: number;
			imgSizeWidthDefault: number;
			imgSizeWidthSmall: number;
		};
		uploadImageDataSize: number;
	};
}

export interface IBurgerEdintorConfigAPIs {
	/**
	 * 画像タイプで取得する画像リストのリクエストURL
	 */
	imgList: string;

	/**
	 * 画像タイプでアップロードする際のリクエストURL
	 */
	imgUpload: string;

	/**
	 * 画像タイプで削除する際のリクエストURL
	 */
	imgDelete: string;

	/**
	 * ファイルアップロードタイプで取得するファイルリストのリクエストURL
	 */
	fileList: string;

	/**
	 * ファイルアップロードタイプでアップロードする際のリクエストURL
	 */
	fileUpload: string;

	/**
	 * ファイルアップロードタイプで削除する際のリクエストURL
	 */
	fileDelete: string;
}

export interface IBurgerEdintorConfigUtility {
	/**
	 * GoogleMaps APIキー
	 */
	googleMapsApiKey: string;

	/**
	 * CKEditorで使用するCSSファイルのリスト
	 *
	 */
	cssList: string[];

	/**
	 * 本稿のフィールド要素のid
	 */
	mainFieldId: string | null;

	/**
	 * 下書きのフィールド要素のid
	 */
	draftFieldId: string | null;
}

/**
 * 設定情報機能有効フラグのインターフェイス
 */
export interface IBurgerEditorConfigFlag {
	proposal?: { [flagName: string]: boolean };
}

/**
 * エディタのグローバル状態。
 * アニメーション中の操作衝突を防ぐ排他制御フラグを保持する。
 */
export interface IEditorStatus {
	/**
	 * true の間はブロック操作（移動・削除・挿入）を受け付けない。
	 * アニメーション開始時に true、完了コールバックで false に戻す。
	 */
	isProcessed: boolean;
}

/**
 * ブロックコピー用 sessionStorage キー。
 * タブ間共有不要・ブラウザ終了時に消えるべき一時データのため sessionStorage を使用。
 */
export const STORAGE_KEY_OF_COPIED_BLOCK = 'bge-copied-block';

/**
 * ユーザー入力 ID に付与するプレフィックス。他システムの ID との衝突を防ぐ。
 */
export const BLOCK_ID_PREFIX = 'bge-';

/**
 * コアオブジェクト
 */
export const editor = new BurgerEditor();

/**
 * 設定情報
 */
export const config: IBurgerEdintorConfig = {};

/**
 * エディタの状態
 */
export const editorStatus: IEditorStatus = {
	isProcessed: false,
};

/**
 * 現在アクティブな編集領域（本稿 or 下書き）
 */
export let currentContentArea: ContentArea;

/**
 * 追加するブロックを選択するダイアログ
 */
export let blockListDialog: BlockListDialog;

/**
 * ブロック編集ダイアログ
 */
export let blockConfigDialog: BlockConfigDialog;

/**
 * タイプ編集ダイアログ
 */
export let typeEditorDialog: TypeEditorDialog;

/**
 * コンポーネントオブザーバ
 */
export let componentObserver: ComponentObserver;

/**
 * タイプモジュールコレクション
 *
 */
export const modules: { [typeName: string]: BurgerTypeModule } = {};

/**
 * GoogleMaps APIキー
 * @deprecated
 */
export let googleMapsApiKey: string;

/**
 * CKEditorで使用するCSSファイルのリスト
 *
 * カンマ区切りの文字列
 * @deprecated
 */
export let cssListForCKEditor: string;

/**
 * 全ブロックテンプレートを格納する隠し要素（#DefaultBlock）。
 * PHP が初回ロード時にレンダリングし、ブロック追加時に clone() して使う。
 * サーバーへの都度リクエストが不要になる。
 */
export let $originalBlockElementContainer: JQuery;

/**
 * ブロックを追加する対象の要素
 */
export let insertionPoint: InsertionPoint;

/**
 * data-bge-class 属性の文字列からコンストラクタを引くためのマップ。
 * TypeEditorDialog がダイアログ描画時にこのマップで自動インスタンス化する。
 */
export const editorComponent = {
	FileUploader,
	FileUploadMessenger,
	ImageUploader,
	MultiFieldSelection,
	MultiFieldSelector,
	UploadFileDeleter,
	UploadFileList,
	UploadFileSearchButton,
	UploadFileSearchForm,
	UploadImageDeleter,
	UploadImageList,
	UploadImageListMultiSelect,
};

/**
 * タイプ編集フォームのテンプレートを格納する隠し要素（#InputArea）。
 * TypeEditorDialog が開く度に clone して使い捨てる。
 */
let $originalTypeEditorElementContainer: JQuery;

/**
 * 管理画面上のコンテンツの出力結果および編集可能領域（本稿）
 */
let mainContentArea: MainContentArea;

/**
 * 管理画面上のコンテンツの出力結果および編集可能領域（下書き）
 *
 * 下書きがない場合もある
 */
let draftContentArea: DraftContentArea | null = null;

/**
 * エディタ初期化。設定パース → UI構築 → フォーム送信イベント上書きの順に実行。
 * baserCMS 標準の保存処理を上書きし、送信前に iframe DOM → hidden input への書き戻しを挟む。
 */
export function init() {
	getSettings();
	mainToDraftInit();

	// フォーム送信時イベントを上書き
	$('#BtnSave').unbind('click');
	$('#BtnSave').click(() => {
		if ($.bcUtil) {
			$.bcUtil.showLoader();
		}

		save();

		$('#BlogPostMode').val('save');
		if ($.bcToken) {
			$.bcToken.check(
				() => {
					const $form = $(
						'#PageAdminEditForm, #PageAdminAddForm, #BlogPostForm, #CustomEntriesForm',
					);
					$form.trigger('submit');
				},
				{ useUpdate: false, hideLoader: false },
			);
		}

		return false;
	});

	const btnPreview = document.getElementById('BtnPreview') as HTMLInputElement | null;
	if (btnPreview) {
		// baserCMS4.0.x暫定対応: 判定する方法が不明なので、ありえるものは全部生成する
		const previewField = ['data[Page][contents_tmp]', 'data[BlogPost][detail_tmp]'];
		const previewFieldElements = previewField.map((fieldName) => {
			const previewFieldElement = document.createElement('input');
			previewFieldElement.type = 'hidden';
			previewFieldElement.name = fieldName;
			// 配列が多い場合はdocumentFragmentを検討
			if (btnPreview.form) {
				btnPreview.form.append(previewFieldElement);
			}
			return previewFieldElement;
		});

		const beforePreview = () => {
			for (const previewFieldElement of previewFieldElements) {
				previewFieldElement.value = currentContentArea.getContentsAsString();
			}
		};

		// イベントを先頭に挿入する
		$(btnPreview).on('click', beforePreview);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const unofficialJQuery: any = $;
		if ($.isFunction(unofficialJQuery._data)) {
			const eventMap = unofficialJQuery._data(btnPreview).events;
			if (eventMap && eventMap.click) {
				const clickHandlers: unknown[] = eventMap.click;
				const _beforePreview = clickHandlers.pop();
				if (_beforePreview) {
					clickHandlers.unshift(_beforePreview);
				}
			}
		}
	}
}

/**
 * タイプモジュールを登録する。Addon/type/{name}/init.js から呼ばれる唯一の公開 API。
 * Addon 側はこの関数を通じてライフサイクルフック（open, change, migrate 等）を注入する。
 * @param name タイプ名
 * @param option タイプ編集時のイベント処理などを登録する
 */
export function registerTypeModule(
	name: string,
	option: IBurgerTypeModuleConstructorOption = {},
) {
	if (name in modules) {
		// eslint-disable-next-line no-console
		console.warn(`"${name}" is already exists.`);
		return;
	}

	modules[name] = new BurgerTypeModule(option);
}

/**
 * 指定のタイプのテンプレートHTMLを取得する
 * @param typeName
 */
export function getTypeEditorTemplate(typeName: string) {
	return $originalTypeEditorElementContainer.find(`.Type${typeName}`).clone()[0];
}

/**
 * DOM の内容を hidden input と sessionStorage に書き戻す。DB 送信はしない。
 * 全編集操作の度に呼ばれ、ブラウザクラッシュ時の復元データを常に最新に保つ。
 */
export function save() {
	mainContentArea.save();
	if (draftContentArea) {
		draftContentArea.save();
	}

	// eslint-disable-next-line no-console
	console.info('save to input element for storage.');
}

/**
 * ストレージにブロックを保存する
 * @param html HTML文字列
 */
export function copyBlock(html: string) {
	sessionStorage.setItem(STORAGE_KEY_OF_COPIED_BLOCK, html);
}

/**
 * ストレージに保存してあるブロックを参照する
 * @returns HTML文字列
 */
export function getCopiedBlock(): string | null {
	return sessionStorage.getItem(STORAGE_KEY_OF_COPIED_BLOCK);
}

/**
 * semver のバージョン比較ユーティリティ。Addon 側にも BgE.versionCheck として公開。
 */
export const versionCheck = {
	/**
	 * v1 < v2
	 * @param v1
	 * @param v2
	 * @param loose
	 */
	lt(v1: string, v2: string, loose?: boolean) {
		return semver.lt(v1, v2, loose);
	},

	/**
	 * v1 > v2
	 * @param v1
	 * @param v2
	 * @param loose
	 */
	gt(v1: string, v2: string, loose?: boolean) {
		return semver.gt(v1, v2, loose);
	},

	/**
	 * v1 <= v2
	 * @param v1
	 * @param v2
	 * @param loose
	 */
	lte(v1: string, v2: string, loose?: boolean) {
		return semver.lte(v1, v2, loose);
	},

	/**
	 * v1 >= v2
	 * @param v1
	 * @param v2
	 * @param loose
	 */
	gte(v1: string, v2: string, loose?: boolean) {
		return semver.gte(v1, v2, loose);
	},
};

/**
 * PHP が HTML に埋め込んだ JSON 設定をパースし、テンプレート要素・ContentArea・ダイアログを構築する。
 * 非同期処理なしで初期化を完了させるため、Ajax ではなく HTML 埋め込み方式を採用。
 */
function getSettings() {
	parseConfig(document.getElementById('bge-config') as HTMLScriptElement);

	const mainContentStorageId = config.utility ? config.utility.mainFieldId || '' : '';
	const draftContentStorageId = config.utility ? config.utility.draftFieldId : null;

	$originalBlockElementContainer = $('#DefaultBlock');
	$originalTypeEditorElementContainer = $('#InputArea');

	cssListForCKEditor = config.utility ? config.utility.cssList.join(',') : '';
	googleMapsApiKey = config.utility ? config.utility.googleMapsApiKey : '';

	/**
	 * プレビューフィールドの初期化
	 * @since baserCMS 5.0.0
	 */
	$('#PageAdminEditForm, #BlogPostForm, #CustomEntriesForm').append(
		'<input type="hidden" id="ContentPreviewMode" value="publish">',
	);

	// CMSのバージョンの確認
	const _cmsVersion = config.cmsVersion || '';
	if (semver.valid(_cmsVersion)) {
		config.cmsVersion = semver.clean(_cmsVersion) || '';
	} else {
		// eslint-disable-next-line regexp/optimal-quantifier-concatenation
		const semCMSVersion = _cmsVersion.replace(/^(\d+\.\d+\.\d+).*/, '$1');
		if (semCMSVersion === _cmsVersion) {
			throw new Error(
				`baserCMSのバージョン情報が不正です。「${_cmsVersion}」はセマンティック バージョニング 2.0.0の仕様に従っていません。`,
			);
		} else {
			// eslint-disable-next-line no-console
			console.warn(
				`baserCMSのバージョン情報が不正です。「${_cmsVersion}」はセマンティック バージョニング 2.0.0の仕様に従っていません。${semCMSVersion}として解釈します。`,
			);
			config.cmsVersion = semCMSVersion;
		}
	}

	componentObserver = new ComponentObserver();

	insertionPoint = new InsertionPoint();
	mainContentArea = new MainContentArea(
		document.getElementById('ValueArea'),
		document.getElementById(mainContentStorageId) as HTMLInputElement,
	);
	if (draftContentStorageId) {
		draftContentArea = new DraftContentArea(
			document.getElementById('DraftArea'),
			document.getElementById(draftContentStorageId) as HTMLInputElement,
		);
	}

	blockListDialog = new BlockListDialog(document.getElementById('PanelArea'));
	blockConfigDialog = new BlockConfigDialog(document.getElementById('BgBlockConfigArea'));
	typeEditorDialog = new TypeEditorDialog(document.getElementById('ContentsEditArea'));
}

/**
 * script 要素内の JSON テキストをパースして config に反映する
 * @param scriptElement 設定 JSON を含む script 要素
 */
function parseConfig(scriptElement: HTMLScriptElement) {
	if (scriptElement) {
		const json = scriptElement.textContent ?? '';
		try {
			const parsedJSON = JSON.parse(json);
			$.extend(config, parsedJSON);
			// eslint-disable-next-line no-console
			console.info('success: Configuration JSON is parsed.');
		} catch {
			// eslint-disable-next-line no-console
			console.warn('parse error: Configuration JSON.');
		}
	}
}

/**
 * 本稿/下書きタブ切替と相互コピー機能の初期化。
 * baserCMS の公開/下書き2面構成に対応し、それぞれ独立した ContentArea を切り替える。
 * Alt+ダブルクリックでソース表示モードに切り替わる隠し機能あり。
 */
function mainToDraftInit() {
	if (!draftContentArea) {
		return;
	}

	// 本稿切替
	$('#CbeHonkouBtn').on('click', (e) => {
		if (!draftContentArea) {
			return;
		}
		const $this = $(e.currentTarget);
		mainContentArea.show();
		draftContentArea.hide();
		$this.closest('.draft-btn').find('.on').removeClass('on');
		$this.addClass('on');
		$('#CbeHonkouCopyBtn').addClass('on');
		$('#ContentPreviewMode').val('publish');
		currentContentArea = mainContentArea;
		currentContentArea.update();
		currentContentArea.check();
	});

	// 下書き切替
	$('#CbeSoukouBtn').on('click', (e) => {
		if (!draftContentArea) {
			return;
		}
		const $this = $(e.currentTarget);
		draftContentArea.show();
		mainContentArea.hide();
		$this.closest('.draft-btn').find('.on').removeClass('on');
		$this.addClass('on');
		$('#CbeSoukouCopyBtn').addClass('on');
		$('#ContentPreviewMode').val('draft');
		currentContentArea = draftContentArea;
		currentContentArea.update();
		currentContentArea.check();
	});

	// 草稿から本稿へコピー
	$('#CbeSoukouCopyBtn').click(() => {
		if (!draftContentArea) {
			return;
		}
		if (
			mainContentArea.isEmpty() ||
			draftContentArea.isSame(mainContentArea) ||
			confirm('下書き内容を本稿へ上書きしてもよろしいですか？')
		) {
			draftContentArea.copyTo(mainContentArea);
			$('#CbeHonkouBtn').trigger('click');
		}
	});

	// 本稿から草稿へコピー
	$('#CbeHonkouCopyBtn').click(() => {
		if (!draftContentArea) {
			return;
		}
		if (
			draftContentArea.isEmpty() ||
			mainContentArea.isSame(draftContentArea) ||
			confirm('本稿の内容を下書きへコピーしてもよろしいですか？')
		) {
			mainContentArea.copyTo(draftContentArea);
			$('#CbeSoukouBtn').trigger('click');
		}
	});

	$('#CbeHonkouBtn, #CbeSoukouBtn').on('dblclick', (e) => {
		const $this = $(e.currentTarget);
		if (!e.altKey || !$this.hasClass('on')) {
			return;
		}
		$this.trigger('click');
		currentContentArea.toggleDisplayMode();
		const modeDisplay = currentContentArea.isVisualMode ? '' : '<span>ソース表示</span>';
		$this.find('span').remove();
		$this.html((_, html) => html + modeDisplay);
	});

	// 本稿草稿ボタン初期設定
	$('#CbeHonkouBtn').trigger('click');
}

export { default as Util } from './BgE/Util.js';
