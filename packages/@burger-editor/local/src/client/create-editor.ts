import type { AppType } from '../route.js';

import { blocks, generalCSS, items } from '@burger-editor/blocks';
import { createBurgerEditorClient } from '@burger-editor/client';
import '@burger-editor/client/style';
import { hc } from 'hono/client';

import { $upload } from '../helpers/$upload.js';

const client = hc<AppType>(location.origin);

/**
 *
 */
export async function createEditor() {
	const configRes = await client['config.json'].$get();
	const config = await configRes.json();

	if (__DEBUG__) {
		// eslint-disable-next-line no-console
		console.log('config', config);
	}

	const mainInput = document.getElementById('main') as HTMLInputElement;

	await createBurgerEditorClient({
		root: '.editor',
		config: {
			...config,
			stylesheets: ['/client.css', ...config.stylesheets],
		},
		blocks,
		items,
		generalCSS,
		catalog: {
			'見出し / テキスト / テキスト+画像': {
				title: '大見出し',
				title2: '中見出し',
				wysiwyg: '1カラムテキスト',
				wysiwyg2: '2カラムテキスト',
				'text-float-image1': '画像右寄せ: テキスト回り込み',
				'text-float-image2': '画像左寄せ: テキスト回り込み',
				'text-image1': '画像右寄せ: テキスト回り込み無し',
				'text-image2': '画像左寄せ: テキスト回り込み無し',
			},
			画像: {
				image: '画像1列',
				image2: '画像2列',
				image3: '画像3列',
				image4: '画像4列',
				image5: '画像5列',
			},
			'画像+テキスト': {
				'image-text2': '画像2列: テキスト付',
				'image-text3': '画像3列: テキスト付',
				'image-text4': '画像4列: テキスト付',
				'image-text5': '画像5列: テキスト付',
			},
			ボタン: {
				button: 'ボタン',
				button2: 'ボタン x2',
				button3: 'ボタン x3',
				'download-file': 'ファイルダウンロード',
				'download-file2': 'ファイルダウンロード x2',
				'download-file3': 'ファイルダウンロード x3',
			},
			その他: {
				table: '2カラムテーブル',
				'google-maps': 'Google Maps',
				youtube: 'YouTube',
				hr: '区切り線',
			},
		},
		initialContents: mainInput.value,
		async onUpdated(content) {
			if (mainInput.value === content) {
				return;
			}

			mainInput.value = content;

			const res = await client.api.content.$post({
				json: {
					path: location.pathname,
					content,
				},
			});

			const json = await res.json();
			if (!json.saved) {
				// eslint-disable-next-line no-console
				console.error(`Failed to save: ${json.path}`);
				return;
			}

			// eslint-disable-next-line no-console
			console.log(`Saved: ${json.path}`);
		},
		fileIO: {
			async getFileList(fileType, options) {
				const res = await client.api.file.list.$post({
					json: {
						type: fileType,
						filter: options.filter,
						page: options.page,
						selected: options.selected,
					},
				});
				return await res.json();
			},
			async postFile(fileType, file, progress) {
				const res = await $upload(client.api.file.upload)(
					{
						type: fileType,
						file,
					},
					progress,
				);
				return res;
			},
			async deleteFile(fileType, url) {
				const res = await client.api.file.$delete({
					json: {
						type: fileType,
						url,
					},
				});
				return await res.json();
			},
		},
	});
}
