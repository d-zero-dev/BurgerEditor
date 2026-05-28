import semver from 'semver';

import * as BgE from '../../BgE.js';
import BurgerType from '../BurgerType.js';
import Util from '../Util.js';

import EditorDialog from './EditorDialog.js';

/**
 * タイプのコンテンツを編集するモーダルダイアログ。
 * 開く度にテンプレート(input.php由来)を clone し、data-bge-class で EditorComponent を自動生成、
 * data-bge-event でカスタムイベントをバインドする。
 * 閉じる時に clone した DOM ごと破棄し、次回は新規に構築する（状態残留の防止）。
 */
export default class TypeEditorDialog extends EditorDialog {
	/**
	 * 編集中のタイプ
	 */
	type?: BurgerType;

	/**
	 * コンストラクタ
	 * @param el 編集ダイアログの要素
	 */
	constructor(el: HTMLElement | null) {
		super(el, {
			bgiframe: true, // cspell:disable-line
			autoOpen: false,
			position: semver.gte('1.11.0', jQuery.ui.version, true) ? 'center' : undefined,
			modal: true,
			buttons: {
				// 「キャンセル」ボタンを押すと closeメソッドが発火
				close: 'キャンセル',
				// 「完了」ボタンを押すと completeメソッドが発火
				complete: '完了',
			},
		});
	}

	/**
	 * 編集完了時に実行する
	 */
	async complete() {
		if (!this.type) {
			return;
		}
		// データ抽出前の処理
		if (this.type.module) {
			this.type.module.beforeExtract(this, this.type);
		}
		// 値のバリデーションチェック
		const errMsg = this.type.validate(this.#export());
		if (errMsg) {
			alert(errMsg);
			return;
		}
		// 値をコンテンツへ反映
		await this.type.import(this.#export(), true);
		this.close();
	}

	/**
	 * 編集要素内のカスタムイベントを登録する
	 *
	 * HTMLには`<eventName>:<customEventName>`の形式で定義する
	 * `<eventName>`は省略すると"click"とする
	 *
	 * ```html
	 * <button data-bge-event="click:customEvent">click me!</button>
	 * ```
	 *
	 * イベントハンドラ自体は`init.js`の`registerTypeModule`で定義する
	 *
	 * ```javascript
	 *
	 * ```
	 *
	 */
	#bindCustomEvent() {
		this.$el.find('[data-bge-event]').each((_, el) => {
			const $this = $(el);
			const bgeEvent = `${$this.data('bge-event')}`;
			const bgeEventQuery = bgeEvent.split(':');
			const eventName = bgeEventQuery[0] ?? 'click';
			const handlerName = bgeEventQuery[1] ?? eventName;
			if (!this.type || !this.type.module) {
				return;
			}
			if (
				handlerName in this.type.module.customFunctions &&
				$.isFunction(this.type.module.customFunctions[handlerName])
			) {
				this.$el.on(eventName, `[data-bge-event="${bgeEvent}"]`, (e) => {
					if (!this.type || !this.type.module) {
						return;
					}
					return this.type.module.customFunctions[handlerName]?.call(
						el,
						e,
						this,
						this.type,
						this.type.module,
					);
				});
			}
		});
	}

	/**
	 * 編集画面内の要素をエディタコンポーネント化する
	 */
	#createEditorComponents() {
		this.$el.find('[data-bge-class]').each((_, el) => {
			const $component = $(el);
			// 要素に紐付けられているクラス名（コストラクタ名）を取得
			const editorComponentSubClassName = `${$component.data('bgeClass')}`;

			const editorComponentSubClassConstructor =
				// @ts-ignore
				BgE.editorComponent[editorComponentSubClassName];

			if (editorComponentSubClassConstructor) {
				// EditorComponentのサブクラスのコンストラクション 要素に機能を付加する
				const editor = new editorComponentSubClassConstructor(el, this);
				editor.afterInit();
			}
		});
	}

	/**
	 * 編集した値をハッシュで返す
	 */
	#export() {
		return extractFormData(this.el);
	}

	/**
	 * 編集画面内のインプット要素に値をエクスポートする
	 * @param values エクスポートする値
	 */
	#import(values: BgE.IBurgerTypeContentData) {
		setForm(this.el, values);
	}

	/**
	 * 編集ダイアログを閉じる時の処理
	 * @override
	 */
	protected override _close() {
		// コンポーネントオブザーバに登録されたイベントをすべて削除してリセットする
		BgE.componentObserver.off();
		// イベント移譲の解除
		this.$el.off();
		// 内容を空にする
		this.$el.empty();
		// 反映したHTMLの保存
		BgE.save();
	}

	/**
	 * 編集ダイアログを生成する時の処理
	 * @override
	 */
	protected override _create() {
		this.$el
			.closest('.ui-dialog')
			.find('.ui-button:last') // the first button
			.addClass('last');
	}

	/**
	 * 編集ダイアログを開く
	 * @override
	 * @param type 編集するタイプ
	 */
	override open(type: BurgerType) {
		this.type = type;
		const tmpl = BgE.getTypeEditorTemplate(this.type.name);
		if (!tmpl) {
			throw new Error(`Template not found: ${this.type.name}`);
		}
		// 編集画面を再設定
		this.$el.append(tmpl);
		// 編集画面内の要素をエディタコンポーネント化
		this.#createEditorComponents();
		// カスタムイベントを登録
		this.#bindCustomEvent();
		// 登録されているデータを抽出
		const data = this.type.export();
		// beforeOpenイベントを発火
		if (this.type.module) {
			this.type.module.beforeOpen(this, this.type, data);
		}
		// 編集画面に現在の値を反映する
		this.#import(data);
		// ダイアログを開く
		super.open();
		// openイベントを発火
		if (this.type.module) {
			this.type.module.open(this, this.type);
		}
	}
}

/**
 * JSON データをフォーム要素に反映する。name="bge-{キー名}" の規約で対象要素を探索。
 * data-bge-list 内のリスト要素は子要素を clone して行数を動的に増やす。
 * @param node
 * @param values
 */
export function setForm(node: Element, values: BgE.IBurgerTypeContentData) {
	const $this = $(node);
	for (const name of Object.keys(values)) {
		const value = values[name];
		const inputSelector = `[name="bge-${name}"]`;
		const viewSelector = `[data-bge*="${name}"]`;
		if (Array.isArray(value)) {
			const $targetEl = $this.find(inputSelector);
			const $listRoot = $targetEl.closest('[data-bge-list]');
			if ($listRoot.children().length === 0) {
				continue;
			}
			const $listItem = $listRoot.children().first().clone();
			while (value.length > $listRoot.children().length) {
				$listRoot.append($listItem.clone());
			}
			$listRoot.find(inputSelector).each((i, targetEl) => {
				setFormItem(targetEl as HTMLInputElement, value[i] || '');
			});
			$listRoot.find(viewSelector).each((i, targetEl) => {
				BurgerType.datumToElement(name, value[i] || '', targetEl);
			});
		} else {
			for (const targetEl of $this.find(inputSelector).toArray()) {
				setFormItem(targetEl as HTMLInputElement, value);
			}
			for (const targetEl of $this.find(viewSelector).toArray()) {
				BurgerType.datumToElement(name, value, targetEl);
			}
		}
	}
}

/**
 * 単一のフォーム要素に値を設定する。checkbox/radio はチェック状態を制御。
 * @param node 対象の input 要素
 * @param value 設定する値
 */
function setFormItem(node: HTMLInputElement, value: BgE.IBurgerTypeContentDatum) {
	if (node.type.toLowerCase() === 'checkbox') {
		if (typeof value === 'string') {
			node.checked = /false|0+/i.test(value) ? false : !!value;
		} else {
			node.checked = !!value;
		}
	}

	if (node.type.toLowerCase() === 'radio') {
		let checked: boolean;
		if (node.value) {
			checked = node.value === value;
		} else {
			checked = !!value;
		}
		node.checked = checked;
	} else if (node.placeholder === value) {
		// placeholder と同じ値の場合は空を渡す
		node.value = '';
	} else {
		node.value = `${value}`;
	}
}

/**
 * フォーム要素から name="bge-*" の値を収集し、IBurgerTypeContentData に正規化する。
 * checkbox は boolean、radio は選択値、それ以外は string として抽出。
 * @param node
 */
export function extractFormData(node: Element) {
	const raws: BgE.IBurgerTypeContentRawMataDatum[] = [];
	const $inputs = $(node).find('[name^=bge-]');
	$inputs.not(':radio').each((_, el) => {
		const $this = $(el);
		const inputType = $this.attr('type') || '';
		const name = ($this.attr('name') || '').replace(/^bge-(.+)/i, '$1');
		let value: BgE.IBurgerTypeContentDatum;
		if (inputType === 'checkbox') {
			value = !!$this.prop('checked');
		} else {
			value = $this.val() as string;
		}
		raws.push({
			key: name,
			datum: value,
			isArray: $this.closest('[data-bge-list]').length > 0,
		});
	});
	const extractedNames: string[] = [];
	$inputs.filter(':radio').each((_, el) => {
		const radio = el as HTMLInputElement;
		const name = radio.name.replace(/^bge-(.+)/i, '$1');
		if (extractedNames.includes(name)) {
			return;
		}
		if (radio.checked) {
			raws.push({
				key: name,
				datum: radio.value,
				isArray: $(el).closest('[data-bge-list]').length > 0,
			});
			extractedNames.push(name);
		}
	});
	const data = Util.dataOptimize(raws) as BgE.IBurgerTypeContentData;
	return data;
}
