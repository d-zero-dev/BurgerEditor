import type { Config } from '@burger-editor/core';

import { Item } from '@burger-editor/core';
import { test, expect, describe, beforeEach } from 'vitest';

import imageItemSeed from './definition.js';

type ImageItemData = typeof imageItemSeed._;

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
};

describe('imageItemSeed', () => {
	beforeEach(() => {
		// Clean up the document body
		document.body.innerHTML = '';
	});

	describe('toEditorState関数', () => {
		test('pathの__org置換', () => {
			const data = {
				path: ['/path/to/image__org.jpg', '/path/to/image2__org.png'],
				alt: ['alt1', 'alt2'],
				width: [100, 200],
				height: [50, 100],
				media: ['', ''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItemSeed.toEditorState?.(data, testConfig);

			expect(result?.path).toEqual(['/path/to/image.jpg', '/path/to/image2.png']);
		});

		test('loadingからlazyへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['lazy'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItemSeed.toEditorState?.(data, testConfig);

			expect(result?.lazy).toBe(true);
		});

		test('nodeとcommandからpopupへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'button',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: 'show-modal',
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItemSeed.toEditorState?.(data, testConfig);

			expect(result?.popup).toBe(true);
		});

		test('nodeとtargetからtargetBlankへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'a',
				href: 'https://example.com',
				popup: false,
				target: '_blank',
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItemSeed.toEditorState?.(data, testConfig);

			expect(result?.targetBlank).toBe(true);
		});

		test('altからaltEditableへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['test alt text'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItemSeed.toEditorState?.(data, testConfig);

			expect(result?.altEditable).toBe('test alt text');
		});

		test('altが空の場合、altEditableは空文字', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: [],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItemSeed.toEditorState?.(data, testConfig);

			expect(result?.altEditable).toBe('');
		});
	});

	describe('toItemData関数', () => {
		test('lazyからloadingへの変換', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: true,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItemSeed.toItemData?.(data, testConfig);

			expect(result?.loading).toStrictEqual(['lazy']);
		});

		test('popupからnodeとcommandへの変換', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: true,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			// Behavior change: ポップアップは代替テキストが空だと確定できない（この入力は altEditable が空）
			await expect(async () =>
				imageItemSeed.toItemData?.(data, testConfig),
			).rejects.toThrow('代替テキスト(alt)');
			// const result = await imageItemSeed.toItemData?.(data, testConfig); // previous
			// expect(result?.node).toBe('button'); // previous
			// expect(result?.command).toBe('show-modal'); // previous
		});

		test('hrefとtargetBlankからnodeとtargetへの変換', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: 'https://example.com',
				popup: false,
				target: null,
				targetBlank: true,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			// Behavior change: リンクは代替テキストが空だと確定できない（この入力は altEditable が空）
			await expect(async () =>
				imageItemSeed.toItemData?.(data, testConfig),
			).rejects.toThrow('代替テキスト(alt)');
			// const result = await imageItemSeed.toItemData?.(data, testConfig); // previous
			// expect(result?.node).toBe('a'); // previous
			// expect(result?.target).toBe('_blank'); // previous
		});

		test('scaleType=containerの場合のstyle生成', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '80cqi',
				scaleType: 'container',
				scale: 80,
				aspectRatio: '16/9',
				cssWidthNumber: 80,
				cssWidthUnit: 'cqi',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItemSeed.toItemData?.(data, testConfig);

			expect(result?.style).toContain('--css-width: 80cqi');
			expect(result?.style).toContain('--object-fit: cover');
			expect(result?.style).toContain('--aspect-ratio: 16/9');
		});

		test('scaleType=originalの場合のstyle生成', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '200px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 200,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItemSeed.toItemData?.(data, testConfig);

			expect(result?.style).toBe('--css-width: 200px');
			expect(result?.style).not.toContain('--object-fit');
			expect(result?.style).not.toContain('--aspect-ratio');
		});

		test('altはaltEditableから1要素配列に正規化される', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['old1', 'old2'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '新しい代替テキスト',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItemSeed.toItemData?.(data, testConfig);

			expect(result?.alt).toStrictEqual(['新しい代替テキスト']);
		});

		test('altEditableが空文字の場合、altは空文字1要素になる', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['old1', 'old2'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItemSeed.toItemData?.(data, testConfig);

			expect(result?.alt).toStrictEqual(['']);
		});

		test('altEditableが未定義（型を満たさない不正なstate）でも空文字1要素にフォールバックする', async () => {
			// ImageData.altEditableは必須のstring型だが、toItemDataはMCP等
			// toEditorStateを経由しない呼び出し元からも呼ばれうるため、
			// undefined/nullに対する防御的フォールバック（?? ''）を持つ。
			// その分岐を型キャストで直接検証する
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['old1', 'old2'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'revert',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: undefined,
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as unknown as Readonly<ImageItemData>;

			const result = await imageItemSeed.toItemData?.(data, testConfig);

			expect(result?.alt).toStrictEqual(['']);
		});
	});

	describe('width / height の無い <source> を含む保存済みHTML', () => {
		test('読み込んで保存し直しても、<source> に空の width / height を足さず、img の寸法も保つ', async () => {
			const seeds = new Map([['image', imageItemSeed as never]]);
			const item = Item.create('image', seeds, testConfig);
			let state = imageItemSeed.toEditorState!(item.export() as never, testConfig);
			state = {
				...state,
				path: [state.path[0] ?? '', '/img/sp.png'],
				width: [...state.width, 300],
				height: [...state.height, 200],
				media: [state.media[0] ?? '', '(max-width: 767px)'],
			};
			item.import((await imageItemSeed.toItemData!(state, testConfig)) as never);

			// 寸法の無い<source>（v3 など、寸法を持たない保存済みHTML）にする
			const source = item.el.querySelector('source');
			source?.removeAttribute('width');
			source?.removeAttribute('height');

			state = imageItemSeed.toEditorState!(item.export() as never, testConfig);
			item.import((await imageItemSeed.toItemData!(state, testConfig)) as never);

			const resaved = item.el.querySelector('source');
			expect(resaved?.getAttribute('srcset')).toBe('/img/sp.png');
			expect(resaved?.hasAttribute('width')).toBe(false);
			expect(resaved?.hasAttribute('height')).toBe(false);
			const img = item.el.querySelector('img');
			expect(img?.hasAttribute('width')).toBe(true);
			expect(img?.hasAttribute('height')).toBe(true);
		});
	});

	describe('template → HTML → data の往復（回帰）', () => {
		test('2枚目を設定して2回保存してもaltとloadingが保持される', async () => {
			const seeds = new Map([['image', imageItemSeed as never]]);
			const item = Item.create('image', seeds, testConfig);

			// 1回目の決定: 2枚目（レスポンシブ）の画像・サイズ・メディアクエリーを設定
			let state = imageItemSeed.toEditorState!(item.export() as never, testConfig);
			state = {
				...state,
				path: [state.path[0] ?? '', '/img/sp.png'],
				width: [...state.width, 300],
				height: [...state.height, 200],
				media: [state.media[0] ?? '', '(max-width: 767px)'],
			};
			item.import((await imageItemSeed.toItemData!(state, testConfig)) as never);

			// 2回目の決定: 何も変えずにもう一度保存（Item.importが現在の
			// innerHTMLをテンプレートとして再利用する経路をなぞる）
			state = imageItemSeed.toEditorState!(item.export() as never, testConfig);
			item.import((await imageItemSeed.toItemData!(state, testConfig)) as never);

			const exported = item.export() as never as ImageItemData;
			expect(exported.alt).toStrictEqual(['サンプル画像']);
			// テンプレート初期値（template.html）のloading="lazy"が保持されること
			expect(exported.loading).toStrictEqual(['lazy']);
			expect(exported.path).toHaveLength(2);
			expect(item.el.querySelectorAll('source')).toHaveLength(1);

			const img = item.el.querySelector('img');
			expect(img?.getAttribute('alt')).toBe('サンプル画像');
		});
	});

	describe('リンク・ポップアップの画像は代替テキストを必須にする', () => {
		const base = {
			path: ['/path/to/image.jpg'],
			alt: [''],
			width: [100],
			height: [50],
			media: [''],
			fileSize: '100KB',
			mediaInput: '',
			style: '',
			cssWidth: '100px',
			scaleType: 'original',
			scale: 100,
			aspectRatio: 'revert',
			cssWidthNumber: 100,
			cssWidthUnit: 'px',
			lazy: false,
			loading: ['eager'],
			caption: 'キャプション',
			altEditable: '',
			node: 'div',
			href: '',
			popup: false,
			target: null,
			targetBlank: false,
			command: null,
		} as const satisfies Readonly<ImageItemData>;

		// toItemData は同期関数でも throw しうる。確定処理は await の内側で呼ぶので、
		// ここでも async 関数で包んで、拒否として表明する
		test('リンク先があって代替テキストが空なら、確定できない', async () => {
			await expect(async () =>
				imageItemSeed.toItemData?.({ ...base, href: 'https://example.com' }, testConfig),
			).rejects.toThrow('代替テキスト(alt)');
		});

		test('ポップアップで代替テキストが空なら、確定できない', async () => {
			await expect(async () =>
				imageItemSeed.toItemData?.({ ...base, popup: true }, testConfig),
			).rejects.toThrow('代替テキスト(alt)');
		});

		test('空白だけの代替テキストも空として扱う', async () => {
			await expect(async () =>
				imageItemSeed.toItemData?.(
					{ ...base, href: 'https://example.com', altEditable: ' 　\n' },
					testConfig,
				),
			).rejects.toThrow('代替テキスト(alt)');
		});

		test('キャプションがあっても、リンクの代替テキストの代わりにはならない', async () => {
			await expect(async () =>
				imageItemSeed.toItemData?.(
					{ ...base, href: 'https://example.com', caption: '春の庭' },
					testConfig,
				),
			).rejects.toThrow('代替テキスト(alt)');
		});

		test('代替テキストがあれば、リンクもポップアップも確定できる', async () => {
			const link = await imageItemSeed.toItemData?.(
				{ ...base, href: 'https://example.com', altEditable: '詳細ページ' },
				testConfig,
			);
			const popup = await imageItemSeed.toItemData?.(
				{ ...base, popup: true, altEditable: '拡大表示' },
				testConfig,
			);

			expect(link?.node).toBe('a');
			expect(link?.alt).toStrictEqual(['詳細ページ']);
			expect(popup?.node).toBe('button');
			expect(popup?.command).toBe('show-modal');
			expect(popup?.alt).toStrictEqual(['拡大表示']);
		});

		test('別タブで開くリンクは、代替テキストがあれば target が _blank になる', async () => {
			const result = await imageItemSeed.toItemData?.(
				{
					...base,
					href: 'https://example.com',
					targetBlank: true,
					altEditable: '詳細ページ',
				},
				testConfig,
			);

			expect(result?.node).toBe('a');
			expect(result?.target).toBe('_blank');
		});

		test('リンクもポップアップも無い画像は、代替テキストが空でも確定できる（装飾的な画像）', async () => {
			const result = await imageItemSeed.toItemData?.(base, testConfig);

			expect(result?.node).toBe('div');
			expect(result?.alt).toStrictEqual(['']);
		});
	});
});

// TODO(react-ui-overhaul): 旧ItemEditorDialogに依存していたインタラクティブテストは
// Reactエディタに対するブラウザテストとしてテスト移行タスクで再実装する
