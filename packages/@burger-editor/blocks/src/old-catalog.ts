import type { BlockCatalog } from '@burger-editor/core';

import buttonIcon from './icons/button.svg';
import button2Icon from './icons/button2.svg';
import button3Icon from './icons/button3.svg';
import contentNavigationIcon from './icons/content-navigation.svg';
import disclosureIcon from './icons/disclosure.svg';
import downloadFileIcon from './icons/download-file.svg';
import downloadFile2Icon from './icons/download-file2.svg';
import downloadFile3Icon from './icons/download-file3.svg';
import googleMapsIcon from './icons/google-maps.svg';
import hrIcon from './icons/hr.svg';
import imageText2Icon from './icons/image-text2.svg';
import imageText3Icon from './icons/image-text3.svg';
import imageText4Icon from './icons/image-text4.svg';
import imageText5Icon from './icons/image-text5.svg';
import imageIcon from './icons/image.svg';
import image2Icon from './icons/image2.svg';
import image3Icon from './icons/image3.svg';
import image4Icon from './icons/image4.svg';
import image5Icon from './icons/image5.svg';
import tableIcon from './icons/table.svg';
import textFloatImage1Icon from './icons/text-float-image1.svg';
import textFloatImage2Icon from './icons/text-float-image2.svg';
import textImageTextIcon from './icons/text-image-text.svg';
import textImage1Icon from './icons/text-image1.svg';
import textImage2Icon from './icons/text-image2.svg';
import titleIcon from './icons/title.svg';
import title2Icon from './icons/title2.svg';
import wysiwygIcon from './icons/wysiwyg.svg';
import wysiwyg2Icon from './icons/wysiwyg2.svg';
import youtubeIcon from './icons/youtube.svg';

export const oldCatalog: BlockCatalog = {
	'見出し / テキスト / テキスト+画像': [
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
		{
			label: '1カラムテキスト',
			definition: {
				name: 'wysiwyg',
				svg: wysiwygIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
				},
				items: [['wysiwyg']],
			},
		},
		{
			label: '2カラムテキスト',
			definition: {
				name: 'wysiwyg',
				svg: wysiwyg2Icon,
				containerProps: {
					type: 'grid',
					columns: 2,
				},
				items: [['wysiwyg'], ['wysiwyg']],
			},
		},
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
	画像: [
		{
			label: '画像1列',
			definition: {
				name: 'image',
				svg: imageIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
				},
				items: [['image']],
			},
		},
		{
			label: '画像2列',
			definition: {
				name: 'image',
				svg: image2Icon,
				containerProps: {
					type: 'grid',
					columns: 2,
				},
				items: [['image'], ['image']],
			},
		},
		{
			label: '画像3列',
			definition: {
				name: 'image',
				svg: image3Icon,
				containerProps: {
					type: 'grid',
					columns: 3,
				},
				items: [['image'], ['image'], ['image']],
			},
		},
		{
			label: '画像4列',
			definition: {
				name: 'image',
				svg: image4Icon,
				containerProps: {
					type: 'grid',
					columns: 4,
				},
				items: [['image'], ['image'], ['image'], ['image']],
			},
		},
		{
			label: '画像5列',
			definition: {
				name: 'image',
				svg: image5Icon,
				containerProps: {
					type: 'grid',
					columns: 5,
				},
				items: [['image'], ['image'], ['image'], ['image'], ['image']],
			},
		},
	],
	'画像+テキスト': [
		{
			label: '画像2列: テキスト付',
			definition: {
				name: 'image-text',
				svg: imageText2Icon,
				containerProps: {
					type: 'grid',
					columns: 2,
				},
				items: [
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
				],
			},
		},
		{
			label: '画像3列: テキスト付',
			definition: {
				name: 'image-text',
				svg: imageText3Icon,
				containerProps: {
					type: 'grid',
					columns: 3,
				},
				items: [
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
				],
			},
		},
		{
			label: '画像4列: テキスト付',
			definition: {
				name: 'image-text4',
				svg: imageText4Icon,
				containerProps: {
					type: 'grid',
					columns: 4,
				},
				items: [
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
				],
			},
		},
		{
			label: '画像5列: テキスト付',
			definition: {
				name: 'image-text',
				svg: imageText5Icon,
				containerProps: {
					type: 'grid',
					columns: 5,
				},
				items: [
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
					['image', 'wysiwyg'],
				],
			},
		},
	],
	カード: [
		{
			label: 'テキスト+画像+テキスト',
			definition: {
				name: 'text-image-text',
				svg: textImageTextIcon,
				containerProps: {
					type: 'grid',
					columns: 3,
				},
				items: [
					[{ name: 'wysiwyg', data: { wysiwyg: '<h3>見出し</h3>' } }, 'image', 'wysiwyg'],
					[{ name: 'wysiwyg', data: { wysiwyg: '<h3>見出し</h3>' } }, 'image', 'wysiwyg'],
					[{ name: 'wysiwyg', data: { wysiwyg: '<h3>見出し</h3>' } }, 'image', 'wysiwyg'],
				],
			},
		},
	],
	ボタン: [
		{
			label: 'ボタン',
			definition: {
				name: 'button',
				svg: buttonIcon,
				containerProps: {
					justify: 'center',
					wrap: 'wrap',
				},
				items: [['button']],
			},
		},
		{
			label: 'ボタン x2',
			definition: {
				name: 'button',
				svg: button2Icon,
				containerProps: {
					justify: 'center',
					wrap: 'wrap',
				},
				items: [['button'], ['button']],
			},
		},
		{
			label: 'ボタン x3',
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
			label: 'ファイルダウンロード',
			definition: {
				name: 'file',
				svg: downloadFileIcon,
				containerProps: {
					justify: 'center',
					wrap: 'wrap',
				},
				items: [['download-file']],
			},
		},
		{
			label: 'ファイルダウンロード x2',
			definition: {
				name: 'file',
				svg: downloadFile2Icon,
				containerProps: {
					justify: 'center',
					wrap: 'wrap',
				},
				items: [['download-file'], ['download-file']],
			},
		},
		{
			label: 'ファイルダウンロード x3',
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
	],
	ナビゲーション: [
		{
			label: 'コンテンツナビゲーション',
			definition: {
				name: 'content-navigation',
				svg: contentNavigationIcon,
				containerProps: {
					type: 'grid',
					columns: 4,
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
			label: '2カラムテーブル',
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
			label: 'Google Maps',
			definition: {
				name: 'google-maps',
				svg: googleMapsIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
				},
				items: [['google-maps']],
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
				},
				items: [['youtube']],
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
		{
			label: '折りたたみ',
			definition: {
				name: 'disclosure',
				svg: disclosureIcon,
				containerProps: {
					type: 'grid',
					columns: 1,
				},
				items: [['details']],
			},
		},
	],
} as const;
