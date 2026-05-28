import * as BgE from '../../BgE.js';
import Util from '../Util.js';

/** jQuery UI Dialog に渡すオプション。buttons キーは `{ メソッド名: ボタン表示名 }` 形式。 */
export interface IEditorDialogOption {
	[option: string]: unknown;
	buttons: IEditorDialogBindingMethodOfButton;
}

/** ボタン定義。キー=サブクラスのメソッド名、値=ボタン表示名。 */
export interface IEditorDialogBindingMethodOfButton {
	[methodName: string]: string | (() => void);
}

/**
 * jQuery UI Dialog のラッパー基底クラス。
 * buttons オプションの `{ メソッド名: ボタン表示名 }` を自動的にサブクラスのメソッド呼び出しに変換する。
 * TypeEditorDialog・BlockConfigDialog・BlockListDialog の3サブクラスが継承する。
 */
abstract class EditorDialog {
	/**
	 * 編集ダイアログの要素
	 */
	$el: JQuery;

	/**
	 * ダイアログのルート DOM 要素
	 */
	get el() {
		return this.$el.get(0)!;
	}

	/**
	 * コンストラクタ
	 *
	 * 第二引数の`options`へ渡すハッシュの`buttons`キーは `{ <メソッド名>: <ボタン名> }`のハッシュで渡す
	 *
	 * 例)
	 *
	 * ```javascript
	 * new EditorDialog(el, {
	 * buttons: {
	 * close: '閉じる',
	 * customMethod: '独自ボタン'
	 * }
	 * });
	 * ```
	 * @param el 編集ダイアログ要素
	 * @param options ダイアログ生成の設定 基本的にjQuery UIのオプション `open`,`close`,`create`,`buttons`は特殊な処理を行う
	 */
	constructor(el: HTMLElement | null, options: IEditorDialogOption) {
		if (!el) {
			throw new Error('要素の取得に失敗しました。');
		}
		this.$el = $(el);
		const configAndMethods: IEditorDialogOption = $.extend({}, options);
		configAndMethods.open = this._open.bind(this) as JQueryUI.DialogEvent;
		configAndMethods.close = this._close.bind(this) as JQueryUI.DialogEvent;
		configAndMethods.create = this._create.bind(this) as JQueryUI.DialogEvent;

		configAndMethods.buttons = {};

		for (const methodName of Object.keys(options.buttons)) {
			if (!methodName) {
				continue;
			}
			// ループ内の関数定義のためクロージャで対応
			((_methodName: string, _buttonName?: string | (() => void)) => {
				if (!_buttonName) {
					return;
				}
				if (typeof _buttonName !== 'string') {
					return;
				}
				configAndMethods.buttons[_buttonName] = () => {
					// 自信のインスタンスにbuttonsで定義したメソッドが存在していたら登録
					// @ts-ignore
					if (this[_methodName]) {
						// @ts-ignore
						this[_methodName].call(this);
					}
				};
			})(methodName, options.buttons[methodName]);
		}

		this.$el.dialog(configAndMethods as JQueryUI.DialogOptions);
	}

	/**
	 * 編集ダイアログを閉じる
	 *
	 */
	close() {
		this.$el.dialog('close');
		BgE.currentContentArea.save();
	}

	/**
	 * 編集ダイアログを生成する
	 *
	 */
	create() {
		this.$el.dialog('create');
	}

	/**
	 * 編集ダイアログを開く
	 * @param args サブクラスのための型定義
	 */
	open(
		// @ts-ignore
		...args: unknown[] // eslint-disable-line @typescript-eslint/no-unused-vars
	) {
		// 開く直前に現在のwindowの幅を取得して最適なダイアログ幅を算出する
		this.$el.dialog('option', 'width', Util.getDialogSize(1200, 'width'));
		this.$el.dialog('open');
	}

	/**
	 * 編集ダイアログ内の入力内容を空にする
	 */
	reset() {
		this.$el.find('input, select, textarea').val('');
	}

	/**
	 * 編集ダイアログを閉じた時の処理
	 *
	 * override前提
	 *
	 */
	protected _close() {
		// void (Abstract)
	}

	/**
	 * 編集ダイアログを生成する時の処理
	 *
	 * override前提
	 *
	 */
	protected _create() {
		// void (Abstract)
	}

	/**
	 * 編集ダイアログを開いた時の処理
	 *
	 * override前提
	 * @param {...unknown[]} args
	 */
	protected _open(
		// @ts-ignore
		...args: unknown[] // eslint-disable-line @typescript-eslint/no-unused-vars
	) {
		// void (Abstract)
	}
}

export default EditorDialog;
