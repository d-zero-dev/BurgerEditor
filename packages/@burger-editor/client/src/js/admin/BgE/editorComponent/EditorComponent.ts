import type TypeEditorDialog from '../editorDialog/TypeEditorDialog.js';

/**
 * タイプ編集ダイアログ内の特殊 UI 要素の基底クラス。
 * input.php で `data-bge-class="ClassName"` を指定すると TypeEditorDialog が自動インスタンス化する。
 * コンポーネント間の通信は ComponentObserver 経由で行い、直接参照を持たない。
 */
abstract class EditorComponent {
	/**
	 * 編集ダイアログ
	 */
	editorDialog: TypeEditorDialog;

	/**
	 * HTML要素
	 */
	#node: HTMLElement;

	get node() {
		return this.#node;
	}

	get $el() {
		return $(this.#node);
	}

	/**
	 * コンストラクタ
	 * @param node コンポーネントの要素
	 * @param module コンポーネントが使用されるタイプモジュール
	 * @param editorDialog
	 */
	constructor(node: HTMLElement, editorDialog: TypeEditorDialog) {
		this.#node = node;
		this.editorDialog = editorDialog;
	}

	/**
	 * コンストラクタが呼ばれた後に処理する
	 *
	 * override前提
	 *
	 */
	afterInit(): void {
		// Void
	}
}

export default EditorComponent;
