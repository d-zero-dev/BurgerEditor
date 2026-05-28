import type EditorComponent from './EditorComponent.js';
import type { IFileUploaderResponse } from './FileUploader.js';

/** EditorComponent 間で発行されるイベント名とペイロード型の定義 */
export interface Actions {
	'bge-file-listup': string;
	'bge-file-select': { path: string; isEmpty: boolean };
	'bge-file-upload-error': string;
	'bge-file-upload-complete': IFileUploaderResponse;
	'bge-file-delete-success': null;
	'bge-file-delete-error': string;
	'bge-multi-field-add': { path: string; isEmpty: boolean };
	'bge-file-search': null;
}

/**
 * EditorComponent 間のイベントバス。
 * ファイルアップロード完了→リスト更新→フォーム値反映のような連鎖を疎結合に実現する。
 * jQuery の on/off/trigger を内部で利用。ダイアログを閉じる時に off() で全解除する。
 */
export default class ComponentObserver {
	/**
	 * オブザーブ・通知処理を行うオブジェクト
	 *
	 * jQueryのon/off/triggerで代用できるのでそれを使う
	 *
	 */
	#obj: JQuery;

	/**
	 * コンストラクタ
	 */
	constructor() {
		this.#obj = $('body');
	}

	/**
	 * 通知
	 * @param name イベント名
	 * @param data イベントリスナに渡すデータ
	 * @param payload
	 */
	notify<A extends keyof Actions>(name: A, payload: Actions[A]) {
		// console.log('notify', name, { payload });
		this.#obj.trigger(name, [payload]);
	}

	/**
	 * 削除
	 */
	off() {
		this.#obj.off();
	}

	/**
	 * 登録
	 * @param name イベント名
	 * @param listener 通知時に発火するイベントリスナ
	 * @param context "this"コンテキスト
	 */
	on<A extends keyof Actions>(
		name: A,
		listener: (payload: Actions[A]) => void,
		context: EditorComponent,
	) {
		this.#obj.on(name, (_, payload: Actions[A]): void => {
			// console.log('on', name, { payload });
			listener.call(context, payload);
		});
	}
}
