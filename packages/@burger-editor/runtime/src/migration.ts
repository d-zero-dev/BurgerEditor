import { options } from './options.js';

/**
 * 過去のバグへの応急対応とマイグレーション
 * @param $root ルート要素
 */
export function migration($root: JQuery<Document | HTMLElement>) {
	/**
	 * ポップアップ画像が設定されないバグの応急対応
	 *
	 * v2.12.0 から v2.12.1 までの対応
	 *
	 */
	$root.find('[data-bge-popup="true"] a').each((_, el) => {
		const $this = $(el);
		const $img = $this.find('.bgt-box__image');
		const bgi = $img.css('background-image');
		if (bgi) {
			// eslint-disable-next-line regexp/no-misleading-capturing-group
			const src = bgi.replace(/\s*url\s*\((["']?)(.+?)\1\)\s*;?\s*/i, '$2');
			$this.attr('href', src);
		}
	});

	/**
	 * target属性の値がfalseになっている問題
	 */
	$root.find('[data-bgb] [target="false"]').each((_, el) => {
		$(el).removeAttr('target');
	});

	/**
	 * 画像タイプのカラーボックス設定
	 *
	 * .bgt-colorbox は v2.4.xまで
	 * [data-bge-popup="1"] は v2.11.0まで
	 *
	 */
	const $colorbox = $root.find<HTMLAnchorElement>(
		'[data-bge-popup="true"] a, [data-bge-popup="1"] a, .bgt-colorbox',
	);
	$colorbox.each((_, el) => {
		const $el = $(el);

		const href = el.href;
		if (href) {
			el.dataset.href = href;
			el.removeAttribute('href');
			el.tabIndex = 0;
			el.role = 'button';
		}

		$el.colorbox({
			href,
			maxWidth: options.colorbox.maxWidth ?? 'auto',
			maxHeight: options.colorbox.maxHeight ?? 'auto',
			rel: 'bgt-colorbox',
			current: '{current} / {total}',
		});

		$el.on('keydown', (e) => {
			switch (e.key) {
				case 'Enter':
				case ' ': {
					e.preventDefault();
					el.click();
				}
			}
		});
	});
}
