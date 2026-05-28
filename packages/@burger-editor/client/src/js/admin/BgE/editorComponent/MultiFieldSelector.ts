import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';

import EditorComponent from './EditorComponent.js';

/**
 * マルチフィールドへの画像追加を実行する選択ボタン
 */
export default class MultiFieldSelector extends EditorComponent {
	#isEmpty = true;
	#path: string | null = null;

	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		this.$el.prop('disabled', true);
		this.$el.on('click', this.#onClick.bind(this));
		BgE.componentObserver.on('bge-file-select', this.#onSelect, this);
	}

	#onClick() {
		// selectedクラス切り替え
		if (this.#path) {
			BgE.componentObserver.notify('bge-multi-field-add', {
				path: this.#path,
				isEmpty: this.#isEmpty,
			});
		}
		return false;
	}

	#onSelect({ path, isEmpty }: { path: string; isEmpty: boolean }) {
		this.#path = path;
		this.#isEmpty = isEmpty;
		if (path && !isEmpty) {
			this.$el.prop('disabled', false);
		} else {
			this.$el.prop('disabled', true);
		}
	}
}
