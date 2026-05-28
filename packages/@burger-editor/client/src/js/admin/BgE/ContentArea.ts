import * as BgE from '../BgE.js';

import BlockMenu from './BlockMenu.js';
import BurgerBlock from './BurgerBlock.js';
import BurgerEditorElement from './BurgerEditorElement.js';
import InitialInsertionButton from './InitialInsertionButton.js';
import Migrator from './Migrator.js';

const CONTAINER_PADDING = 10;
const CONTENT_ID = 'bge-content';
const CONTENT_CLASSES = ['bge-contents', 'bge_contents', 'bge_content'];

/**
 * iframe 内にブロックコンテンツを描画・編集する領域の基底クラス。
 * iframe を使う理由: 管理画面の CSS とコンテンツの CSS を完全に分離し、スタイル汚染を防ぐ。
 * sessionStorage に常時バックアップし、ブラウザクラッシュ時にユーザーに復元を提案する。
 * MainContentArea（本稿）と DraftContentArea（下書き）の2サブクラスを持つ。
 */
abstract class ContentArea extends BurgerEditorElement {
	blockMenu: BlockMenu;

	/**
	 * 表示コンテンツを内包するHTML要素（iframe内）
	 *
	 * ```html
	 * <div  id="bge-content">...</div>
	 * ```
	 */
	#containerElement: HTMLElement;

	/**
	 * ヴィジュアルエディタのフレーム
	 */
	#frameElement: HTMLIFrameElement;

	/**
	 * 要素追加ボタン
	 */
	#insertionButton: InitialInsertionButton;
	#isVisualMode = true;

	/**
	 * ソース表示用のテキストエリア
	 */
	#sourceTextarea: HTMLTextAreaElement;

	/**
	 * コンテンツの内容を格納するinput要素
	 *
	 */
	#storageElement: HTMLInputElement;

	/**
	 * コンテンツの内容を格納するsessionStorageのキー
	 *
	 */
	#storageKey: string;

	/**
	 * 表示コンテンツを内包するHTML要素（iframe内）
	 *
	 * ```html
	 * <div id="bge-content">...</div>
	 * ```
	 */
	get containerElement() {
		return this.#containerElement;
	}

	get isVisualMode() {
		return this.#isVisualMode;
	}

	/**
	 * コンストラクタ
	 * @param node HTML要素
	 * @param storageNode コンテンツの内容を格納するinput要素
	 * @param storageKeyPreffix コンテンツの内容を格納するsessionStorageのキーのプレフィックス
	 */
	constructor(
		node: HTMLElement | null,
		storageNode: HTMLInputElement,
		storageKeyPreffix: string,
	) {
		super(node);
		if (!node || !storageNode) {
			throw new Error('コンテンツを保持する要素の取得に失敗しました。');
		}
		this.#storageElement = storageNode;
		this.#storageKey = `${storageKeyPreffix}_${encodeURI(location.pathname + location.search)}`;

		// sessionStorageからデータを取得
		const storageData = sessionStorage.getItem(this.#storageKey);
		if (
			storageData &&
			storageData.trim() !== storageNode.value.trim() &&
			confirm(
				'前回編集したデータが残っています。復元しますか？\n（「キャンセル」を選択すると保存済みの内容を使用します）',
			)
		) {
			this.#storageElement.value = storageData;
		}
		clearStorages(storageKeyPreffix);

		// ルート要素の設定
		node.dataset.component = 'ContentArea';

		// プレーンテキストエリアの設定
		this.#sourceTextarea = document.createElement('textarea');
		this.#sourceTextarea.spellcheck = false;
		node.append(this.#sourceTextarea);

		// フレームの生成
		this.#frameElement = document.createElement('iframe');
		this.#frameElement.setAttribute('width', '100%;');
		this.#frameElement.setAttribute('scrolling', 'no');
		node.append(this.#frameElement);

		if (!this.#frameElement.contentWindow) {
			throw new Error('Impossible error: The contentWindow of created iframe is null.');
		}

		this.#frameElement.contentWindow.document.open();
		this.#frameElement.contentWindow.document.close();

		// スタイルシートの取得
		const bgeStyleDefaultPath = removeStylesheet('link[href*="bge_style_default.css"]');
		const bgeStylePath = removeStylesheet('link[href*="bge_style.css"]');
		const bgeCSSPath = getStylesheet('link[href*="burger_editor.css"]');

		// スタイルシートをiframeに適応
		if (this.#frameElement.contentWindow.document.head) {
			if (bgeStyleDefaultPath) {
				this.#frameElement.contentWindow.document.head.append(
					createCSSLinkTag(bgeStyleDefaultPath, this.#frameElement.contentWindow),
				);
			}
			if (bgeStylePath) {
				this.#frameElement.contentWindow.document.head.append(
					createCSSLinkTag(bgeStylePath, this.#frameElement.contentWindow),
				);
			}
			if (bgeCSSPath) {
				this.#frameElement.contentWindow.document.head.append(
					createCSSLinkTag(bgeCSSPath, this.#frameElement.contentWindow),
				);
			}
		}

		// iframe bodyのスタイル設定
		this.#frameElement.contentWindow.document.body.setAttribute(
			'style',
			'margin: 0; border: 0;',
		);

		// 本文データを設定
		this.#containerElement =
			this.#frameElement.contentWindow.document.createElement('div');
		this.#containerElement.id = CONTENT_ID;
		this.#containerElement.style.padding = `${CONTAINER_PADDING}px`;
		this.#containerElement.style.overflow = 'hidden';
		const contentClasses = [...CONTENT_CLASSES];
		if (BgE.config.setting?.wrapperClass) {
			contentClasses.push(BgE.config.setting?.wrapperClass);
		}
		this.#containerElement.setAttribute('class', contentClasses.join(' '));
		this.#containerElement.innerHTML = storageNode.value;

		// ブロックメニュー
		this.blockMenu = new BlockMenu(
			this.#frameElement.contentWindow.document.createElement('div'),
		);

		// 初期挿入ボタン
		this.#insertionButton = new InitialInsertionButton();

		// 要素をiframe内に設置
		const els = this.#frameElement.contentWindow.document.createDocumentFragment();
		els.append(this.blockMenu.getNode());
		els.append(this.#insertionButton.getNode());
		els.append(this.#containerElement);
		this.#frameElement.contentWindow.document.body.append(els);

		// イベントの設定
		window.addEventListener('resize', this.#setHeightTrigger.bind(this), true);
		// eslint-disable-next-line no-restricted-syntax
		window.addEventListener('DOMContentLoaded', this.#setHeightTrigger.bind(this), false);
		window.document.addEventListener('load', this.#setHeightTrigger.bind(this), true);
		this.#frameElement.contentWindow.addEventListener(
			'resize',
			this.#setHeightTrigger.bind(this),
			true,
		);
		// eslint-disable-next-line no-restricted-syntax
		this.#frameElement.contentWindow.addEventListener(
			'DOMContentLoaded',
			this.#setHeightTrigger.bind(this),
			false,
		);
		this.#frameElement.contentWindow.document.addEventListener(
			'load',
			this.#setHeightTrigger.bind(this),
			true,
		);
		this.#sourceTextarea.addEventListener('blur', this.#saveSource.bind(this), false);

		// 本文データをブロックとタイプに関連付け
		void this.#initBlocksAndTypes();

		// モード初期化
		this.#switchMode(true);

		/**
		 * 編集アイコン
		 *
		 * タイプにマウスオンすると表示されるマウスに追随するアイコン
		 */
		const $editorIcon = $('.edit-inner');
		$(this.containerElement)
			.on('mousemove', '[data-bgt]', (e) => {
				requestAnimationFrame(() => {
					const r = this.getNode().getBoundingClientRect();
					$editorIcon.show();
					$editorIcon.css({
						left: e.pageX + r.left + window.pageXOffset,
						top: e.pageY + r.top + window.pageYOffset,
					});
				});
			})
			.on('mouseleave', '[data-bgt]', () => {
				$editorIcon.hide();
			});
	}

	/**
	 * マイグレーションチェックを実行し、必要ならアップデートボタンを表示する
	 */
	check() {
		Migrator.check(this.containerElement);
	}

	/**
	 * 内容をコピーする
	 * @param contentArea
	 */
	copyTo(contentArea: ContentArea) {
		contentArea.setContentsAsString(this.getContentsAsString());
		contentArea.#initBlocksAndTypes();
	}

	/**
	 * 内容（HTML文字列）の取得
	 */
	getContentsAsString() {
		return this.#containerElement.innerHTML.trim();
	}

	/**
	 * 内容が空かどうか
	 */
	isEmpty() {
		return this.getContentsAsString() === '';
	}

	/**
	 * 内容が同じかどうか
	 * @param contentArea
	 */
	isSame(contentArea: ContentArea) {
		return this.getContentsAsString() === contentArea.getContentsAsString();
	}

	/**
	 * 編集した要素をstorage要素へ保存
	 * また、sessionStorageに保存する
	 *
	 * 引数で内容を指定することが可能
	 * @param content 内容（HTML文字列）
	 */
	save(content?: string) {
		if (content) {
			this.#storageElement.value = content;
		} else {
			const $container = $(this.#containerElement);

			// 不要な属性の削除
			// 削除しないリスト
			const removeAttrNameIgnoreList = new Set([
				'class',
				'id',
				'data-bgb',
				'data-bgb-publish-datetime',
				'data-bgb-unpublish-datetime',
				'data-bgb-publish-datetime-range',
			]);
			$container.find('[data-bgb]').each((_, el) => {
				const attrList: NamedNodeMap = el.attributes;
				for (let j = 0, l = attrList.length; j < l; j++) {
					const attr: Attr | null = attrList.item(j);
					if (attr && !removeAttrNameIgnoreList.has(attr.name)) {
						el.removeAttribute(attr.name);
					}
				}
			});

			// 挿入点の解除
			BgE.insertionPoint.unset();

			const value = this.getContentsAsString();
			this.#storageElement.value = value;
			this.#sourceTextarea.value = value;
		}

		// sessionStorageに保存
		sessionStorage.setItem(this.#storageKey, this.#storageElement.value);

		this.update();
	}

	/**
	 * 内容（DOM）の設定
	 * @param element
	 */
	setContentsAsDOM(element: HTMLElement) {
		this.#containerElement.innerHTML = '';
		this.#containerElement.append(element);
	}

	/**
	 * 内容（HTML文字列）の設定
	 * @param htmlString
	 */
	setContentsAsString(htmlString: string) {
		this.#containerElement.innerHTML = htmlString.trim();
	}

	/**
	 * ビジュアルモードとソースモードを切り替える
	 */
	toggleDisplayMode() {
		this.#saveSource();
		this.#switchMode(!this.#isVisualMode);
	}

	/**
	 * iframe の高さを再計算し、初期挿入ボタンの表示を更新する
	 */
	update() {
		this.#setHeightTrigger();
		this.#showInsertionButton();
	}

	#initBlocksAndTypes() {
		// BurgerEditor関連のコンテンツがまったく入っていない場合
		const $contents = $(this.containerElement);
		if (
			!this.isEmpty() &&
			$contents.find(
				'[data-bgb], .bgb-container, .bg-editor-block-container, .cb-editor-block-container',
			).length === 0
		) {
			const block = BurgerBlock.createUnknownBlock(this.getContentsAsString());
			this.setContentsAsDOM(block.node);
		} else {
			$contents.find('>:not([data-bgb])').each((_, el: HTMLElement) => {
				BurgerBlock.createUnknownBlock(el.outerHTML);
				el.remove();
			});
			$contents.find('[data-bgb]').each((_, el: HTMLElement) => {
				new BurgerBlock(el);
			});
		}
		this.check();
		this.save();
	}

	#saveSource(): void {
		if (!this.#isVisualMode) {
			this.setContentsAsString(this.#sourceTextarea.value);
			this.save();
		}
	}

	#setHeight(): void {
		const height =
			this.#containerElement.getBoundingClientRect().height + CONTAINER_PADDING * 2;
		this.#frameElement.setAttribute('height', `${height}`);
	}

	/**
	 *
	 */
	#setHeightTrigger(): void {
		if ('requestAnimationFrame' in window) {
			requestAnimationFrame(() => this.#setHeight());
		} else {
			this.#setHeight();
		}
	}

	/**
	 * 「下に要素を追加」の表示
	 */
	#showInsertionButton() {
		if (this.isEmpty()) {
			this.#insertionButton.show();
		} else {
			this.#insertionButton.hide();
		}
	}

	#switchMode(visualMode: boolean): void {
		this.#isVisualMode = visualMode;
		this.node.dataset.componentMode = this.#isVisualMode ? 'visual' : 'source';
		this.#frameElement.hidden = !visualMode;
		this.#sourceTextarea.hidden = !!visualMode;
		this.#sourceTextarea.disabled = !!visualMode;
	}
}

export default ContentArea;

/**
 * 指定セレクタの link 要素から href を取得する
 * @param selector CSS セレクタ
 * @returns CSS ファイルのパス
 */
function getStylesheet(selector: string) {
	const styleTag = document.querySelector(selector);
	if (!styleTag) {
		throw new Error('CSS用のlink要素の取得に失敗しました。');
	}

	const cssPath = styleTag.getAttribute('href');
	return cssPath;
}

/**
 * 親ページからスタイルシートを無効化し、そのパスを返す。
 * 親ページでは不要だが iframe 内で必要な CSS を移動するための前処理。
 * @param selector
 */
function removeStylesheet(selector: string) {
	const styleTag = document.querySelector<HTMLLinkElement>(selector);
	if (!styleTag) {
		// eslint-disable-next-line no-console
		console.warn(`CSS用のlink要素(${selector})が存在しないため取得をしませんでした。`);
		return null;
	}

	const cssPath = styleTag.getAttribute('href');
	// スタイルの無効化
	styleTag.type = 'text/bge-css-copied';
	styleTag.rel = 'nofollow';
	return cssPath;
}

/**
 * iframe 内に CSS を適用するための link 要素を生成する
 * @param cssPath CSS ファイルのパス
 * @param baseWindow link 要素を生成する対象の Window
 * @returns 生成された link 要素
 */
function createCSSLinkTag(cssPath: string, baseWindow: Window) {
	const linkTag = baseWindow.document.createElement('link');
	linkTag.rel = 'stylesheet';
	linkTag.href = cssPath;
	return linkTag;
}

/**
 * 指定プレフィックスに一致する sessionStorage のエントリをすべて削除する
 * @param preffix sessionStorage キーのプレフィックス
 */
function clearStorages(preffix: string) {
	for (let i = 0, l = sessionStorage.length; i < l; i++) {
		const key = sessionStorage.key(i);
		if (key?.startsWith(preffix)) {
			sessionStorage.removeItem(key);
		}
	}
}
