import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

import * as BgE from '../../BgE.js';
import BurgerType from '../BurgerType.js';

import EditorComponent from './EditorComponent.js';

/**
 * マルチフィールドの選択済みアイテム一覧を管理・表示する要素
 */
export default class MultiFieldSelection extends EditorComponent {
	#$listItemTmpl: JQuery;
	#$listRoot: JQuery;

	/**
	 * コンストラクタ
	 * @param el コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(el: HTMLElement, editorDialog: TypeEditorDialog) {
		super(el, editorDialog);
		BgE.componentObserver.on('bge-multi-field-add', this.#add, this);
		this.#$listRoot = this.$el.find('[data-bge-list]');
		this.#$listItemTmpl = this.#$listRoot.children().first().clone();
	}

	#add(data: BgE.IBurgerTypeContentData) {
		const $item = this.#$listItemTmpl.clone();
		for (const datumName of Object.keys(data)) {
			const datum = data[datumName];
			const $input = $item.find(`[name="bge-${datumName}"]`);
			$input.val(`${datum}`);
			const $view = $item.find(`[data-bge*="${datumName}"]`);
			const view = $view.get(0);
			if (view) {
				BurgerType.datumToElement(datumName, `${datum}`, view);
			}
		}
		this.#$listRoot.append($item);
	}
}
