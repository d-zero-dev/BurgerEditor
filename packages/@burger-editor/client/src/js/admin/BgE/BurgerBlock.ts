import * as BgE from '../BgE.js';

import BlockOption from './BlockOption.js';
import BurgerType from './BurgerType.js';

/**
 * インスタンス→DOM の WeakMap。GC 連動でメモリリークを防ぐ。
 * プロパティではなくモジュールスコープに置くことで、static メソッドからもアクセス可能にしつつ外部に隠蔽。
 */
const bbMap = new WeakMap<BurgerBlock, HTMLElement>();

/**
 * ブロックの全状態をシリアライズ可能な形で表現する。clone・コピペで export→import に使う。
 */
export interface IBurgerBlockData {
	/**
	 * タイプ内のコンテンツ
	 */
	typeData: BgE.IBurgerTypeContentData[];

	/**
	 * オプション
	 */
	options: BlockOption[];

	/**
	 * 独自クラス
	 */
	customClassList: string[];

	/**
	 * グリッド情報
	 */
	gridInfo: IGridInfo;
}

/**
 * グリッド情報
 */
export interface IGridInfo {
	/**
	 * 通常（PC版）の左の比率 x/12
	 */
	normalRatio: number | null;

	/**
	 * SP版の左の比率 x/12
	 */
	spRatio: number | null;

	/**
	 * SP版に対応する
	 */
	spEnabled: boolean;
}

/**
 * 公開期間設定
 */
export interface IScheduledPublishing {
	publishDatetime: string | null;
	unpublishDatetime: string | null;
}

let _lastUID = 0;

/**
 * エディタ上の1ブロック（見出し、画像、テーブル等）を表現する。
 * 1ブロックは複数の BurgerType を内包する（例: image-text ブロック = image + ckeditor）。
 * DOM 要素 `[data-bgb]` と 1:1 対応し、WeakMap(bbMap) で紐付ける。
 * オプション・グリッド比・独自クラス・時限公開はブロック単位の設定で、
 * タイプ単位のコンテンツデータとは独立して import/export される。
 */
export default class BurgerBlock {
	/**
	 * タイプリスト
	 */
	types: BurgerType[] = [];

	/**
	 * 独自クラス
	 */
	#customClassList: string[] = [];

	/**
	 * グリッド情報
	 */
	#gridInfo: IGridInfo = {
		normalRatio: null,
		spRatio: null,
		spEnabled: false,
	};

	/**
	 * ID
	 */
	#id = '';

	/**
	 * ブロック名
	 */
	#name: string;

	/**
	 * オプションクラス
	 */
	#options: BlockOption[] = [];

	/**
	 *
	 */
	#raf = 0;

	/**
	 * 公開期間設定
	 */
	#scheduledPublishing: IScheduledPublishing = {
		publishDatetime: null,
		unpublishDatetime: null,
	};

	/**
	 *
	 */
	#timerId = 0;

	/**
	 * 内部ユニークID
	 */
	#uid: number;

	/**
	 *
	 * @readonly
	 * @deprecated
	 */
	get #$el(): JQuery {
		return $(this.node);
	}

	/**
	 * ID
	 */
	get id() {
		return this.#id;
	}

	/**
	 * ブロック名
	 */
	get name() {
		return this.#name;
	}

	/**
	 * Node
	 */
	get node() {
		return bbMap.get(this)!;
	}

	/**
	 * コンストラクタ
	 *
	 * 引数にDOM要素を渡した場合、その要素をブロックとしてラップする
	 * 文字列を渡した場合、その名前のブロックを新規生成する
	 * @param elementOrBlockName ブロック内包する対象のDOM要素 もしくは ブロックの種類名
	 */
	constructor(elementOrBlockName: HTMLElement | string) {
		this.#uid = _lastUID++;

		if (typeof elementOrBlockName === 'string') {
			this.#name = elementOrBlockName;
			const el = BurgerBlock.#getTemplate(this.#name);
			if (el) {
				bbMap.set(this, el);
			}
		} else if (elementOrBlockName) {
			const el = elementOrBlockName;
			bbMap.set(this, el);
			this.#name = `${this.#$el.data('bgb')}`;
		} else {
			throw new Error('Do not create BurgerBlock. A base element is empty.');
		}

		// 内包するタイプをインスタンス化する
		this.#$el.find('[data-bgt]').each((_: number, el: HTMLElement): void => {
			const type = new BurgerType(el);
			this.types.push(type);
		});
		// データを抽出する
		this.#extractOptions();
		this.#extractGridRatio();
		this.#extractCustomClass();
		this.#extractId();
		this.exportScheduledPublishing();

		// 時限公開設定の有効範囲かどうかを判定するタイマー設定
		this.#setTimer();

		// イベント
		this.#$el.on('mousemove', () => {
			const isChanged = BgE.editor.setCurrentBlock(this);
			if (isChanged) {
				cancelAnimationFrame(this.#raf);
				this.#raf = requestAnimationFrame(() => {
					if (!BgE.editor.isSetBlock()) {
						return;
					}
					BgE.currentContentArea.blockMenu.show();
					const rect = this.node.getBoundingClientRect();
					BgE.currentContentArea.blockMenu.setPosition(rect);
				});
			}
		});
		this.#$el.on('mouseleave', () => {
			requestAnimationFrame(() => {
				if (!BgE.currentContentArea.blockMenu.isHover) {
					BgE.currentContentArea.blockMenu.hide();
					BgE.editor.clearCurrentBlock();
				}
			});
		});
	}

	/**
	 * jQuery animate のPromiseラッパー
	 * @param properties アニメーション対象のCSSプロパティ
	 * @param duration アニメーション時間（ms）
	 * @returns アニメーション完了時に解決するPromise
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	animate(properties: any, duration: number) {
		return new Promise<void>((resolve) => {
			this.#$el.animate(properties, duration, resolve);
		});
	}

	/**
	 * 自身のデータで新しいブロックを複製する
	 * @returns 複製された新規ブロック
	 */
	clone() {
		const originalData: IBurgerBlockData = this.#export();
		const newBlock = new BurgerBlock(this.#name);
		newBlock.#import(originalData);
		return newBlock;
	}

	/**
	 * 次のブロックが存在するか
	 * @returns 存在する場合 true
	 */
	existNext() {
		return this.#$el.next().length > 0;
	}

	/**
	 * 手前のブロックが存在するか
	 * @returns 存在する場合 true
	 */
	existPrev() {
		return this.#$el.prev().length > 0;
	}

	/**
	 * DOM から独自クラスを再抽出して返す
	 * @returns 独自クラス名の配列
	 */
	exportCustomClassList() {
		this.#extractCustomClass();
		return this.#customClassList;
	}

	/**
	 * DOM からグリッド情報を再抽出して返す
	 * @returns グリッド情報
	 */
	exportGridInfo() {
		this.#extractGridRatio();
		return this.#gridInfo;
	}

	/**
	 * DOM から ID を再抽出して返す
	 * @returns ブロックの id 属性値
	 */
	exportId() {
		this.#extractId();
		return this.#id;
	}

	/**
	 * DOM からオプションを再抽出して返す
	 * @returns ブロックオプションの配列
	 */
	exportOptions() {
		this.#extractOptions();
		return this.#options;
	}

	/**
	 * DOM から公開期間設定を再抽出して返す
	 * @returns 公開期間設定
	 */
	exportScheduledPublishing() {
		const publishDatetime = this.#$el.attr('data-bgb-publish-datetime') || null;
		const unpublishDatetime = this.#$el.attr('data-bgb-unpublish-datetime') || null;
		this.#scheduledPublishing = {
			publishDatetime,
			unpublishDatetime,
		};
		return this.#scheduledPublishing;
	}

	/**
	 * ブロックのHTMLを文字列で返す
	 * @returns outerHTML 文字列
	 */
	getHTMLStringify() {
		return this.node.outerHTML;
	}

	/**
	 * 独自クラスのインポート
	 * @param classList
	 */
	importCustomClassList(classList: string[]) {
		this.#customClassList = classList;
		this.#addCustomClassToElements();
	}

	/**
	 * グリッド情報のインポート
	 * @param gridInfo
	 */
	importGridInfo(gridInfo: IGridInfo) {
		this.#gridInfo = gridInfo;
		this.#changeGridForElementsPC();
		this.#changeGridForElementsSP();
	}

	/**
	 * IDのインポート
	 * @param id
	 */
	importId(id: string) {
		this.#id = id;
		this.#setIdToElements();
	}

	/**
	 * ブロックのデータをJSON文字列からインポート
	 * @param jsonString
	 */
	importJSONString(jsonString: string) {
		const data = JSON.parse(jsonString) as IBurgerBlockData;
		try {
			this.#import(data);
		} catch (error) {
			throw new Error(`ImportError: ${error instanceof Error ? error.message : error}`);
		}
	}

	/**
	 * オプションのインポート
	 * @param options
	 */
	importOptions(options: BlockOption[]) {
		this.#options = options;
		this.#addOptionClassToElements();
	}

	/**
	 * 公開期間設定のインポート
	 * @param scheduledPublishing
	 */
	importScheduledPublishing(scheduledPublishing: IScheduledPublishing) {
		this.#scheduledPublishing = scheduledPublishing;
		if (scheduledPublishing.publishDatetime) {
			this.#$el.attr('data-bgb-publish-datetime', scheduledPublishing.publishDatetime);
		} else {
			this.#$el.removeAttr('data-bgb-publish-datetime');
		}
		if (scheduledPublishing.unpublishDatetime) {
			this.#$el.attr(
				'data-bgb-unpublish-datetime',
				scheduledPublishing.unpublishDatetime,
			);
		} else {
			this.#$el.removeAttr('data-bgb-unpublish-datetime');
		}
		this.#setTimer();
	}

	/**
	 * タイプのデータをインポート
	 * @param types
	 */
	importTypes(types: (i: number, type: BurgerType) => BgE.IBurgerTypeContentData) {
		for (const [i, type] of this.types.entries()) {
			void type.import(types(i, type));
		}
	}

	/**
	 * 同じブロックかどうか内部UIDで判定する
	 * @param block 比較対象
	 * @returns 同一ブロックの場合 true
	 */
	is(block: BurgerBlock) {
		return this.#uid === block.#uid;
	}

	/**
	 * ブロック内のタイプが無効かチェックし、無効ならメッセージを返す
	 * @returns 有効の場合は空文字列、無効の場合はメッセージ
	 */
	isDisable() {
		let msg = '';
		for (const type of this.types) {
			msg = type.isDisable();
			if (msg) {
				break;
			}
		}
		return msg;
	}

	/**
	 * ブロックを削除する
	 */
	remove() {
		this.#$el.off();
		this.#$el.remove();
	}

	/**
	 * ブロックのデータをJSON文字列で返す
	 * @param space JSON.stringify の整形用スペース
	 * @returns JSON文字列
	 */
	toJSONStringify(space?: string | number) {
		return JSON.stringify(this.#export(), null, space);
	}

	/**
	 * 独自クラスをコンテンツに反映
	 */
	#addCustomClassToElements() {
		this.#removeCustomClassFromElements();
		const useClassList: string[] = [];
		for (const className of this.#customClassList) {
			if (className && !BurgerBlock.NG_CUSTOM_CLASS_LIST.includes(className)) {
				useClassList.push(className);
			} else {
				alert(`"${className}" というクラス名は使用できません。`);
			}
		}
		this.#$el.addClass(useClassList.join(' '));
	}

	/**
	 * オプションをコンテンツに反映
	 */
	#addOptionClassToElements() {
		this.#removeOptionClassFromElements();
		const useClassList: string[] = [];
		for (const option of this.#options) {
			if (option.currentClass) {
				useClassList.push(option.currentClass.className);
			}
		}
		this.#$el.addClass(useClassList.join(' '));
	}

	/**
	 * グリッド情報をコンテンツに反映
	 * @param isSP
	 */
	#changeGridForElements(isSP: boolean) {
		const prefix = isSP ? 'sp-' : '';
		const $changeables = this.#$el.find('[data-bge-grid-changeable]');
		const $L = $changeables.first();
		const $R = $changeables.last();
		const rxGridClass = new RegExp(`(bgt-${prefix}grid(?:1[0-2]*|[1-9]))`, 'g');
		const gridClassesL = ($L.attr('class') || '').match(rxGridClass) || [];
		const gridClassesR = ($R.attr('class') || '').match(rxGridClass) || [];
		// グリッド比設定 - 一旦削除して設定
		$L.removeClass(gridClassesL.join(' '));
		$R.removeClass(gridClassesR.join(' '));

		// SPが無効の場合終了
		if (isSP && !this.#gridInfo.spEnabled) {
			return;
		}

		const ratioL = isSP ? this.#gridInfo.spRatio : this.#gridInfo.normalRatio;
		if (ratioL) {
			const ratioR = 12 - ratioL;
			if ($changeables.length === 1) {
				const ratio = ['left', 'inline-start', 'start'].includes($L.css('cssFloat'))
					? ratioL
					: ratioR;
				$L.addClass(`bgt-${prefix}grid${ratio}`);
			} else if ($changeables.length > 1) {
				$L.addClass(`bgt-${prefix}grid${ratioL}`);
				$R.addClass(`bgt-${prefix}grid${ratioR}`);
			}
		}
	}

	/**
	 * グリッド情報をコンテンツに反映
	 */
	#changeGridForElementsPC() {
		this.#changeGridForElements(false);
	}

	/**
	 * グリッド情報をコンテンツに反映
	 */
	#changeGridForElementsSP() {
		this.#changeGridForElements(true);
	}

	/**
	 *
	 */
	#clearTimer() {
		window.clearInterval(this.#timerId);
	}

	/**
	 *
	 */
	#detectTimeRange() {
		const attrName = 'data-bgb-publish-datetime-range';
		const start = this.#scheduledPublishing.publishDatetime;
		const end = this.#scheduledPublishing.unpublishDatetime;
		if (start == null && end == null) {
			this.#$el.removeAttr(attrName);
			return;
		}
		let isOutOfRange = false;
		const nowTimestamp = Date.now();

		if (start) {
			const startTimestamp = new Date(start).valueOf();
			if (nowTimestamp < startTimestamp) {
				isOutOfRange = true;
			}
		}

		if (end) {
			const endTimestamp = new Date(end).valueOf();
			if (endTimestamp < nowTimestamp) {
				isOutOfRange = true;
			}
		}

		this.#$el.attr(attrName, `${!isOutOfRange}`);
	}

	/**
	 * ブロックのデータをエクスポート
	 *
	 */
	#export() {
		const data: IBurgerBlockData = {
			typeData: this.types.map((type) => type.export()),
			options: this.exportOptions(),
			customClassList: this.exportCustomClassList(),
			gridInfo: this.exportGridInfo(),
		};
		return data;
	}

	/**
	 * 独自クラスをコンテンツから抽出する
	 */
	#extractCustomClass() {
		this.#customClassList = BurgerBlock.extractCustomClass(this.node);
	}

	/**
	 * グリッド情報の取得
	 */
	#extractGridRatio() {
		this.#gridInfo = BurgerBlock.extractGridRatio(this.node);
	}

	/**
	 * IDをコンテンツから抽出する
	 */
	#extractId() {
		this.#id = BurgerBlock.extractId(this.node);
	}

	/**
	 * オプションをコンテンツのclass属性から抽出する
	 */
	#extractOptions() {
		this.#options = BurgerBlock.extractOptions(this.node);
	}

	/**
	 * ブロックのデータをインポート
	 * @param data
	 */
	#import(data: IBurgerBlockData) {
		for (const [i, typeData] of data.typeData.entries()) {
			void this.types[i]?.import(typeData);
		}
		this.importOptions(data.options);
		this.importCustomClassList(data.customClassList);
		this.importGridInfo(data.gridInfo);
	}

	/**
	 * 独自クラスをコンテンツから削除する
	 */
	#removeCustomClassFromElements() {
		const classAttr = this.#$el.attr('class') || '';
		const classList = classAttr.split(/\s+/);
		const useClassList = classList.filter((className) => className.indexOf('bgb-') === 0);
		this.#$el.attr('class', useClassList.join(' '));
	}

	/**
	 * オプションをコンテンツから削除する
	 */
	#removeOptionClassFromElements() {
		const classAttr = this.#$el.attr('class') || '';
		const classList = classAttr.split(/\s+/);
		const useClassList = classList.filter(
			(className) => className.indexOf('bgb-opt--') !== 0,
		);
		this.#$el.attr('class', useClassList.join(' '));
	}

	/**
	 * IDをコンテンツに反映
	 */
	#setIdToElements() {
		this.#$el.attr('id', this.#id);
	}

	/**
	 * 時限公開設定の有効範囲かどうかを判定するタイマー設定
	 */
	#setTimer() {
		this.#clearTimer();
		this.#detectTimeRange();
		this.#timerId = window.setInterval(this.#detectTimeRange.bind(this), 1000 * 30);
	}

	/**
	 * 使用禁止クラス名。yuga.js がこれらのクラスを検知して挙動を変えるため衝突する。
	 */
	static NG_CUSTOM_CLASS_LIST = [
		'btn',
		'allbtn', // cspell:disable-line
	];

	/**
	 * オプションをコンテンツのclass属性から抽出する
	 * @param el
	 */
	static extractOptions(el: HTMLElement) {
		const $el = $(el);
		const classAttr = $el.attr('class') || '';
		const classList = classAttr.split(/\s+/);
		const options: BlockOption[] = [];
		// 編集項目の初期値を設定
		for (const className of classList) {
			if (
				!className ||
				(className.indexOf('bgb-opt--') !== 0 && className.indexOf('bgb-') === 0)
			) {
				// classNameが空 もしくは "bgb-opt--"以外の"bgb-"で開始する場合は除外
				continue;
			}
			// オプションで使われているクラス名か探してオプションを取得する
			const option = BlockOption.getOption(className);
			if (option) {
				options.push(option);
			}
		}
		return options;
	}

	/**
	 * 独自クラスをコンテンツから抽出する
	 * @param el
	 */
	static extractCustomClass(el: HTMLElement) {
		const $el = $(el);
		const classAttr = $el.attr('class') || '';
		const classList = classAttr.split(/\s+/);
		const customClassList: string[] = [];
		// 編集項目の初期値を設定
		for (const className of classList) {
			if (
				!className ||
				(className.indexOf('bgb-opt--') !== 0 && className.indexOf('bgb-') === 0)
			) {
				// classNameが空 もしくは "bgb-opt--"以外の"bgb-"で開始する場合は除外
				continue;
			}

			// オプションで使われているクラス名か探してオプションを取得する
			if (BlockOption.getOption(className)) {
				continue;
			}

			// それ以外のクラスは独自クラスとする
			customClassList.push(className);
		}
		return customClassList;
	}

	/**
	 * グリッド情報の取得
	 * @param el
	 */
	static extractGridRatio(el: HTMLElement) {
		const $el = $(el);
		const $changeables = $el.find('[data-bge-grid-changeable]');
		const gridInfo: IGridInfo = {
			spEnabled: false,
			spRatio: 6,
			normalRatio: 6,
		};
		// グリッド変更設定
		for (const isSP of [true, false]) {
			if ($changeables.length > 0) {
				const prefix = isSP ? 'sp-' : '';
				const classAttr = $changeables.attr('class') || '';
				const ratioQuery =
					classAttr.match(new RegExp(`bgt-${prefix}grid(1[0-2]*|[1-9])`)) || [];
				let ratio = +(ratioQuery[1] || 0);
				const enabled = !!ratio;
				if ($changeables.length === 1) {
					/**
					 * [data-bge-grid-changeable] が左右どちらにあるかどうか
					 *
					 * cssFloatのstyleを取得しているが flexbox などでは破綻する
					 * さらにDOMツリー上に存在していないと上手く取得できない
					 */
					const isAppended = $el.closest('body').length > 0;
					if (!isAppended) {
						// 一時的にDOMに追加する
						// スタイルの状態を見るためにcurrentContentArea内でなければならない
						$el.insertAfter(BgE.currentContentArea.containerElement);
					}
					const isRightSide = ['right', 'inline-end', 'end'].includes(
						$changeables.css('cssFloat'),
					);
					if (isRightSide) {
						// 右にあった場合はグリッドの数を逆にする
						ratio = 12 - ratio;
					}
					if (!isAppended) {
						// DOMから切り離す
						$el.detach();
					}
				}
				if (isSP) {
					gridInfo.spEnabled = enabled;
					if (enabled) {
						gridInfo.spRatio = ratio;
					}
				} else {
					gridInfo.normalRatio = ratio;
				}
			}
		}
		return gridInfo;
	}

	/**
	 * IDの取得
	 * @param el
	 */
	static extractId(el: HTMLElement) {
		return el.id;
	}

	/**
	 * BurgerEditor 以外で作成されたコンテンツや旧バージョンのブロックを wysiwyg でラップする。
	 * マイグレーション前の一時的な受け皿として data-bgb="unknown" を付与。
	 * @param html
	 */
	static createUnknownBlock(html: string) {
		const block = new BurgerBlock('wysiwyg');
		void block.types[0]?.import({ ckeditor: html });
		block.#$el.attr('data-bgb', 'unknown');
		block.#name = 'unknown';
		return block;
	}

	/**
	 * 指定のブロックのテンプレートHTMLを取得する
	 * @param name
	 */
	static #getTemplate(name: string) {
		const $origin = BgE.$originalBlockElementContainer.find(`[data-bgb="${name}"]`);
		if ($origin.length === 0) {
			throw new Error(`Do not get BurgerBlock template. "${name}" block is not exist.`);
		}
		return $origin.clone()[0];
	}
}
