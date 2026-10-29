/**
 * 公開側（フロントエンド表示）のエントリポイント。
 * BurgerEditor で作成したコンテンツに含まれる画像のポップアップ・Google Maps・YouTube・ギャラリーを
 * DOMContentLoaded で初期化する。管理画面のエディタコードとは完全に独立で、
 * jQuery などのライブラリをページに読み込む必要はない。
 * window.BgE.execute() として外部からも呼べるようにしている。
 * @module
 */
import type { BurgerFunctionsOptions } from './options.js';

import { gallery } from './libs/gallery.js';
import { googleMaps } from './libs/google-maps.js';
import { youtube } from './libs/youtube.js';
import { migration } from './migration.js';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace BurgerFunctions {
	export const execute = (
		root: Document | HTMLElement,
		options?: BurgerFunctionsOptions,
	) => {
		migration(root);

		/**
		 * Use Google Maps
		 *
		 */
		for (const el of root.querySelectorAll<HTMLElement>('.bgt-google-maps')) {
			void googleMaps(el);
		}

		/**
		 * Use YouTube
		 *
		 */
		for (const el of root.querySelectorAll<HTMLElement>('.bgt-youtube')) {
			youtube(el);
		}

		/**
		 * Use Gallery
		 */
		const initGallery = options?.gallery || gallery;
		const galleries = root.querySelectorAll<HTMLElement>('[data-bgt="gallery"]');
		for (const [i, el] of galleries.entries()) {
			// 差し替えた処理が false を返したら以降を処理しない
			if (initGallery.call(el, i, el) === false) {
				break;
			}
		}
	};
}

// @ts-ignore
window['BgE'] = { ...window.BgE, ...BurgerFunctions };

// eslint-disable-next-line no-restricted-syntax
window.addEventListener('DOMContentLoaded', () =>
	// @ts-ignore
	BurgerFunctions.execute(document, window['BgE'].options),
);
