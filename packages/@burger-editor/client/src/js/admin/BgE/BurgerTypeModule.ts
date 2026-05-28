import type BurgerType from './BurgerType.js';
import type * as BgE from '../BgE.js';
import type TypeEditorDialog from './editorDialog/TypeEditorDialog.js';

/**
 * Addon/type/{name}/init.ts から registerTypeModule() に渡すオプション。
 * タイプ固有のライフサイクルフック（ダイアログ開閉・データ変換・マイグレーション）を定義する。
 * すべてのフックはオプショナルで、未定義なら何もしない。
 */
export interface IBurgerTypeModuleConstructorOption {
	/**
	 * モジュール間で共通で使用するデータ
	 *
	 */
	data?: { [customProperty: string]: unknown };

	/**
	 * カスタム関数
	 */
	customFunctions?: IBurgerTypeModuleConstructorOptionCustomFunctions;

	/**
	 * 編集ダイアログを開いた際にコンテンツのデータが編集ダイアログに反映される前に呼び出される
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	beforeOpen?(editorDialog: TypeEditorDialog, type: BurgerType): void;

	/**
	 * 編集ダイアログを開いた際に呼び出される
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	open?(editorDialog: TypeEditorDialog, type: BurgerType): void;

	/**
	 * 編集ダイアログを保存する際に編集要素からデータを取得する前に呼び出される
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	beforeExtract?(editorDialog: TypeEditorDialog, type: BurgerType): void;

	/**
	 * 編集ダイアログを保存してコンテンツにデータが反映される前に呼び出される
	 * @param newValues 新しい入力データ
	 * @param type 対象のタイプ
	 */
	beforeChange?(
		newValues: BgE.IBurgerTypeContentData,
		type: BurgerType,
	): Promise<void> | void;

	/**
	 * 編集ダイアログを保存してコンテンツにデータが反映された際に呼び出される
	 * @param values 新しい入力データ
	 * @param type 対象のタイプ
	 */
	change?(values: BgE.IBurgerTypeContentData, type: BurgerType): Promise<void> | void;

	/**
	 * マイグレーション
	 * @param currentVersion 現在のバージョン
	 * @param oldData 古いデータ
	 * @param type 対象のタイプ
	 */
	migrate?(type: BurgerType): BgE.IBurgerTypeContentData;

	/**
	 * マイグレーション
	 *
	 */
	migrateElement?(
		data: BgE.IBurgerTypeContentData,
		type: BurgerType,
	): Promise<void> | void;

	/**
	 * 無効になっているかメッセージを返す
	 *
	 * 有効の場合は空文字列を返す
	 */
	isDisable?(type: BurgerType): string;
}

/**
 * タイプモジュールで定義されるカスタム関数
 */
export interface IBurgerTypeModuleConstructorOptionCustomFunctions {
	[funcName: string]: (
		e: JQuery.Event,
		editorDialog: TypeEditorDialog,
		type: BurgerType,
		module: BurgerTypeModule,
		...args: unknown[]
	) => unknown;
}

/**
 * タイプ固有のライフサイクルフックとカスタム関数を保持するコンテナ。
 * Addon 側が registerTypeModule() で注入したコールバックを、
 * TypeEditorDialog や BurgerType から間接的に呼び出す仲介役。
 */
export default class BurgerTypeModule {
	/**
	 * カスタム関数
	 */
	customFunctions: IBurgerTypeModuleConstructorOptionCustomFunctions = {};

	/**
	 * 編集ダイアログを保存してコンテンツにデータが反映される前に呼び出される
	 * @param newValues 新しい入力データ
	 * @param type 対象のタイプ
	 */
	#beforeChange?: (
		newValues: BgE.IBurgerTypeContentData,
		type: BurgerType,
	) => Promise<void> | void;
	/**
	 * 編集ダイアログを保存する際に編集要素からデータを取得する前に呼び出される
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	#beforeExtract?: (editorDialog: TypeEditorDialog, type: BurgerType) => void;
	/**
	 * 編集ダイアログを開いた際にコンテンツのデータが編集ダイアログに反映される前に呼び出される
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	#beforeOpen?: (
		editorDialog: TypeEditorDialog,
		type: BurgerType,
		data?: BgE.IBurgerTypeContentData,
	) => void;

	/**
	 * 編集ダイアログを保存してコンテンツにデータが反映された際に呼び出される
	 * @param values 新しい入力データ
	 * @param type 対象のタイプ
	 */
	#change?: (
		values: BgE.IBurgerTypeContentData,
		type: BurgerType,
	) => Promise<void> | void;
	/**
	 * カスタムデータ
	 */
	#data: { [customProperty: string]: unknown } | null = null;
	/**
	 * 無効になっているかメッセージを返す
	 *
	 * 有効の場合は空文字列を返す
	 */
	#isDisable?: (type: BurgerType) => string;
	/**
	 * マイグレーション
	 * @param currentVersion 現在のバージョン
	 * @param oldData 古いデータ
	 * @param type 対象のタイプ
	 */
	#migrate?: (type: BurgerType) => BgE.IBurgerTypeContentData;
	/**
	 * マイグレーション
	 *
	 */
	#migrateElement?: (
		data: BgE.IBurgerTypeContentData,
		type: BurgerType,
	) => Promise<void> | void;
	/**
	 * 編集ダイアログを開いた際に呼び出される
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	#open?: (editorDialog: TypeEditorDialog, type: BurgerType) => void;

	/**
	 * コンストラクタ
	 * @param option タイプモジュール生成オプション
	 */
	constructor(option: IBurgerTypeModuleConstructorOption = {}) {
		if (option.beforeOpen) {
			this.#beforeOpen = option.beforeOpen;
		}
		if (option.open) {
			this.#open = option.open;
		}
		if (option.beforeExtract) {
			this.#beforeExtract = option.beforeExtract;
		}
		if (option.beforeChange) {
			this.#beforeChange = option.beforeChange;
		}
		if (option.change) {
			this.#change = option.change;
		}
		if (option.migrate) {
			this.#migrate = option.migrate;
		}
		if (option.migrateElement) {
			this.#migrateElement = option.migrateElement;
		}
		if (option.isDisable) {
			this.#isDisable = option.isDisable;
		}
		this.customFunctions = option.customFunctions || {};
		this.#data = option.data || null;
	}

	/**
	 * 編集ダイアログを保存してコンテンツにデータが反映される前に呼び出されるコールバックを実行する
	 *
	 * コールバックが登録されていない場合はなにもしない
	 * @param newValues 新しい入力データ
	 * @param type 対象のタイプ
	 */
	async beforeChange(newValues: BgE.IBurgerTypeContentData, type: BurgerType) {
		if (this.#beforeChange) {
			await this.#beforeChange(newValues, type);
		}
	}

	/**
	 * 編集ダイアログを保存する際に編集要素からデータを取得する前に呼び出される
	 *
	 * コールバックが登録されていない場合はなにもしない
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	beforeExtract(editorDialog: TypeEditorDialog, type: BurgerType) {
		if (this.#beforeExtract) {
			this.#beforeExtract(editorDialog, type);
		}
	}

	/**
	 * 編集ダイアログを開いた際にコンテンツのデータが編集ダイアログに反映される前に呼び出されるコールバックを実行する
	 *
	 * コールバックが登録されていない場合はなにもしない
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 * @param data
	 */
	beforeOpen(
		editorDialog: TypeEditorDialog,
		type: BurgerType,
		data?: BgE.IBurgerTypeContentData,
	) {
		if (this.#beforeOpen) {
			this.#beforeOpen(editorDialog, type, data);
		}
	}

	/**
	 * 編集ダイアログを保存してコンテンツにデータが反映された際に呼び出されるコールバックを実行する
	 *
	 * コールバックが登録されていない場合はなにもしない
	 * @param values 新しい入力データ
	 * @param type 対象のタイプ
	 */
	async change(values: BgE.IBurgerTypeContentData, type: BurgerType) {
		if (this.#change) {
			await this.#change(values, type);
		}
	}

	/**
	 * カスタム関数を発火させる
	 * @param customFunctionName
	 * @param editorDialog
	 * @param type
	 * @param module
	 * @param {...unknown[]} args
	 */
	fire(
		customFunctionName: string,
		editorDialog: TypeEditorDialog,
		type: BurgerType,
		module: BurgerTypeModule,
		...args: unknown[]
	) {
		const e: JQuery.Event = new $.Event(customFunctionName);
		if (customFunctionName in this.customFunctions) {
			return this.customFunctions[customFunctionName]?.call(
				this,
				e,
				editorDialog,
				type,
				module,
				...args,
			);
		}
		return;
	}

	/**
	 * カスタムデータを参照する
	 * @param customProperty
	 */
	getData(customProperty: string) {
		if (this.#data && customProperty in this.#data) {
			return this.#data[customProperty];
		}
		return;
	}

	/**
	 * 無効になっているかメッセージを返す
	 *
	 * 有効の場合は空文字列を返す
	 * @param type
	 */
	isDisable(type: BurgerType) {
		if (this.#isDisable) {
			return this.#isDisable(type);
		}
		return '';
	}

	/**
	 * マイグレーション
	 * @param currentVersion 現在のバージョン
	 * @param oldData 古いデータ
	 * @param type 対象のタイプ
	 */
	migrate(type: BurgerType): BgE.IBurgerTypeContentData {
		return this.#migrate ? this.#migrate(type) : type.export();
	}

	async migrateElement(data: BgE.IBurgerTypeContentData, type: BurgerType) {
		if (this.#migrateElement) {
			await this.#migrateElement(data, type);
		}
	}

	/**
	 * 編集ダイアログを開いた際に呼び出されるコールバックを実行する
	 *
	 * コールバックが登録されていない場合はなにもしない
	 * @param editorDialog 編集ダイアログ
	 * @param type 対象のタイプ
	 */
	open(editorDialog: TypeEditorDialog, type: BurgerType) {
		if (this.#open) {
			this.#open(editorDialog, type);
		}
	}

	// tslint:enable:no-any trailing-comma

	/**
	 * カスタムデータにデータを登録する
	 */

	// tslint:disable-next-line:no-any
	setData(customProperty: string, value: unknown) {
		if (this.#data && customProperty in this.#data) {
			this.#data[customProperty] = value;
		}
	}
}
