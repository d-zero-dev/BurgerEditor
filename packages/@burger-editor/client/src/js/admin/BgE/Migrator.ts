import * as BgE from '../BgE.js';

import BurgerBlock from './BurgerBlock.js';
import BurgerType from './BurgerType.js';
import Util from './Util.js';

/**
 * 旧バージョンブロック/タイプのマイグレーション。
 * 2段階構成:
 * - autoMigration: data-bge 属性名変更など、表示に影響しない安全な自動修正（常時実行）
 * - migration: HTML 構造・クラス名の変更など破壊的更新（ユーザーがボタンで明示的に実行）
 * v1.x/CbEditor 時代のコンテンツから現行フォーマットへの変換ルールを集約。
 */
// eslint-disable-next-line unicorn/no-static-only-class
export default class Migrator {
	/**
	 * 強制的なマイグレーション
	 *
	 * 強制的に書き換えてしまっても問題ないもの
	 * - data-bge属性のプロパティ名の互換対応
	 * @param $contentArea 対象のコンテンツ領域
	 * @param containerElement
	 */
	static autoMigration(containerElement: HTMLElement) {
		const $contentArea = $(containerElement);

		// download-fileタイプ v2.0.0-rc.4 までの互換
		// data-bge="url:href" を data-bge="path:href" に変換
		$contentArea
			.find('[data-bgt="download-file"] [data-bge="url:href"]')
			.each((_, el) => {
				$(el).attr('data-bge', 'path:href');
			});

		// v2.5.0 image系タイプ v2.4.x までの互換
		// hidden要素を排除してdata-bge-popup属性に移行
		// data-bge-empty属性の追加
		const selectors = [
			'[data-bgt="image"]',
			'[data-bgt="image-link"]',
			'[data-bgt="trimmed-image"]',
			'[data-bgt="trimmed-image-link"]',
		];
		$contentArea.find(selectors.join(',')).each((_, el) => {
			const $this = $(el);
			const $hidden = $this.find('[data-bge="popup"]');
			if ($hidden.length > 0) {
				const data = BurgerType.contentExport(el);
				const path = data['path'] as string;
				const popup = data['path'] as boolean;
				const $container = $this.find('>div');
				$container.attr('data-bge-popup', popup ? '1' : '0');
				$container.attr('data-bge-empty', /bg-noimage\.gif$/.test(path) ? '1' : '0');
				$container.attr('data-bge', 'popup:data-bge-popup, empty:data-bge-empty');
				$hidden.remove();
				$this.attr('data-bgt-ver', 'v2.5.0');
			}
		});

		// buttonタイプ v2.23.0 まで
		// a要素のrole属性の削除
		$contentArea.find('[data-bgt="button"] a[role]').each((_, el) => {
			$(el).removeAttr('role');
		});

		// tableタイプ v2.23.0 まで
		// table要素のsummary属性の削除
		$contentArea.find('[data-bgt="table"] table[summary]').each((_, el) => {
			$(el).removeAttr('summary');
		});
	}

	/**
	 * 古いブロックをチェックしてマイグレーションボタンを表示
	 *
	 * また、強制的に変更する部分はそれを実行する
	 * @param contentArea 表示領域（本稿 or 下書き）
	 * @param containerElement
	 */
	static check(containerElement: HTMLElement) {
		const $contentArea = $(containerElement);

		// 強制マイグレーション処理
		Migrator.autoMigration(containerElement);

		// タイプごとのバージョンチェック
		let oldVersionCount = 0;
		for (const el of $contentArea.find('[data-bgt]').toArray()) {
			const type = BurgerType.getInstance(el);
			if (!type) {
				continue;
			}
			if (type.isOld) {
				// eslint-disable-next-line no-console
				console.log(`Old Block: ${type.name}`);
				oldVersionCount++;
			}
		}
		const hasOldVersion = !!oldVersionCount;

		// 2.0.0以前のブロック・BurgerEditorで作成されていないコンテンツ
		const unknownBlockCount = $contentArea.find(
			'> :not([data-bgb]), > *[data-bgb="unknown"]',
		).length;
		const hasOldBlocks = !!unknownBlockCount;

		// eslint-disable-next-line no-console
		console.info(`Old Blocks: ${oldVersionCount}, Unknown Blocks: ${unknownBlockCount}`);

		const $ValueMigrationMessage = $('#ValueMigrationMessage').hide();
		$ValueMigrationMessage.empty();
		if (hasOldBlocks || hasOldVersion) {
			$ValueMigrationMessage.show();
			$ValueMigrationMessage.append(
				'<p>BurgerEditorで作成されていないコンテンツが含まれているか、<br>古いバージョンのブロックが使われています</p>',
			);
			$ValueMigrationMessage.append('<p>ブロックをアップデートしますか？</p>');
			const $updateButton = $('<button type="button">アップデートする</button>');
			$updateButton.appendTo($ValueMigrationMessage);
			$updateButton.on('click', async () => {
				$updateButton.html('アップデート中...<span></span>');
				$updateButton.prop('disabled', true);
				await Migrator.migration(containerElement);
				BgE.save();
				return false;
			});
		}
	}

	/**
	 * 通常の任意で行うマイグレーション
	 *
	 * HTMLの構造やクラス名など、構造・スタイルに関わるもの
	 * アップデートボタンにより呼び出される
	 * @param contentArea 対象のコンテンツ領域
	 * @param containerElement
	 */
	static async migration(containerElement: HTMLElement) {
		const $contentArea = $(containerElement);

		// タイプごとのアップデート処理
		for (const typeEl of containerElement.querySelectorAll<HTMLElement>('[data-bgt]')) {
			const type = BurgerType.getInstance(typeEl);
			if (!type) {
				throw new Error(
					'data-bgt属性を持っていますが、BurgerTypeインスタンスに紐付けられていません。',
				);
			}
			await type.upgrade();
		}

		/**
		 * unknownブロックのための処理
		 */
		// tslint:disable-next-line:only-arrow-functions
		$contentArea.find('[data-bgb="unknown"]').each(function (this: HTMLElement) {
			// tslint:disable-next-line:no-invalid-this
			const $this = $(this);
			const $targetContent = $this.find(
				'.bgb-container, .bg-editor-block-container, .cb-editor-block-container',
			);

			// download-file
			if ($targetContent.hasClass('DownloadFile')) {
				const block = new BurgerBlock('download-file');
				let data: BgE.IBurgerTypeContentData;
				const version = $this.find('[data-type-version]').attr('data-type-version') || '';
				if (
					$this.find('[data-bge]').length > 0 &&
					BgE.versionCheck.gte(version, '2.0.0')
				) {
					data = BurgerType.contentExport($this.get(0)!);
				} else {
					const val = $this.find('.bge-download-file-url').val() || '';
					data = {
						name: $this.find('.bge-download-file-name, .cbe-download-file-name').html(),
						path: Array.isArray(val) ? val[0] : val,
						size: 0,
						'formated-size': '0kB',
					};
				}
				void block.types[0]?.import(data);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// google-maps
			if ($targetContent.hasClass('GoogleMaps') || $targetContent.hasClass('GoogleMap')) {
				const block = new BurgerBlock('google-maps');
				let data: BgE.IBurgerTypeContentData;
				const version = $this.find('[data-type-version]').attr('data-type-version') || '';
				if (
					$this.find('[data-bge]').length > 0 &&
					BgE.versionCheck.gte(version, '2.10.0')
				) {
					data = BurgerType.contentExport($this.get(0)!);
				} else {
					const lat = Number.parseFloat($this.find('.bge-lat, .cbe-lat').val() as string);
					const lng = Number.parseFloat($this.find('.bge-lng, .cbe-lng').val() as string);
					data = {
						lat,
						lng,
						zoom: $this.find('.bge-zoom, .cbe-zoom').val() as string,
						url: `//maps.apple.com/?q=${lat},${lng}`,
					};
				}
				void block.types[0]?.import(data);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-link
			const convertImageLink = (_: number, el: HTMLElement) => {
				const $imgLink = $(el);
				let data: BgE.IBurgerTypeContentData;
				const version =
					$imgLink.find('[data-type-version]').attr('data-type-version') || '';
				if (
					$imgLink.find('[data-bge]').length > 0 &&
					BgE.versionCheck.gte(version, '2.0.0')
				) {
					data = BurgerType.contentExport($imgLink.get(0)!);
				} else if ($targetContent.hasClass('cb-editor-type')) {
					data = {
						path: ($imgLink.find('.cbe-image-link-url').val() as string)
							.replace('cbeditor', 'bgeditor') // cspell:disable-line
							.replace('cb-noimage.gif', 'bg-noimage.gif')
							.replace('cb-sample.png', 'bg-sample.png'),
						link: $imgLink.find('.cbe-image-link-link').val() as string,
						target: $imgLink.find('.cbe-image-link-target').val() === '1' ? '_blank' : '',
						caption: $imgLink.find('.cbe-image-link-caption').html(),
						alt: $imgLink.find('.cbe-image-link-caption').text(),
					};
				} else {
					data = {
						path: $imgLink.find('.bge-image-link-url').val() as string,
						link: $imgLink.find('.bge-image-link-link').val() as string,
						target: $imgLink.find('.bge-image-link-target').val() === '1' ? '_blank' : '',
						caption: $imgLink.find('.bge-image-link-caption').html(),
						alt: $imgLink.find('.bge-image-link-caption').text(),
					};
				}
				return data;
			};
			// image-link1
			if ($targetContent.hasClass('ImageLink1')) {
				const block = new BurgerBlock('image-link1');
				block.importTypes((i) =>
					convertImageLink(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-link2
			if ($targetContent.hasClass('ImageLink2')) {
				const block = new BurgerBlock('image-link2');
				block.importTypes((i) =>
					convertImageLink(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-link3
			if ($targetContent.hasClass('ImageLink3')) {
				const block = new BurgerBlock('image-link3');
				block.importTypes((i) =>
					convertImageLink(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-link
			const convertTrimmedImageLink = (_: number, el: HTMLElement) => {
				const $imgLink = $(el);
				let data: BgE.IBurgerTypeContentData;
				if ($imgLink.find('[data-bge]').length > 0) {
					data = BurgerType.contentExport($imgLink.get(0)!);
				} else {
					data = {
						path: $imgLink.find('.bge-image-link-trimmed-url').val() as string,
						link: $imgLink.find('.bge-image-link-trimmed-link').val() as string,
						target:
							$imgLink.find('.bge-image-link-trimmed-target').val() === '1'
								? '_blank'
								: '',
						caption: $imgLink.find('.bge-image-link-trimmed-caption').html(),
						alt: $imgLink.find('.bge-image-link-trimmed-caption').text(),
					};
				}
				return data;
			};
			// trimmed-image-link3
			if ($targetContent.hasClass('SquareImageLink2')) {
				$targetContent.removeClass('SquareImageLink2');
				const block = new BurgerBlock('trimmed-image-link2');
				block.importTypes((i) =>
					convertTrimmedImageLink(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// trimmed-image-link3
			if ($targetContent.hasClass('SquareImageLink3')) {
				$targetContent.removeClass('SquareImageLink3');
				const block = new BurgerBlock('trimmed-image-link3');
				block.importTypes((i) =>
					convertTrimmedImageLink(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image
			const convertImage = (_: number, el: HTMLElement) => {
				const $img = $(el);
				let data: BgE.IBurgerTypeContentData;
				if ($img.find('[data-bge]').length > 0) {
					data = BurgerType.contentExport($img.get(0)!);
				} else if ($targetContent.hasClass('cb-editor-type')) {
					data = {
						path: ($img.find('.cbe-image-url').val() as string)
							.replace('cbeditor', 'bgeditor') // cspell:disable-line
							.replace('cb-noimage.gif', 'bg-noimage.gif')
							.replace('cb-sample.png', 'bg-sample.png'),
						popup: $img.find('.cbe-image-popup').val() === '1',
						caption: $img.find('.cbe-image-caption').html(),
						alt: $img.find('.cbe-image-caption').text(),
					};
				} else {
					data = {
						path: $img.find('.bge-image-url').val() as string,
						popup: $img.find('.bge-image-popup').val() === '1',
						caption: $img.find('.bge-image-caption').html(),
						alt: $img.find('.bge-image-caption').text(),
					};
				}
				return data;
			};
			// image1
			if ($targetContent.hasClass('Image1')) {
				const block = new BurgerBlock('image1');
				block.importTypes((i) =>
					convertImage(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image2
			if ($targetContent.hasClass('Image2')) {
				const block = new BurgerBlock('image2');
				block.importTypes((i) =>
					convertImage(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image3
			if ($targetContent.hasClass('Image3')) {
				const block = new BurgerBlock('image3');
				block.importTypes((i) =>
					convertImage(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image4
			if ($targetContent.hasClass('Image4')) {
				const block = new BurgerBlock('image4');
				block.importTypes((i) =>
					convertImage(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image5
			if ($targetContent.hasClass('Image5')) {
				const block = new BurgerBlock('image5');
				block.importTypes((i) =>
					convertImage(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-link
			const convertTrimmedImage = (_: number, el: HTMLElement) => {
				const $imgLink = $(el);
				let data: BgE.IBurgerTypeContentData;
				if ($imgLink.find('[data-bge]').length > 0) {
					data = BurgerType.contentExport($imgLink.get(0)!);
				} else {
					data = {
						path: $imgLink.find('.bge-image-trimmed-url').val() as string,
						link: $imgLink.find('.bge-image-trimmed-link-link').val() as string,
						target:
							$imgLink.find('.bge-image-trimmed-link-target').val() === '1'
								? '_blank'
								: '',
						caption: $imgLink.find('.bge-image-trimmed-caption').html(),
						alt: $imgLink.find('.bge-image-trimmed-caption').text(),
					};
				}
				return data;
			};
			// trimmed-image2
			if ($targetContent.hasClass('SquareImage2')) {
				$targetContent.removeClass('SquareImage2');
				const block = new BurgerBlock('trimmed-image2');
				block.importTypes((i) =>
					convertTrimmedImage(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// trimmed-image3
			if ($targetContent.hasClass('SquareImage3')) {
				$targetContent.removeClass('SquareImage3');
				const block = new BurgerBlock('trimmed-image3');
				block.importTypes((i) =>
					convertTrimmedImage(
						i,
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// table
			if ($targetContent.hasClass('Table')) {
				const block = new BurgerBlock('table');
				let data: BgE.IBurgerTypeContentData;
				if ($targetContent.find('[data-bge]').length > 0) {
					data = BurgerType.contentExport($this.get(0)!);
				} else {
					data = {};
					const table = $this.find('.bge-table-full, .cbe-table-full').val() as string;
					const $table = $(table);
					$table.find('tr').each((i, el) => {
						const $tr = $(el);
						data[`th-${i}`] = $tr.find('th').html();
						data[`td-${i}`] = $tr.find('td').html();
					});
				}
				void block.types[0]?.import(data);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// text-float-image
			const convertTextFloatImage = (el: HTMLElement) => {
				const $txtImg = $(el);
				let data: BgE.IBurgerTypeContentData;
				const version =
					$txtImg.find('[data-type-version]').attr('data-type-version') || '';
				if (
					$txtImg.find('[data-bge]').length > 0 &&
					BgE.versionCheck.gte(version, '2.0.0')
				) {
					data = BurgerType.contentExport($txtImg.get(0)!);
				} else if ($targetContent.hasClass('cb-editor-block-container')) {
					data = {
						path: ($txtImg.find('.cbe-image-url').val() as string)
							.replace('cbeditor', 'bgeditor') // cspell:disable-line
							.replace('cb-noimage.gif', 'bg-noimage.gif')
							.replace('cb-sample.png', 'bg-sample.png'),
						popup: $txtImg.find('.cbe-image-popup').val() === '1',
						caption: $txtImg.find('.cbe-image-caption').html(),
						alt: $txtImg.find('.cbe-image-caption').text(),
						ckeditor: $txtImg.find('.TypeCKEditor .cbe-ckeditor').html(),
					};
				} else {
					data = {
						path: $txtImg.find('.bge-image-url').val() as string,
						popup: $txtImg.find('.bge-image-popup').val() === '1',
						caption: $txtImg.find('.bge-image-caption').html(),
						alt: $txtImg.find('.bge-image-caption').text(),
						ckeditor: $txtImg.find('.TypeCKEditor .bge-ckeditor').html(),
					};
				}
				return data;
			};
			// text-float-image1
			if ($targetContent.hasClass('TextFloatImage1')) {
				const block = new BurgerBlock('text-float-image1');
				const { path, popup, caption, alt, ckeditor } = convertTextFloatImage(
					$this.get(0)!,
				);
				void block.types[0]?.import({ path, popup, caption, alt });
				void block.types[1]?.import({ ckeditor });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// text-float-image2
			if ($targetContent.hasClass('TextFloatImage2')) {
				const block = new BurgerBlock('text-float-image2');
				const { path, popup, caption, alt, ckeditor } = convertTextFloatImage(
					$this.get(0)!,
				);
				void block.types[0]?.import({ path, popup, caption, alt });
				void block.types[1]?.import({ ckeditor });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// text-image
			const convertTextImage = (el: HTMLElement) => {
				const $txtImg = $(el);
				let data: BgE.IBurgerTypeContentData;
				const version =
					$txtImg.find('[data-type-version]').attr('data-type-version') || '';
				if (
					$txtImg.find('[data-bge]').length > 0 &&
					BgE.versionCheck.gte(version, '2.0.0')
				) {
					data = BurgerType.contentExport($txtImg.get(0)!);
				} else if ($targetContent.hasClass('cb-editor-block-container')) {
					data = {
						path: ($txtImg.find('.cbe-image-url').val() as string)
							.replace('cbeditor', 'bgeditor') // cspell:disable-line
							.replace('cb-noimage.gif', 'bg-noimage.gif')
							.replace('cb-sample.png', 'bg-sample.png'),
						popup: $txtImg.find('.cbe-image-popup').val() === '1',
						caption: $txtImg.find('.cbe-image-caption').html(),
						alt: $txtImg.find('.cbe-image-caption').text(),
						ckeditor: $txtImg.find('.TypeCKEditor .cbe-ckeditor').html(),
					};
				} else {
					data = {
						path: $txtImg.find('.bge-image-url').val() as string,
						popup: $txtImg.find('.bge-image-popup').val() === '1',
						caption: $txtImg.find('.bge-image-caption').html(),
						alt: $txtImg.find('.bge-image-caption').text(),
						ckeditor: $txtImg.find('.TypeCKEditor .bge-ckeditor').html(),
					};
				}
				return data;
			};
			// text-image1
			if ($targetContent.hasClass('TextImage1')) {
				const block = new BurgerBlock('text-image1');
				const { path, popup, caption, alt, ckeditor } = convertTextImage($this.get(0)!);
				void block.types[0]?.import({ ckeditor });
				void block.types[1]?.import({ path, popup, caption, alt });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// text-image2
			if ($targetContent.hasClass('TextImage2')) {
				const block = new BurgerBlock('text-image2');
				const { path, popup, caption, alt, ckeditor } = convertTextImage($this.get(0)!);
				void block.types[0]?.import({ path, popup, caption, alt });
				void block.types[1]?.import({ ckeditor });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// text-image2
			if ($targetContent.hasClass('TextImage2')) {
				const block = new BurgerBlock('text-image2');
				const { path, popup, caption, alt, ckeditor } = convertTextImage($this.get(0)!);
				void block.types[0]?.import({ path, popup, caption, alt });
				void block.types[1]?.import({ ckeditor });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-text2
			if ($targetContent.hasClass('Image2Text2')) {
				const block = new BurgerBlock('image-text2');
				block.importTypes((i) =>
					convertTextImage(
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-text3
			if ($targetContent.hasClass('Image3Text3')) {
				const block = new BurgerBlock('image-text3');
				block.importTypes((i) =>
					convertTextImage(
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// text-image
			const convertTextImageLink = (el: HTMLElement) => {
				const $txtImg = $(el);
				let data: BgE.IBurgerTypeContentData;
				const version =
					$txtImg.find('[data-type-version]').attr('data-type-version') || '';
				if (
					$txtImg.find('[data-bge]').length > 0 &&
					BgE.versionCheck.gte(version, '2.0.0')
				) {
					data = BurgerType.contentExport($txtImg.get(0)!);
				} else {
					data = {
						path: $txtImg.find('.bge-image-link-url').val() as string,
						link: $txtImg.find('.bge-image-link-link').val() as string,
						caption: $txtImg.find('.bge-image-link-caption').html(),
						alt: $txtImg.find('.bge-image-link-caption').text(),
						ckeditor: $txtImg.find('.TypeCKEditor .bge-ckeditor').html(),
					};
				}
				return data;
			};
			// image-text2
			if ($targetContent.hasClass('ImageLink2Text2')) {
				const block = new BurgerBlock('image-link-text2');
				block.importTypes((i) =>
					convertTextImageLink(
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// image-text3
			if ($targetContent.hasClass('ImageLink3Text3')) {
				const block = new BurgerBlock('image-link-text3');
				block.importTypes((i) =>
					convertTextImageLink(
						$this.find('.bg-editor-type, .cb-editor-type, [data-bge-type]').get(i)!,
					),
				);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// title
			if ($targetContent.hasClass('Title')) {
				// BgE/CbE共通
				const block = new BurgerBlock('title');
				void block.types[0]?.import({ 'title-h2': $this.find('h2').html() });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// title2
			if ($targetContent.hasClass('Title2')) {
				// CbEにはない
				const block = new BurgerBlock('title2');
				void block.types[0]?.import({ 'title-h3': $this.find('h3').html() });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// wysiwyg
			if ($targetContent.hasClass('Wysiwyg')) {
				let ckeditor: string;
				if ($targetContent.hasClass('cb-editor-block-container')) {
					ckeditor = $this.find('.TypeCKEditor .cbe-ckeditor').html();
				} else {
					ckeditor = $this.find('.TypeCKEditor .bge-ckeditor').html();
				}
				const block = new BurgerBlock('wysiwyg');
				void block.types[0]?.import({ ckeditor });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// wysiwyg2
			if ($targetContent.hasClass('Wysiwyg2')) {
				let wysiwygL: string;
				let wysiwygR: string;
				if ($targetContent.hasClass('cb-editor-block-container')) {
					wysiwygL = $this.find('.TypeCKEditor .cbe-ckeditor').eq(0).html();
					wysiwygR = $this.find('.TypeCKEditor .cbe-ckeditor').eq(1).html();
				} else {
					wysiwygL = $this.find('.TypeCKEditor .bge-ckeditor').eq(0).html();
					wysiwygR = $this.find('.TypeCKEditor .bge-ckeditor').eq(1).html();
				}
				const block = new BurgerBlock('wysiwyg2');
				void block.types[0]?.import({ ckeditor: wysiwygL });
				void block.types[1]?.import({ ckeditor: wysiwygR });
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// youtube
			if ($targetContent.hasClass('Youtube')) {
				const block = new BurgerBlock('youtube');
				let data: BgE.IBurgerTypeContentData;
				const version = $this.find('[data-type-version]').attr('data-type-version') || '';
				if (
					$this.find('[data-bge]').length > 0 &&
					BgE.versionCheck.gte(version, '2.0.0')
				) {
					data = BurgerType.contentExport($this.get(0)!);
				} else {
					const THUMB_URL = '//img.youtube.com/vi/';
					const THUMB_FILE_NAME = '/mqdefault.jpg'; // /0.jpgでも可能
					const url = $this.find('.bge-youtube-url, .cbe-youtube-url').val() as string;
					const id = Util.parseYTId(url);
					const thumb = THUMB_URL + id + THUMB_FILE_NAME;
					data = {
						id,
						thumb,
					};
				}
				void block.types[0]?.import(data);
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
			// button
			if ($targetContent.hasClass('Button')) {
				const block = new BurgerBlock('button');
				void block.types[0]?.import(BurgerType.contentExport($this.get(0)!));
				block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
				block.importCustomClassList(
					BurgerBlock.extractCustomClass($targetContent.get(0)!),
				);
				block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
				$this.after(block.node);
				$this.remove();
			}
		});

		$contentArea.find('[data-bgb="unknown"]').each((_, el) => {
			const $targetContent = $(el);
			const ckeditor = $targetContent.find('.bge-ckeditor').html();
			const block = new BurgerBlock('wysiwyg');
			void block.types[0]?.import({ ckeditor });
			block.importOptions(BurgerBlock.extractOptions($targetContent.get(0)!));
			block.importCustomClassList(BurgerBlock.extractCustomClass($targetContent.get(0)!));
			block.importId(BurgerBlock.extractId($targetContent.get(0)!));
			block.importGridInfo(BurgerBlock.extractGridRatio($targetContent.get(0)!));
			$targetContent.after(block.node);
			$targetContent.remove();
		});

		$('#ValueMigrationMessage')
			.html(
				'<p>アップデートに成功しました。</p><p>この変更を公開側に反映するには「保存」する必要があります。</p>',
			)
			.addClass('bge-vmm--success');
	}
}
