import type { BlockCatalog } from '@burger-editor/core';

/**
 * デフォルトブロックカタログ
 * 各ブロックをカテゴリごとに分類し、わかりやすい日本語名を付与
 */
export const defaultCatalog: BlockCatalog = {
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
	カード: {
		'text-image-text': 'テキスト+画像+テキスト',
	},
	ボタン: {
		button: 'ボタン',
		button2: 'ボタン x2',
		button3: 'ボタン x3',
		'download-file': 'ファイルダウンロード',
		'download-file2': 'ファイルダウンロード x2',
		'download-file3': 'ファイルダウンロード x3',
	},
	ナビゲーション: {
		'content-navigation': 'コンテンツナビゲーション',
	},
	その他: {
		table: '2カラムテーブル',
		'google-maps': 'Google Maps',
		youtube: 'YouTube',
		hr: '区切り線',
		disclosure: '折りたたみ',
	},
} as const;
