import type { BlockCatalog } from '@burger-editor/core';

// 全ブロックのアイコンをインポート
import button3Icon from '../icons/button3.svg';
import contentNavigationIcon from '../icons/content-navigation.svg';
import disclosureIcon from '../icons/disclosure.svg';
import downloadFile3Icon from '../icons/download-file3.svg';
import googleMapsIcon from '../icons/google-maps.svg';
import hrIcon from '../icons/hr.svg';
import imageText3Icon from '../icons/image-text3.svg';
import imageIcon from '../icons/image.svg';
import tableIcon from '../icons/table.svg';
import textFloatImage1Icon from '../icons/text-float-image1.svg';
import textFloatImage2Icon from '../icons/text-float-image2.svg';
import textImageTextIcon from '../icons/text-image-text.svg';
import textImage1Icon from '../icons/text-image1.svg';
import textImage2Icon from '../icons/text-image2.svg';
import titleIcon from '../icons/title.svg';
import title2Icon from '../icons/title2.svg';
import wysiwygIcon from '../icons/wysiwyg.svg';
import youtubeIcon from '../icons/youtube.svg';

export const defaultCatalog: BlockCatalog = {
	見出し: [
		{
			label: '大見出し',
			definition: {
				name: 'h2',
				svg: titleIcon,
				containerProps: {
					immutable: true,
				},
				items: [['title-h2']],
			},
		},
		{
			label: '中見出し',
			definition: {
				name: 'h3',
				svg: title2Icon,
				containerProps: {
					immutable: true,
				},
				items: [['title-h3']],
			},
		},
	],
	基本ブロック: [
		{
			label: 'テキスト',
			definition: {
				name: 'wysiwyg',
				svg: wysiwygIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
					autoRepeat: 'auto-fit',
				},
				items: [['wysiwyg']],
			},
		},
		{
			label: '画像',
			definition: {
				name: 'image',
				svg: imageIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
					autoRepeat: 'auto-fit',
				},
				items: [['image']],
			},
		},
		{
			label: '折りたたみ',
			definition: {
				name: 'disclosure',
				svg: disclosureIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
					autoRepeat: 'auto-fit',
				},
				items: [['details']],
			},
		},
		{
			label: 'テーブル',
			definition: {
				name: 'table',
				svg: tableIcon,
				containerProps: {
					immutable: true,
				},
				items: [['table']],
			},
		},
		{
			label: 'YouTube',
			definition: {
				name: 'youtube',
				svg: youtubeIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
					autoRepeat: 'auto-fit',
				},
				items: [['youtube']],
			},
		},
	],
	カード: [
		{
			label: '画像 + テキスト',
			definition: {
				name: 'image-text',
				svg: imageText3Icon,
				containerProps: {
					type: 'grid',
					columns: 3,
					autoRepeat: 'auto-fit',
				},
				items: [
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
				],
			},
		},
		{
			label: 'テキスト+画像+テキスト',
			definition: {
				name: 'text-image-text',
				svg: textImageTextIcon,
				containerProps: {
					type: 'grid',
					columns: 3,
					autoRepeat: 'auto-fit',
				},
				items: [
					[{ name: 'wysiwyg', data: { wysiwyg: '<h2>見出し</h2>' } }, 'image', 'wysiwyg'],
					[{ name: 'wysiwyg', data: { wysiwyg: '<h2>見出し</h2>' } }, 'image', 'wysiwyg'],
					[{ name: 'wysiwyg', data: { wysiwyg: '<h2>見出し</h2>' } }, 'image', 'wysiwyg'],
				],
			},
		},
	],
	'画像+テキスト': [
		{
			label: '画像右寄せ: テキスト回り込み',
			definition: {
				name: 'text-float-image-end',
				svg: textFloatImage1Icon,
				containerProps: {
					type: 'float',
					float: 'end',
				},
				items: [
					[
						{
							name: 'image',
							data: {
								scale: 50,
								cssWidth: '50cqi',
								style: '--css-width:50cqi;--object-fit:cover;--aspect-ratio:unset',
							},
						},
					],
					['wysiwyg'],
				],
			},
		},
		{
			label: '画像左寄せ: テキスト回り込み',
			definition: {
				name: 'text-float-image-start',
				svg: textFloatImage2Icon,
				containerProps: {
					type: 'float',
					float: 'start',
				},
				items: [
					[
						{
							name: 'image',
							data: {
								scale: 50,
								cssWidth: '50cqi',
								style: '--css-width:50cqi;--object-fit:cover;--aspect-ratio:unset',
							},
						},
					],
					['wysiwyg'],
				],
			},
		},
		{
			label: '画像右寄せ: テキスト回り込み無し',
			definition: {
				name: 'text-start-image-end',
				svg: textImage1Icon,
				containerProps: {
					immutable: true,
					wrap: 'nowrap',
				},
				items: [
					['wysiwyg'],
					[
						{
							name: 'image',
							data: {
								scale: 50,
								cssWidth: '50cqi',
								style: '--css-width:50cqi;--object-fit:cover;--aspect-ratio:unset',
							},
						},
					],
				],
			},
		},
		{
			label: '画像左寄せ: テキスト回り込み無し',
			definition: {
				name: 'image-start-text-end',
				svg: textImage2Icon,
				containerProps: {
					immutable: true,
					wrap: 'nowrap',
				},
				items: [
					[
						{
							name: 'image',
							data: {
								scale: 50,
								cssWidth: '50cqi',
								style: '--css-width:50cqi;--object-fit:cover;--aspect-ratio:unset',
							},
						},
					],
					['wysiwyg'],
				],
			},
		},
	],
	ボタン: [
		{
			label: 'ボタン',
			definition: {
				name: 'button',
				svg: button3Icon,
				containerProps: {
					justify: 'center',
					wrap: 'wrap',
				},
				items: [['button'], ['button'], ['button']],
			},
		},
		{
			label: 'テキストリンク',
			definition: {
				name: 'button',
				svg: button3Icon,
				containerProps: {
					frameSemantics: 'ul',
					justify: 'start',
					wrap: 'wrap',
				},
				items: [
					[
						{
							name: 'button',
							data: { kind: 'text', text: 'テキストリンク' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'text', text: 'テキストリンク' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'text', text: 'テキストリンク' },
						},
					],
				],
			},
		},
		{
			label: 'ファイルダウンロード',
			definition: {
				name: 'file',
				svg: downloadFile3Icon,
				containerProps: {
					justify: 'center',
					wrap: 'wrap',
				},
				items: [['download-file'], ['download-file'], ['download-file']],
			},
		},
		{
			label: 'コンテンツナビゲーション',
			definition: {
				name: 'content-navigation',
				svg: contentNavigationIcon,
				containerProps: {
					frameSemantics: 'ul',
					type: 'grid',
					columns: 4,
					autoRepeat: 'auto-fit',
				},
				items: [
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ1', link: '#content1' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ2', link: '#content2' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ3', link: '#content3' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ4', link: '#content4' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ5', link: '#content5' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ6', link: '#content6' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ7', link: '#content7' },
						},
					],
					[
						{
							name: 'button',
							data: { kind: 'in-page', text: 'コンテンツ8', link: '#content8' },
						},
					],
				],
			},
		},
	],
	その他: [
		{
			label: 'Google Maps',
			definition: {
				name: 'google-maps',
				svg: googleMapsIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
					autoRepeat: 'auto-fit',
				},
				items: [['google-maps']],
			},
		},
		{
			label: '区切り線',
			definition: {
				name: 'hr',
				svg: hrIcon,
				containerProps: {
					immutable: true,
				},
				items: [['hr']],
			},
		},
	],
} as const;
