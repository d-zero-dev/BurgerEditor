/**
 * 公開側の初期化オプション。gallery の初期化処理を外部から差し替え可能にする。
 * `window.BgE.options` に置くと DOMContentLoaded の自動実行で使われる。
 * `window.BgE.execute(root, options)` の第 2 引数にも渡せる。
 * @example
 * ```html
 * <script>
 *   window.BgE = {
 *     options: {
 *       gallery(i, el) {
 *         // `this` と `el` はギャラリーのルート要素（[data-bgt="gallery"]）
 *         mySlider(el.querySelector('.bgt-gallery'));
 *       },
 *     },
 *   };
 * </script>
 * <script src="bge_functions.min.js" defer></script>
 * ```
 */
export interface BurgerFunctionsOptions {
	/**
	 * ギャラリーの初期化処理。`false` を返すと以降のギャラリーを処理しない
	 */
	gallery?: (this: HTMLElement, i: number, el: HTMLElement) => void | false;
}
