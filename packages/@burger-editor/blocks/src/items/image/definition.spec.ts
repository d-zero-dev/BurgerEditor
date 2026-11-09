import type { Config } from '@burger-editor/core';

import { Item } from '@burger-editor/core';
import { test, expect, describe, beforeEach } from 'vitest';

import imageItemSeed, {
	ALT_REQUIRED_MESSAGE,
	DEFAULT_MEDIA_QUERIES,
	mediaQueriesOf,
	mediaQueryOrDefault,
} from './definition.js';

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
			await expect(async () => {
				await imageItemSeed.toItemData?.(data, testConfig);
			}).rejects.toThrow('代替テキスト(alt)');
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
			await expect(async () => {
				await imageItemSeed.toItemData?.(data, testConfig);
			}).rejects.toThrow('代替テキスト(alt)');
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
			item.import(await imageItemSeed.toItemData!(state, testConfig));

			// 寸法の無い<source>（v3 など、寸法を持たない保存済みHTML）にする
			const source = item.el.querySelector('source');
			source?.removeAttribute('width');
			source?.removeAttribute('height');

			state = imageItemSeed.toEditorState!(item.export() as never, testConfig);
			item.import(await imageItemSeed.toItemData!(state, testConfig));

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
			item.import(await imageItemSeed.toItemData!(state, testConfig));

			// 2回目の決定: 何も変えずにもう一度保存（Item.importが現在の
			// innerHTMLをテンプレートとして再利用する経路をなぞる）
			state = imageItemSeed.toEditorState!(item.export() as never, testConfig);
			item.import(await imageItemSeed.toItemData!(state, testConfig));

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
			await expect(async () => {
				await imageItemSeed.toItemData?.(
					{ ...base, href: 'https://example.com' },
					testConfig,
				);
			}).rejects.toThrow('代替テキスト(alt)');
		});

		test('ポップアップで代替テキストが空なら、確定できない', async () => {
			await expect(async () => {
				await imageItemSeed.toItemData?.({ ...base, popup: true }, testConfig);
			}).rejects.toThrow('代替テキスト(alt)');
		});

		test('空白だけの代替テキストも空として扱う', async () => {
			await expect(async () => {
				await imageItemSeed.toItemData?.(
					{ ...base, href: 'https://example.com', altEditable: ' 　\n' },
					testConfig,
				);
			}).rejects.toThrow('代替テキスト(alt)');
		});

		test('キャプションがあっても、リンクの代替テキストの代わりにはならない', async () => {
			await expect(async () => {
				await imageItemSeed.toItemData?.(
					{ ...base, href: 'https://example.com', caption: '春の庭' },
					testConfig,
				);
			}).rejects.toThrow('代替テキスト(alt)');
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

	describe('mediaQueriesOf関数', () => {
		test('省略すると既定の候補になる', () => {
			expect(mediaQueriesOf({})).toStrictEqual(DEFAULT_MEDIA_QUERIES);
		});

		test('config そのものが無いときも既定の候補になる', () => {
			// config を持たないエンジン（テスト用のモックなど）でエディタが落ちないようにする
			expect(mediaQueriesOf()).toStrictEqual(DEFAULT_MEDIA_QUERIES);
		});

		// 設定ファイルの値は検査されずに届く。補正は throw しない約束なので、
		// 配列でない値は無いものとし、文字列でない候補は捨てる
		test('設定の mediaQueries が配列でないときは既定の候補になり、throw しない', () => {
			expect(
				mediaQueriesOf({ mediaQueries: '(max-width: 599px)' as never }),
			).toStrictEqual(DEFAULT_MEDIA_QUERIES);
			expect(mediaQueriesOf({ mediaQueries: null as never })).toStrictEqual(
				DEFAULT_MEDIA_QUERIES,
			);
		});

		test('文字列でない候補は捨てる', () => {
			expect(
				mediaQueriesOf({ mediaQueries: [600, '(max-width: 599px)'] as never }),
			).toStrictEqual(['(max-width: 599px)']);
		});

		test('空配列と、空白だけの候補しかないときも既定の候補になる', () => {
			expect(mediaQueriesOf({ mediaQueries: [] })).toStrictEqual(DEFAULT_MEDIA_QUERIES);
			expect(mediaQueriesOf({ mediaQueries: ['', '  '] })).toStrictEqual(
				DEFAULT_MEDIA_QUERIES,
			);
		});

		test('候補の前後の空白を取り除き、空白だけの候補は捨てる', () => {
			// 前後に空白が残ると、保存される media と、入力欄の候補・入力値が食い違う
			expect(
				mediaQueriesOf({
					mediaQueries: [' (max-width: 599px)\n', '', '(max-width: 1023px)'],
				}),
			).toStrictEqual(['(max-width: 599px)', '(max-width: 1023px)']);
		});

		test('重複した候補は 1 つにまとめる（先頭の順序を保つ）', () => {
			expect(
				mediaQueriesOf({
					mediaQueries: [
						'(max-width: 599px)',
						'(max-width: 1023px)',
						' (max-width: 599px)',
					],
				}),
			).toStrictEqual(['(max-width: 599px)', '(max-width: 1023px)']);
		});
	});

	describe('mediaQueryOrDefault関数', () => {
		test('2枚目以降で空・空白だけ・未設定なら、既定の候補の先頭を返す', () => {
			expect(mediaQueryOrDefault(1, '', {})).toBe('(max-width: 767px)');
			expect(mediaQueryOrDefault(1, ' 　\n', {})).toBe('(max-width: 767px)');
			expect(mediaQueryOrDefault(1, undefined, {})).toBe('(max-width: 767px)');
			expect(mediaQueryOrDefault(2, null, {})).toBe('(max-width: 767px)');
			expect(mediaQueryOrDefault(1, '', { mediaQueries: ['(max-width: 599px)'] })).toBe(
				'(max-width: 599px)',
			);
		});

		test('値があればそのまま返し、画像1（index 0）は触らない', () => {
			expect(mediaQueryOrDefault(1, '(min-width: 1024px)', {})).toBe(
				'(min-width: 1024px)',
			);
			expect(mediaQueryOrDefault(0, '', {})).toBe('');
			expect(mediaQueryOrDefault(0, undefined, {})).toBe('');
		});

		// 候補は前後の空白を取り除くので、直接入力の値も揃えないと、保存される media と
		// 候補が食い違い、同じ値が「その他」扱いになる
		test('2枚目以降の値は、前後の空白を取り除いて返す', () => {
			expect(mediaQueryOrDefault(1, ' (max-width: 600px) ', {})).toBe(
				'(max-width: 600px)',
			);
		});
	});

	describe('normalizeItemData（画面・ブラウザ中継・エージェントのどの保存でも補う）', () => {
		const spData = {
			path: ['/img/pc.png', '/img/sp.png'],
			width: [400, 300],
			height: [300, 200],
			media: ['', ''],
			alt: ['説明'],
			loading: ['eager'],
		} satisfies Partial<ImageItemData>;

		test('画像2があって media が空なら、既定値で埋める', () => {
			const result = imageItemSeed.normalizeItemData?.(
				{ ...spData, media: ['', ''] },
				testConfig,
			);

			expect(result?.media).toStrictEqual(['', '(max-width: 767px)']);
		});

		test('config の mediaQueries の先頭で埋める', () => {
			const result = imageItemSeed.normalizeItemData?.(
				{ ...spData, media: [''] },
				{ ...testConfig, mediaQueries: ['(max-width: 599px)'] },
			);

			expect(result?.media).toStrictEqual(['', '(max-width: 599px)']);
		});

		test('入力済みの media は触らない。補う必要が無ければ同じオブジェクトを返す', () => {
			const data = { ...spData, media: ['', '(min-width: 1024px)'] };

			expect(imageItemSeed.normalizeItemData?.(data, testConfig)).toBe(data);
		});

		test('画像が無い部分データには media を足さない', () => {
			const data = { alt: ['説明'] };

			expect(imageItemSeed.normalizeItemData?.(data, testConfig)).toBe(data);
		});

		test('画像2が空で画像3だけを選んだときも、media に穴を残さない', () => {
			const result = imageItemSeed.normalizeItemData?.(
				{ ...spData, path: ['/img/a.png', '', '/img/c.png'], media: [''] },
				testConfig,
			);

			expect(result?.media).toStrictEqual(['', '', '(max-width: 767px)']);
		});

		// エージェントは任意の JSON を送る。補正は throw しない約束なので、
		// 形が不正な値は、補正せずにそのまま返す（または空として扱う）
		test('path が配列でないときは、throw せず、そのまま返す', () => {
			const data = { ...spData, path: '/img/pc.png' as never };

			expect(imageItemSeed.normalizeItemData?.(data, testConfig)).toBe(data);
		});

		test('media の要素が文字列でないときは、空として既定値で埋め、throw しない', () => {
			const result = imageItemSeed.normalizeItemData?.(
				{ ...spData, media: [null, 123] as never },
				testConfig,
			);

			expect(result?.media).toStrictEqual(['', '(max-width: 767px)']);
		});

		test('冪等: かけ直しても結果が変わらない', () => {
			const once = imageItemSeed.normalizeItemData?.({ ...spData }, testConfig);
			const twice = imageItemSeed.normalizeItemData?.(once ?? {}, testConfig);

			expect(twice).toStrictEqual(once);
		});

		test('エージェントの item_update 相当（Item.import に部分データ）でも、<source> に media が付く', () => {
			const seeds = new Map([['image', imageItemSeed as never]]);
			const item = Item.create('image', seeds, testConfig);

			item.import({
				path: ['/img/pc.png', '/img/sp.png'],
				width: [400, 300],
				height: [300, 200],
			});

			expect(item.el.querySelector('source')?.getAttribute('media')).toBe(
				'(max-width: 767px)',
			);
		});
	});

	describe('画像2以降を選んだのにメディアクエリーが空のまま確定する', () => {
		// 空の media の <source> はどの画面幅でも条件に合うため、<img>（画像1）より先に
		// 採用され、PC 幅でも画像2が表示される。保存前に候補の先頭で埋める
		const withSecondImage = {
			path: ['/img/sample.png', '/img/sp.png'],
			alt: ['サンプル画像'],
			width: [400, 300],
			height: [300, 200],
			media: ['', ''],
			fileSize: '0',
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
			altEditable: 'サンプル画像',
			node: 'div',
			href: '',
			popup: false,
			target: null,
			targetBlank: false,
			command: null,
		} as const satisfies Readonly<ImageItemData>;

		test('config に候補が無ければ (max-width: 767px) で埋める', async () => {
			const result = await imageItemSeed.toItemData?.(withSecondImage, testConfig);

			expect(result?.media).toStrictEqual(['', '(max-width: 767px)']);
		});

		test('空配列の候補も、無いものとして (max-width: 767px) で埋める', async () => {
			const result = await imageItemSeed.toItemData?.(withSecondImage, {
				...testConfig,
				mediaQueries: [],
			});

			expect(result?.media).toStrictEqual(['', '(max-width: 767px)']);
		});

		test('config の候補があれば、その先頭で埋める', async () => {
			const result = await imageItemSeed.toItemData?.(withSecondImage, {
				...testConfig,
				mediaQueries: ['(max-width: 599px)', '(max-width: 1023px)'],
			});

			expect(result?.media).toStrictEqual(['', '(max-width: 599px)']);
		});

		test('空白だけも空として扱う', async () => {
			const result = await imageItemSeed.toItemData?.(
				{ ...withSecondImage, media: ['', ' 　\n'] },
				testConfig,
			);

			expect(result?.media).toStrictEqual(['', '(max-width: 767px)']);
		});

		test('入力済みのメディアクエリーは上書きしない', async () => {
			const result = await imageItemSeed.toItemData?.(
				{ ...withSecondImage, media: ['', '(min-width: 1024px)'] },
				{ ...testConfig, mediaQueries: ['(max-width: 599px)'] },
			);

			expect(result?.media).toStrictEqual(['', '(min-width: 1024px)']);
		});

		test('画像1のメディアクエリーは触らない', async () => {
			const result = await imageItemSeed.toItemData?.(withSecondImage, testConfig);

			expect(result?.media[0]).toBe('');
		});

		test('画像2が無ければ補完しない', async () => {
			const result = await imageItemSeed.toItemData?.(
				{ ...withSecondImage, path: ['/img/sample.png'], media: [''] },
				testConfig,
			);

			expect(result?.media).toStrictEqual(['']);
		});

		test('画像2のパスが空なら補完しない（source が作られない画像に値を足さない）', async () => {
			const result = await imageItemSeed.toItemData?.(
				{ ...withSecondImage, path: ['/img/sample.png', ''] },
				testConfig,
			);

			expect(result?.media).toStrictEqual(['', '']);
		});

		test('保存した HTML の <source> に media が付く', async () => {
			const seeds = new Map([['image', imageItemSeed as never]]);
			const item = Item.create('image', seeds, testConfig);

			item.import(await imageItemSeed.toItemData!(withSecondImage, testConfig));

			const source = item.el.querySelector('source');
			expect(source?.getAttribute('srcset')).toBe('/img/sp.png');
			expect(source?.getAttribute('media')).toBe('(max-width: 767px)');
		});
	});
});

describe('imageItemSeed: 画像を包む要素（エージェントの書き込みでもそろえる）', () => {
	describe('normalizeItemData', () => {
		test('ポップアップでない button は、編集画面の往復と同じく通常の画像（div）にする', () => {
			const result = imageItemSeed.normalizeItemData?.(
				{ node: 'button', command: null, alt: ['拡大'] },
				testConfig,
			);

			// 他のキーは、そのまま残る
			expect(result).toStrictEqual({ node: 'div', command: null, alt: ['拡大'] });
		});

		test('node の無い部分データでも、command だけがあればポップアップにせず、command を外す', () => {
			expect(
				imageItemSeed.normalizeItemData?.({ command: 'show-modal' }, testConfig),
			).toStrictEqual({ command: null });
		});

		test('node の無い部分データでも、href があれば a を足す', () => {
			expect(
				imageItemSeed.normalizeItemData?.({ href: 'https://example.com/' }, testConfig),
			).toStrictEqual({ href: 'https://example.com/', node: 'a' });
		});

		test('command だけが show-modal の div は、ポップアップにしない（画像モーダルは button だけを探す）', () => {
			const result = imageItemSeed.normalizeItemData?.(
				{ node: 'div', command: 'show-modal', href: '' },
				testConfig,
			);

			expect(result).toMatchObject({ node: 'div', command: null });
		});

		test('href が空の a は、装飾的な画像（div）にし、_blank も外す', () => {
			const result = imageItemSeed.normalizeItemData?.(
				{ node: 'a', href: '', target: '_blank' },
				testConfig,
			);

			expect(result).toMatchObject({ node: 'div', target: null });
		});

		test('href があれば a にそろえ、_blank は a のときだけ残す', () => {
			expect(
				imageItemSeed.normalizeItemData?.(
					{ node: 'div', href: 'https://example.com/', target: '_blank' },
					testConfig,
				),
			).toMatchObject({ node: 'a', target: '_blank' });
			expect(
				imageItemSeed.normalizeItemData?.(
					{
						node: 'button',
						command: 'show-modal',
						href: 'https://example.com/',
						target: '_blank',
					},
					testConfig,
				),
			).toMatchObject({ node: 'button', command: 'show-modal', target: null });
		});

		test('すでにそろっていれば、同じオブジェクトを返す', () => {
			const link = {
				node: 'a',
				href: 'https://example.com/',
				target: null,
				command: null,
			} as const;
			const popup = {
				node: 'button',
				href: '',
				target: null,
				command: 'show-modal',
			} as const;
			const plain = { node: 'div', href: '', target: null, command: null } as const;

			expect(imageItemSeed.normalizeItemData?.(link, testConfig)).toBe(link);
			expect(imageItemSeed.normalizeItemData?.(popup, testConfig)).toBe(popup);
			expect(imageItemSeed.normalizeItemData?.(plain, testConfig)).toBe(plain);
		});

		test('空文字の command / target は、null と同じ意味として、そのまま返す', () => {
			const data = { node: 'div', href: '', command: '', target: '' } as never;

			expect(imageItemSeed.normalizeItemData?.(data, testConfig)).toBe(data);
		});

		test('これらのキーを持たない部分データには、何も足さない', () => {
			const data = { alt: ['説明'] };

			expect(imageItemSeed.normalizeItemData?.(data, testConfig)).toBe(data);
		});

		test('冪等: かけ直しても結果が変わらない', () => {
			const once = imageItemSeed.normalizeItemData?.(
				{
					node: 'div',
					command: 'show-modal',
					href: 'https://example.com/',
					target: '_blank',
				},
				testConfig,
			);
			const twice = imageItemSeed.normalizeItemData?.(once ?? {}, testConfig);

			expect(twice).toBe(once);
		});

		test('文字列でない値が来ても、throw せず、空として通常の画像（div）にそろえる', () => {
			const data = { node: 5, href: 7, command: {}, target: [] } as never;

			expect(imageItemSeed.normalizeItemData?.(data, testConfig)).toMatchObject({
				node: 'div',
				command: null,
				target: null,
			});
		});
	});

	describe('validateItemData（toItemData を通らない保存の検査）', () => {
		test('リンクで alt が空なら、編集画面の「決定」と同じ理由を返す', () => {
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'a', href: 'https://example.com/', alt: [''] },
					testConfig,
				),
			).toStrictEqual([ALT_REQUIRED_MESSAGE]);
		});

		test('ポップアップで alt が空白だけなら、理由を返す', () => {
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'button', command: 'show-modal', alt: [' 　\n'] },
					testConfig,
				),
			).toStrictEqual([ALT_REQUIRED_MESSAGE]);
		});

		test('alt が無い（キーが無い・空配列）リンクも、理由を返す', () => {
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'a', href: 'https://example.com/' },
					testConfig,
				),
			).toStrictEqual([ALT_REQUIRED_MESSAGE]);
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'a', href: 'https://example.com/', alt: [] },
					testConfig,
				),
			).toStrictEqual([ALT_REQUIRED_MESSAGE]);
		});

		test('alt があるリンク・ポップアップと、装飾的な画像（div）は、理由を返さない', () => {
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'a', href: 'https://example.com/', alt: ['詳細'] },
					testConfig,
				),
			).toStrictEqual([]);
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'button', command: 'show-modal', alt: ['拡大'] },
					testConfig,
				),
			).toStrictEqual([]);
			expect(
				imageItemSeed.validateItemData?.({ node: 'div', alt: [''] }, testConfig),
			).toStrictEqual([]);
			expect(imageItemSeed.validateItemData?.({}, testConfig)).toStrictEqual([]);
		});

		test('エージェントの任意の JSON でも throw せず、alt が配列でなければ空として扱う', () => {
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'a', href: 'https://example.com/', alt: [5] } as never,
					testConfig,
				),
			).toStrictEqual([ALT_REQUIRED_MESSAGE]);
			expect(
				imageItemSeed.validateItemData?.(
					{ node: 'a', href: 'https://example.com/', alt: 'x' } as never,
					testConfig,
				),
			).toStrictEqual([ALT_REQUIRED_MESSAGE]);
		});
	});
});

// TODO(react-ui-overhaul): 旧ItemEditorDialogに依存していたインタラクティブテストは
// Reactエディタに対するブラウザテストとしてテスト移行タスクで再実装する
