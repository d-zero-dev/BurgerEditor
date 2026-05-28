import type BurgerTypeModule from './BurgerTypeModule.js';

import frozenPatty from '@burger-editor/frozen-patty';
import { setValue } from '@burger-editor/frozen-patty/set-value';
import combineSoundMarks from 'jaco/combineSoundMarks';

import * as BgE from '../BgE.js';

/** DOM→インスタンス方向の逆引き。getInstance() で使用。 */
const elMap = new WeakMap<HTMLElement, BurgerType>();
/** インスタンス→DOM 方向。el getter で使用。 */
const btMap = new WeakMap<BurgerType, HTMLElement>();

/**
 * ブロック内の編集可能な1単位（例: image, ckeditor, button）を表現する。
 * DOM 要素 `[data-bgt]` と 1:1 対応。
 * frozen-patty を介して HTML↔JSON の双方向変換（export/import）を行い、
 * 編集ダイアログとのデータ受け渡しを担う。
 * バージョン管理を持ち、古いタイプは isOld=true → upgrade() でマイグレーション可能。
 */
export default class BurgerType {
	/**
	 * モジュール（機能）セット
	 */
	module: BurgerTypeModule | void;

	/**
	 * タイプ名
	 */
	name: string;

	/**
	 *
	 */
	#isOld = false;

	/**
	 *
	 */
	#version: string;

	/**
	 * このタイプに対応する DOM 要素
	 */
	get el() {
		return btMap.get(this)!;
	}

	/**
	 * タイプのバージョン文字列（マイグレーション判定に使用）
	 */
	get version() {
		return this.#version;
	}

	/**
	 * テンプレートよりバージョンが古いか
	 */
	get isOld() {
		return this.#isOld;
	}

	/**
	 * コンストラクタ
	 * @param el 内包するDOM要素
	 * @param value タイプに設定する値（コンテンツ）
	 * @param html
	 * @param data
	 */
	constructor(html: HTMLElement | string, data?: BgE.IBurgerTypeContentData) {
		let el: HTMLElement;
		if (typeof html === 'string') {
			el = $(html).get(0)!;
		} else {
			el = html;
		}

		// set maps
		elMap.set(el, this);
		btMap.set(this, el);

		// detect name
		let name = el.dataset.bgt;
		if (!name) {
			name = 'unknown';
			el.dataset.bgt = name;
		}
		this.name = name;

		// detect version
		let version = el.dataset.bgtVer;
		if (!version) {
			version = '0.0.0';
			el.dataset.bgtVer = version;
		}
		this.#version = version;
		const originVersion = BgE.config.types?.[this.name]?.version ?? '0.0.0';
		this.#isOld = BgE.versionCheck.lt(this.#version, originVersion);

		// set module
		this.module = BgE.modules[$.camelCase(`-${this.name}`)];

		// set data
		if (data) {
			void this.import(data).then(() => {
				// bind event
				this.#bind();
			});
			return;
		}

		// bind event
		this.#bind();
	}

	/**
	 * コンテンツの現在の値をハッシュで返す
	 * @returns コンテンツの現在の値
	 */
	export() {
		return BurgerType.contentExport(this.el);
	}

	/**
	 * 値をタイプ内のHTMLへ反映する
	 * ダイアログからの編集決定があった場合のみ `isChanged = true`となる。
	 * @param values 値
	 * @param fromDialogChanges ダイアログからの編集決定からの呼び出し
	 */
	async import(values: BgE.IBurgerTypeContentData, fromDialogChanges = false) {
		// console.log(values);
		// beforeChangeハンドラを発火
		if (this.module && fromDialogChanges) {
			await this.module.beforeChange(values, this);
		}
		const newHTML = frozenPatty(this.el.innerHTML, {
			attr: 'bge',
			typeConvert: true,
			valueFilter: <T>(value: T): T => {
				if (typeof value === 'string') {
					// @ts-ignore
					return BurgerType.ioFilter(value);
				}
				return value;
			},
		})
			.merge(values)
			.toHTML();
		this.el.innerHTML = newHTML;
		// マイグレーション
		if (this.#isOld && this.module) {
			await this.module.migrateElement(values, this);
		}
		// changeハンドラを発火
		if (this.module && fromDialogChanges) {
			await this.module.change(values, this);
		}
		this.#bind();
	}

	/**
	 * タイプが無効かチェックし、無効ならメッセージを返す
	 * @returns 有効の場合は空文字列、無効の場合はメッセージ
	 */
	isDisable() {
		if (this.module) {
			return this.module.isDisable(this);
		}
		return '';
	}

	/**
	 * 最新テンプレートでタイプを再構築し、既存データをマイグレーションする
	 */
	async upgrade() {
		if (!this.#isOld) {
			return;
		}
		const newTmpl = BgE.config.types?.[this.name]?.tmpl;
		if (!newTmpl) {
			return;
		}
		const newEl = $(newTmpl).get(0)!;
		const v = newEl.dataset.bgtVer!;
		const typeNameCameled = $.camelCase(`-${this.name}`);
		const typeModule = BgE.modules[typeNameCameled];
		const currentData = typeModule ? typeModule.migrate(this) : this.export();
		const newTmplData = BurgerType.contentExport(newEl);
		const data = Object.assign({}, newTmplData, currentData);
		this.el.innerHTML = newEl.innerHTML;
		this.el.dataset.bgtVer = v;
		await this.import(data);
		this.#version = v;
		this.#isOld = false;
	}

	/* cSpell:disable */

	/**
	 * 値の妥当性チェック（yuga.js と衝突する禁止クラス名の検出）
	 * @param values チェック対象のデータ
	 * @returns エラーメッセージ（問題がなければ空文字列）
	 */
	validate(values: BgE.IBurgerTypeContentData) {
		const errors: string[] = [];
		for (const name of Object.keys(values)) {
			const value = values[name];
			// yuga.jsと衝突するため、HTMLのクラス名に"btn" "allbtn"を入力させない
			if ($(`<div>${value}</div>`).find('.btn, .allbtn').length > 0) {
				errors.push(
					'値の中にクラス名"btn"もしくは"allbtn"を含むHTMLがあります。\nクラス名"btn"・"allbtn"は使用できません。',
				);
			}
		}
		return errors.join('\n\n');
	}
	/* cSpell:enable */

	/**
	 * イベントの定義
	 *
	 * 新規もしくはinnerHTMLが刷新されたとき呼ばれる
	 */
	#bind() {
		const $this = $(this.el);

		// タイプをクリックして編集
		$this.off('click');
		$this.on('click', () => {
			this.#openEditor();
			return false;
		});
	}

	/**
	 * タイプの編集モードを開く
	 */
	#openEditor() {
		// 編集画面を表示
		BgE.typeEditorDialog.open(this);
	}

	/**
	 * 要素からBurgerTypeインスタンスを返す
	 * @param el
	 */
	static getInstance(el: HTMLElement) {
		return elMap.get(el);
	}

	/**
	 * コンテンツ（HTML）をBurgerEditorのタイプで利用できるJSONに変換する
	 * @param target
	 */
	static contentExport(target: Element): BgE.IBurgerTypeContentData {
		const data = frozenPatty(target.outerHTML, {
			attr: 'bge',
			typeConvert: true,
			valueFilter: <T>(value: T): T => {
				if (typeof value === 'string') {
					// @ts-ignore
					return BurgerType.ioFilter(value);
				}
				return value;
			},
		}).toJSON();
		// console.log(data);
		return data;
	}

	/**
	 * import/export 時の値サニタイズ。
	 * 1. macOS の濁点・半濁点結合文字を正規化（NFD→NFC 相当）
	 * 2. WYSIWYG 内に混入した data-bgb/data-bgt 属性を除去（ネスト防止）
	 * @param datum
	 */
	static ioFilter(datum: string): string {
		// 濁点半濁点問題
		datum = combineSoundMarks(datum);

		// WysiwygのHTMLコンテンツ内で
		// data-bgb/data-bgtで開始する属性を削除する
		// "<"で開始するHTML文字列であることを確認する。
		if (datum.trim().startsWith('<')) {
			const d = document.createElement('div');
			d.innerHTML = datum;
			const elements = d.querySelectorAll('*');
			for (const element of elements) {
				const attrs = element.attributes;
				for (let i = 0, l = attrs.length; i < l; i++) {
					const attr = attrs.item(i);
					if (attr && /data-bg[bt](?:-.+)?/i.test(attr.name)) {
						element.removeAttribute(attr.name);
					}
				}
			}
			datum = d.innerHTML;
		}
		return datum;
	}

	/**
	 * 単一のデータ値を DOM 要素に反映する
	 * @param name データキー名
	 * @param datum 設定する値
	 * @param el 反映先の要素
	 */
	static datumToElement(
		name: keyof BgE.IBurgerTypeContentData,
		datum: BgE.IBurgerTypeContentDatum,
		el: Element,
	) {
		return setValue(el, `${name}`, datum, 'bge', <T>(value: T): T => {
			if (typeof value === 'string') {
				// @ts-ignore
				return BurgerType.ioFilter(value);
			}
			return value;
		});
	}
}
