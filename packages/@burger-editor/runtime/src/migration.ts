import { imagePopup } from './libs/image-popup.js';

/**
 * 過去のバグへの応急対応とマイグレーション
 * @param root ルート要素
 */
export function migration(root: Document | HTMLElement) {
	/**
	 * ポップアップ画像が設定されないバグの応急対応
	 *
	 * v2.12.0 から v2.12.1 までの対応
	 *
	 */
	// バインド済みのリンクは href を data-href へ移した後なので触らない（二度目の実行で
	// href が戻らないようにする）
	for (const el of root.querySelectorAll<HTMLAnchorElement>(
		'[data-bge-popup="true"] a:not([data-bge-popup-bound])',
	)) {
		const img = el.querySelector<HTMLElement>('.bgt-box__image');
		if (!img) {
			continue;
		}
		// 背景画像が無いとき計算済みの値は 'none' になるので、url() が取れたときだけ書き換える
		// eslint-disable-next-line regexp/no-misleading-capturing-group
		const src = /\s*url\s*\((["']?)(.+?)\1\)\s*;?\s*/i.exec(
			getComputedStyle(img).backgroundImage,
		)?.[2];
		if (src) {
			el.setAttribute('href', src);
		}
	}

	/**
	 * target属性の値がfalseになっている問題
	 */
	for (const el of root.querySelectorAll('[data-bgb] [target="false"]')) {
		el.removeAttribute('target');
	}

	/**
	 * 画像タイプのポップアップ
	 *
	 * .bgt-colorbox は v2.4.xまで
	 * [data-bge-popup="1"] は v2.11.0まで
	 *
	 */
	imagePopup(root);
}
