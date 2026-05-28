import * as BgE from '../BgE.js';

/**
 * オプションのCSSクラス情報
 */
export interface IOptionClass {
	/**
	 * 表示用のラベル
	 */
	label: string;

	/**
	 * CSSで使用するクラス名
	 */
	className: string;
}

/**
 * ブロックに付与可能な CSS クラスオプション（余白・背景色・枠線等）を管理する。
 * PHP の option.php で定義された `bgb-opt--*` プレフィックス付きクラスと対応し、
 * BlockConfigDialog のセレクトボックスで選択→ブロック要素の class 属性に反映する。
 */
export default class BlockOption {
	/**
	 * CSSクラスのリスト
	 */
	classList: IOptionClass[] = [];

	/**
	 * 選択中のクラス
	 */
	currentClass: IOptionClass | null = null;

	/**
	 * オプション名
	 */
	optionName: string;

	/**
	 * コンストラクタ
	 * @param optionName
	 * @param optionValues
	 */
	constructor(optionName: string, optionValues: Record<string, string>) {
		this.optionName = optionName;
		for (const valueName of Object.keys(optionValues)) {
			const className = valueName;
			// 「指定なし」は valueNameが空
			if (!className || !optionValues[className]) {
				continue;
			}
			if (className.indexOf(BlockOption.classPrefix) !== 0) {
				// eslint-disable-next-line no-console
				console.warn(
					`Invalid Error: "${optionName}" オプションは "${BlockOption.classPrefix}" で開始される必要があります。` +
						` "${className}" は無効化されました。`,
				);
				break;
			}
			this.classList.push({
				label: optionValues[className] ?? 'N/A',
				className,
			});
		}
	}

	/**
	 * 現在選択されているクラスを取得
	 */
	getClass() {
		return this.currentClass;
	}

	/**
	 * クラス名を設定
	 * @param className
	 */
	setClass(className: string) {
		for (const classInfo of this.classList) {
			if (classInfo.className === className) {
				this.currentClass = classInfo;
				return;
			}
		}
		// eslint-disable-next-line no-console
		console.warn(
			`"${className}" というクラス名は オプション "${this.optionName}" には設定できませんでした。`,
		);
	}

	/**
	 * CSSクラス名のプレフィックス
	 */
	static classPrefix = 'bgb-opt--';

	/**
	 * オプションで使われているクラス名を探してオプションを取得する
	 * @param className 検索するクラス名
	 * @returns 検索したクラス名を有するオプション
	 */
	static getOption(className: string) {
		let option: BlockOption | null = null;
		if (BgE.config.blockClassOption) {
			for (const optionName of Object.keys(BgE.config.blockClassOption)) {
				const blockOption = BgE.config.blockClassOption[optionName];
				if (!blockOption) {
					continue;
				}
				for (const optionValue of Object.keys(blockOption)) {
					const classOption = BgE.config.blockClassOption[optionName];
					if (optionValue === className && classOption) {
						option = new BlockOption(optionName, classOption);
						option.setClass(className);
						break;
					}
				}
			}
		}
		return option;
	}
}
