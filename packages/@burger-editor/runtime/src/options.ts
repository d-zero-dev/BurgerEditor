/** 公開側の初期化オプション。gallery コールバックやカラーボックス設定を外部から差し替え可能にする。 */
export interface BurgerFunctionsOptions {
	colorbox: ColorboxSettings;
	gallery?: (this: HTMLElement, i: number, el: HTMLElement) => void;
}

export const options: BurgerFunctionsOptions = {
	/**
	 * カラーボックス設定
	 *
	 */
	colorbox: {
		maxWidth: '95%',
		maxHeight: '95%',
	},
};
