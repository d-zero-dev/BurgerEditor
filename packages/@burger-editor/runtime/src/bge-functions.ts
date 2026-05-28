/**
 * 公開側（フロントエンド表示）のエントリポイント。
 * BurgerEditor で作成したコンテンツに含まれる Google Maps・YouTube・ギャラリーを
 * DOMContentLoaded で初期化する。管理画面のエディタコードとは完全に独立。
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
		const $root = $(root);

		migration($root);

		/**
		 * Use Google Maps
		 *
		 */
		$root.find('.bgt-google-maps').each((_, el) => void googleMaps(el));

		/**
		 * Use YouTube
		 *
		 */
		$root.find('.bgt-youtube').each((_, el) => youtube(el));

		/**
		 * Use Gallery
		 */
		$root.find('[data-bgt="gallery"]').each(options?.gallery || gallery);
	};
}

// @ts-ignore
window['BgE'] = { ...window.BgE, ...BurgerFunctions };

// eslint-disable-next-line no-restricted-syntax
window.addEventListener('DOMContentLoaded', () =>
	// @ts-ignore
	BurgerFunctions.execute(document, window['BgE'].options),
);

export { options } from './options.js';
