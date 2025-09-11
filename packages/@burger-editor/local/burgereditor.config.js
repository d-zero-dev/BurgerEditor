// THIS FILE IS FOR LOCAL DEVELOPMENT ONLY

import path from 'node:path';

import { config } from 'dotenv';

config();

/**
 * @type {import('@burger-editor/local').LocalServerConfig}
 */
export default {
	documentRoot: path.join(import.meta.dirname, '.test/src'),
	assetsRoot: path.join(import.meta.dirname, '.test/public'),
	lang: 'ja',
	stylesheets: ['/css/style.css'],
	classList: ['custom-class-bge-local'],
	editableArea: '.custom-class-bge-local',
	newFileContent: `
---
title: 'New Page'
---
<div class="custom-class-bge-local"></div>`,
	googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	filesDir: {
		image: '/files/images',
		other: '/files/others',
	},
	open: true,
	// 実験的機能: アイテムオプションのカスタマイズ
	experimental: {
		itemOptions: {
			button: {
				kinds: [
					// 既存のラベルを変更
					{ value: 'link', label: 'リンクボタン' },
					// 既存の選択肢を削除
					{ value: 'em', delete: true },
					// 新しい選択肢を追加
					{ value: 'primary', label: 'プライマリボタン' },
					{ value: 'secondary', label: 'セカンダリボタン' },
					{ value: 'outline', label: 'アウトラインボタン' },
					{ value: 'danger', label: '危険ボタン' },
				],
			},
		},
	},
};
