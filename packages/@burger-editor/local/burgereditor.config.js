// THIS FILE IS FOR LOCAL DEVELOPMENT ONLY
import path from 'node:path';

import { defaultCatalog } from '@burger-editor/blocks';
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
	catalog: {
		...defaultCatalog,
		test: [
			{
				label: 'test',
				definition: {
					name: 'test',
					svg: 'test',
					containerProps: {
						type: 'grid',
						columns: 1,
					},
					classList: ['a', 'b', 'c'],
					style: {
						'max-width': 'full',
						'padding-inline': 'none',
					},
					items: [['wysiwyg', 'image', 'youtube']],
				},
			},
		],
	},
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
	// Virtual File Tree（仮想ファイルツリー）
	// documentRoot 配下を <id>.html のフラット運用にしつつ、Front Matter の path
	// で論理ツリーを再構築するオプション。詳細は README.md / docs/virtual-tree.md。
	// このローカル開発設定では既定どおり無効。
	virtualTree: {
		enabled: false,
		pathKey: 'path',
	},
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
			wysiwyg: {
				enableTextOnlyMode: true,
			},
		},
	},
};
