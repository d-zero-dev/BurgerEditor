import type { CarouselData } from './definition.js';
import type { Config } from '@burger-editor/core';

import { Item } from '@burger-editor/core';
import { describe, expect, test } from 'vitest';

import carouselItemSeed from './definition.js';
import {
	appendSlide,
	defaultSlide,
	editorStateToSlide,
	getSlides,
	moveSlide,
	normalizeCarousel,
	removeSlide,
	replaceSlide,
	SLIDE_KEYS,
	slideToEditorState,
} from './slides.js';

const DEFAULT_SLIDE = defaultSlide();

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
};

/**
 * `template.html` から作ったアイテムを、保存と同じ経路（`toEditorState` →
 * `toItemData` → `Item.import`）で更新する
 * @param item
 * @param update
 */
async function save(
	item: Item<CarouselData, {}>,
	update: (data: CarouselData) => CarouselData,
) {
	const state = carouselItemSeed.toEditorState!(item.export(), testConfig);
	item.import(await carouselItemSeed.toItemData!(update(state), testConfig));
}

/**
 *
 */
function createItem() {
	const seeds = new Map([['carousel', carouselItemSeed as never]]);
	return Item.create('carousel', seeds, testConfig) as unknown as Item<CarouselData, {}>;
}

describe('carouselItemSeed', () => {
	describe('template', () => {
		test('テンプレートはスライド1枚と既定の全体設定を持つ', () => {
			const data = createItem().export();

			expect(data.path).toHaveLength(1);
			expect(data.autoplay).toBe(false);
			expect(data.loop).toBe(false);
			expect(data.perView).toBe(1);
			expect(data.arrows).toBe(true);
			expect(data.dots).toBe(true);
			expect(data.effect).toBe('slide');
		});

		test('挿入直後（一度も編集していない）の <source> に、空の srcset / media や 0 の width / height を残さない', () => {
			const picture = createItem().el.querySelector('picture');

			// Behavior change: スライドの <picture> は image と同じリストになり、画像1枚のときは <source> 自体が無い
			expect(picture?.querySelector('source')).toBeNull();
			expect(picture?.querySelector(':scope > img')).not.toBeNull();
			// const source = createItem().el.querySelector('source'); // previous
			// expect(source).not.toBeNull(); // previous
			// for (const name of ['srcset', 'media', 'width', 'height']) { // previous
			// 	expect(source?.hasAttribute(name), name).toBe(false); // previous
			// } // previous
		});
	});

	describe('スライドの操作', () => {
		test('追加したスライドは既定値で、全配列が同じ長さになる', () => {
			const data = appendSlide(
				carouselItemSeed.toEditorState!(createItem().export(), testConfig),
				{ ...DEFAULT_SLIDE },
			);

			expect(getSlides(data)).toHaveLength(2);
			expect(data.path).toHaveLength(2);
			// Behavior change: SP 画像の固定の欄（spPath）は無く、各スライドの画像は画像ごとの配列
			expect(data.path).toStrictEqual([['/img/sample.png'], ['']]);
			// expect(data.spPath).toStrictEqual([null, null]); // previous
			expect(getSlides(data)[1]).toStrictEqual(DEFAULT_SLIDE);
		});

		test('残り1枚のときは削除できない', () => {
			const data = carouselItemSeed.toEditorState!(createItem().export(), testConfig);

			expect(removeSlide(data, 0).path).toHaveLength(1);
		});

		test('並べ替えは端では何もしない', () => {
			let data = appendSlide(
				carouselItemSeed.toEditorState!(createItem().export(), testConfig),
				{ ...DEFAULT_SLIDE },
			);
			data = replaceSlide(data, 0, { ...DEFAULT_SLIDE, path: ['/a.png'] });
			data = replaceSlide(data, 1, { ...DEFAULT_SLIDE, path: ['/b.png'] });

			// Behavior change: スライドの画像の値（path / alt / width / height / loading / media）は、スライドごとに画像の配列になる
			expect(moveSlide(data, 0, -1).path).toStrictEqual([['/a.png'], ['/b.png']]);
			expect(moveSlide(data, 1, 1).path).toStrictEqual([['/a.png'], ['/b.png']]);
			expect(moveSlide(data, 0, 1).path).toStrictEqual([['/b.png'], ['/a.png']]);
			// expect(moveSlide(data, 0, -1).path).toStrictEqual(['/a.png', '/b.png']); // previous
			// expect(moveSlide(data, 1, 1).path).toStrictEqual(['/a.png', '/b.png']); // previous
			// expect(moveSlide(data, 0, 1).path).toStrictEqual(['/b.png', '/a.png']); // previous
		});
	});

	describe('スライド ↔ imageアイテムの編集状態', () => {
		test('SP画像つきのスライドが往復しても値が変わらない', async () => {
			const slide = {
				...DEFAULT_SLIDE,
				path: ['/pc.png', '/sp.png'],
				media: ['', '(max-width: 767px)'],
				width: [400, 300],
				height: [300, 200],
				alt: ['説明'],
				caption: 'キャプション',
				href: 'https://example.com/',
				node: 'a' as const,
			};

			const state = slideToEditorState(slide, testConfig);
			expect(state.path).toStrictEqual(['/pc.png', '/sp.png']);
			expect(state.media).toStrictEqual(['', '(max-width: 767px)']);
			expect(state.altEditable).toBe('説明');

			const result = await editorStateToSlide(state, testConfig);
			// Behavior change: スライドの画像の値（path / alt / width / height / loading / media）は、スライドごとに画像の配列になる（SP 画像は 2 枚目）
			expect(result).toMatchObject({
				path: ['/pc.png', '/sp.png'],
				media: ['', '(max-width: 767px)'],
				width: [400, 300],
				height: [300, 200],
				alt: ['説明'],
				caption: 'キャプション',
				href: 'https://example.com/',
				node: 'a',
			});
			// expect(result).toMatchObject({ // previous
			// 	path: '/pc.png', // previous
			// 	spPath: '/sp.png', // previous
			// 	spMedia: '(max-width: 767px)', // previous
			// 	spWidth: 300, // previous
			// 	spHeight: 200, // previous
			// 	alt: '説明', // previous
			// 	caption: 'キャプション', // previous
			// 	href: 'https://example.com/', // previous
			// 	node: 'a', // previous
			// }); // previous
		});

		test('SP画像があってメディアクエリーが空のスライドは、既定のメディアクエリーで確定する', async () => {
			// 空の media の <source> は、どの画面幅でも PC 画像より先に採用される
			const slide = {
				...DEFAULT_SLIDE,
				path: ['/pc.png', '/sp.png'],
				media: ['', ''],
				width: [400, 300],
				height: [300, 200],
				alt: ['説明'],
			};

			const state = slideToEditorState(slide, testConfig);
			expect(state.media).toStrictEqual(['', '']);

			const result = await editorStateToSlide(state, testConfig);
			expect(result.media).toStrictEqual(['', '(max-width: 767px)']);

			const configured = await editorStateToSlide(state, {
				...testConfig,
				mediaQueries: ['(max-width: 599px)'],
			});
			expect(configured.media).toStrictEqual(['', '(max-width: 599px)']);
		});

		test('SP画像の無いスライドは、名前が無ければ確定できない', async () => {
			const state = slideToEditorState(
				{ ...DEFAULT_SLIDE, path: ['/pc.png'] },
				testConfig,
			);

			// Behavior change: キャプションも alt も無いスライドは確定できない（この入力は名前が無い）
			await expect(editorStateToSlide(state, testConfig)).rejects.toThrow(
				'キャプションも代替テキスト(alt)も空',
			);
			// const result = await editorStateToSlide(state, testConfig); // previous
			// expect(result.spPath).toBeNull(); // previous
			// expect(result.spMedia).toBeNull(); // previous
			// expect(result.spWidth).toBeNull(); // previous
		});

		test('名前のある SP画像の無いスライドは、画像の配列が 1 枚のまま往復する', async () => {
			const state = slideToEditorState(
				{ ...DEFAULT_SLIDE, path: ['/pc.png'], alt: ['説明'] },
				testConfig,
			);

			const result = await editorStateToSlide(state, testConfig);

			// Behavior change: SP 画像が無いことは、画像ごとの配列が 1 枚だけであることで表す
			expect(result.path).toStrictEqual(['/pc.png']);
			expect(result.media).toHaveLength(1);
			expect(result.width).toHaveLength(1);
			// expect(result.spPath).toBeNull(); // previous
			// expect(result.spMedia).toBeNull(); // previous
			// expect(result.spWidth).toBeNull(); // previous
		});

		test('読み戻しで空の配列やスカラーになった画像の値は、画像ごとの配列にそろえる', () => {
			// Behavior change: SP 画像の固定の欄が無くなり、画像の値は画像ごとの配列に揃える
			// （読み戻しで空の配列になったスライドは既定値、配列でない値は 1 枚の画像）
			const [empty, scalar] = getSlides({
				...carouselItemSeed.toEditorState!(createItem().export(), testConfig),
				path: [[], '/pc.png' as never],
				width: [[], 300 as never],
			});

			expect(empty).toMatchObject({ path: [''], width: [400] });
			expect(scalar).toMatchObject({ path: ['/pc.png'], width: [300] });
			// expect(slide).toMatchObject({ // previous
			// 	spPath: null, // previous
			// 	spMedia: null, // previous
			// 	spWidth: null, // previous
			// 	spHeight: null, // previous
			// }); // previous
		});
	});

	describe('normalizeItemData（画面・ブラウザ中継・エージェントのどの保存でも補う）', () => {
		test('画像2があるスライドの media が空なら、既定のメディアクエリーで埋める', () => {
			const data = {
				...createItem().export(),
				path: [['/pc.png', '/sp.png']],
				media: [[null, null]] as never,
			};

			expect(carouselItemSeed.normalizeItemData?.(data, testConfig)?.media).toStrictEqual(
				[['', '(max-width: 767px)']],
			);
			expect(
				carouselItemSeed.normalizeItemData?.(data, {
					...testConfig,
					mediaQueries: ['(max-width: 599px)'],
				})?.media,
			).toStrictEqual([['', '(max-width: 599px)']]);
		});

		test('画像2が無いスライドは触らない。入力済みの media も上書きしない', () => {
			const noSp = createItem().export();
			const withMedia = {
				...createItem().export(),
				path: [['/pc.png', '/sp.png']],
				media: [['', '(min-width: 1024px)']],
			};

			expect(carouselItemSeed.normalizeItemData?.(noSp, testConfig)).toBe(noSp);
			expect(carouselItemSeed.normalizeItemData?.(withMedia, testConfig)).toBe(withMedia);
		});

		test('値を持たない部分データは、そのまま返す', () => {
			const data = { caption: ['x'] };

			expect(carouselItemSeed.normalizeItemData?.(data, testConfig)).toBe(data);
		});

		// エージェントは任意の JSON を送る。補正は throw しない約束なので、
		// 形が不正な値は、画像 1 枚として包むか、空として扱う
		test('path がスカラーのときは、throw せず、スライド1枚・画像1枚として包む', () => {
			const data = { ...createItem().export(), path: '' as never };

			expect(carouselItemSeed.normalizeItemData?.(data, testConfig)?.path).toStrictEqual([
				[''],
			]);
		});

		test('path が image と同じ平らな配列のときは、スライドごとの画像1枚として包む', () => {
			const data = { path: ['/a.png', '/b.png'] as never };

			expect(carouselItemSeed.normalizeItemData?.(data, testConfig)?.path).toStrictEqual([
				['/a.png'],
				['/b.png'],
			]);
		});

		test('スライドごとのキーがすべて空の配列でも、空のスライド 1 枚にする（スライドの雛形を失わない）', () => {
			const item = createItem();

			// スライドごとのキーをすべて空にする（エージェントが送り得る形）
			item.import(Object.fromEntries(SLIDE_KEYS.map((key) => [key, []])));

			expect(item.el.querySelectorAll('figure')).toHaveLength(1);
			expect(item.el.querySelector('figure picture > img')).not.toBeNull();
		});

		test('path の空の配列は、空の画像1枚にする（<picture> の <img> を失わない）', () => {
			const data = { path: [[]] as never };

			expect(carouselItemSeed.normalizeItemData?.(data, testConfig)?.path).toStrictEqual([
				[''],
			]);
		});

		test('media が配列でないときは、空として既定値で埋め、throw しない', () => {
			const data = {
				...createItem().export(),
				path: [['/pc.png', '/sp.png']],
				media: 5 as never,
			};

			expect(carouselItemSeed.normalizeItemData?.(data, testConfig)?.media).toStrictEqual(
				[['', '(max-width: 767px)']],
			);
		});

		test('画像2があるのが2枚目のスライドだけでも、media に穴を残さない', () => {
			const data = {
				...createItem().export(),
				path: [['/a.png'], ['/b.png', '/b-sp.png']],
				media: [],
			};

			// 1 枚目は画像 1 枚のスライドの既定値（追加直後のスライドと同じ）
			expect(carouselItemSeed.normalizeItemData?.(data, testConfig)?.media).toStrictEqual(
				[[null], ['', '(max-width: 767px)']],
			);
		});

		test('media の穴を [] で埋めたスライドも、画像の media が崩れずに保存される', () => {
			const item = createItem();

			item.import({
				path: [['/a.png'], ['/b.png', '/b-sp.png']],
				width: [[400], [400, 300]],
				height: [[300], [300, 200]],
				media: [],
				caption: ['A', 'B'],
			});

			const [first, second] = [...item.el.querySelectorAll('figure picture')];
			expect(first?.querySelector('source')).toBeNull();
			expect(first?.querySelector('img')?.hasAttribute('media')).toBe(false);
			expect(second?.querySelector('source')?.getAttribute('media')).toBe(
				'(max-width: 767px)',
			);
			expect(item.export().media).toStrictEqual([[null], [null, '(max-width: 767px)']]);
		});

		// 平らな配列の外側は、どのキーでも常にスライド（推測しない）。キーごとに外側の
		// 長さがずれると、frozen-patty が足りない位置を 0 番目のスライドで埋める
		test('path が入れ子で media が平らなときは、media の外側もスライドと読み、空のスライドが増える', () => {
			const item = createItem();

			item.import({
				path: [['/a.png', '/b.png']],
				media: ['', '(max-width: 600px)'],
			} as never);

			const figures = [...item.el.querySelectorAll('figure')];
			expect(figures).toHaveLength(2);
			// 増えたスライドは 1 枚目の複製ではなく、追加直後のスライドと同じ既定値
			expect(
				figures.map((f) => f.querySelector('img')?.getAttribute('src')),
			).toStrictEqual(['/a.png', '']);
		});

		test('スライドごとの配列が短いキーは、足りないスライドを既定値で埋める（1 枚目の値を複製しない）', () => {
			const item = createItem();

			item.import({
				path: [['/a.png', '/a-sp.png'], ['/b.png'], ['/c.png']],
				alt: [['A']],
				media: [['', '(max-width: 767px)']],
				caption: ['A', 'B', 'C'],
			});

			const pictures = [...item.el.querySelectorAll('figure picture')];
			expect(pictures.map((p) => p.querySelectorAll('source').length)).toEqual([1, 0, 0]);
			expect(pictures.map((p) => p.querySelector('img')?.getAttribute('alt'))).toEqual([
				'A',
				'',
				'',
			]);
		});

		test('冪等: かけ直しても結果が変わらない', () => {
			const once = carouselItemSeed.normalizeItemData?.(
				{
					...createItem().export(),
					path: ['/pc.png', '/sp.png'] as never,
					media: [''] as never,
				},
				testConfig,
			);

			expect(carouselItemSeed.normalizeItemData?.(once ?? {}, testConfig)).toBe(once);
		});

		test('エージェントの item_update 相当（Item.import に部分データ）でも、<source> に media が付く', () => {
			const item = createItem();

			item.import({
				path: [['/pc.png', '/sp.png']],
				width: [[400, 300]],
				height: [[300, 200]],
			});

			expect(item.el.querySelector('source')?.getAttribute('media')).toBe(
				'(max-width: 767px)',
			);
		});

		test('平らな path を Item.import しても、スライドごとに <img> が残る', () => {
			const item = createItem();

			item.import({ path: ['/a.png', '/b.png'] as never });

			const figures = [...item.el.querySelectorAll('figure')];
			expect(
				figures.map((f) => f.querySelector('img')?.getAttribute('src')),
			).toStrictEqual(['/a.png', '/b.png']);
			expect(item.el.querySelector('source')).toBeNull();
		});

		test('カタログの雛形（値が空文字のスカラー）で作っても、スライド1枚に <img> がある', () => {
			const item = createItem();

			item.import({ path: '', alt: '', caption: '' } as never);

			expect(item.el.querySelectorAll('figure')).toHaveLength(1);
			expect(item.el.querySelector('figure img')).not.toBeNull();
		});
	});

	describe('スライドの操作（範囲外・並び）', () => {
		const threeSlides = () => {
			let data = carouselItemSeed.toEditorState!(createItem().export(), testConfig);
			data = replaceSlide(data, 0, { ...DEFAULT_SLIDE, path: ['/a.png'] });
			data = appendSlide(data, { ...DEFAULT_SLIDE, path: ['/b.png'] });
			return appendSlide(data, { ...DEFAULT_SLIDE, path: ['/c.png'] });
		};

		test('3枚から中間を削除すると、前後の並びが保たれる', () => {
			// Behavior change: スライドの画像の値（path / alt / width / height / loading / media）は、スライドごとに画像の配列になる
			expect(removeSlide(threeSlides(), 1).path).toStrictEqual([['/a.png'], ['/c.png']]);
			// expect(removeSlide(threeSlides(), 1).path).toStrictEqual(['/a.png', '/c.png']); // previous
		});

		test('範囲外の index では、削除・差し替え・並べ替えのどれも何もしない', () => {
			const data = threeSlides();

			expect(removeSlide(data, -1).path).toStrictEqual(data.path);
			expect(removeSlide(data, 3).path).toStrictEqual(data.path);
			expect(
				replaceSlide(data, 3, { ...DEFAULT_SLIDE, path: ['/x.png'] }).path,
			).toStrictEqual(data.path);
			expect(moveSlide(data, 3, -1).path).toStrictEqual(data.path);
		});
	});

	describe('全体設定の既定値', () => {
		test('全体設定が無い入力は、既定値で埋めて保存形に整える', async () => {
			const state = carouselItemSeed.toEditorState!({} as never, testConfig);
			// Behavior change: 名前の無いスライドを含む入力は確定できない（`{}` は既定のスライド 1 枚で、名前が無い）
			await expect(async () =>
				carouselItemSeed.toItemData!({} as never, testConfig),
			).rejects.toThrow('スライド1');
			// const saved = await carouselItemSeed.toItemData!({} as never, testConfig); // previous

			// for (const data of [state, saved]) { // previous
			for (const data of [state]) {
				expect(data).toMatchObject({
					autoplay: false,
					loop: false,
					perView: 1,
					arrows: true,
					dots: true,
					effect: 'slide',
				});
				expect(data.path).toHaveLength(1);
			}
		});

		test('全体設定が無く、スライドに名前がある入力は、既定値で埋めて保存形に整える', async () => {
			const saved = await carouselItemSeed.toItemData!(
				{ alt: [['桜']] } as never,
				testConfig,
			);

			expect(saved).toMatchObject({
				autoplay: false,
				loop: false,
				perView: 1,
				arrows: true,
				dots: true,
				effect: 'slide',
			});
			expect(saved.path).toHaveLength(1);
		});

		test('既定値は template.html から導かれる（コードに別の値を持たない）', () => {
			// 新しく足すスライド。画像と説明は、テンプレートではサンプルが入るので空
			// Behavior change: スライドの画像の値（path / alt / width / height / loading / media）は、スライドごとに画像の配列になる。SP 画像の固定の欄は無い
			expect(defaultSlide()).toStrictEqual({
				path: [''],
				alt: [''],
				width: [400],
				height: [300],
				loading: ['lazy'],
				media: [null],
				// path: '', // previous
				// alt: '', // previous
				// width: 400, // previous
				// height: 300, // previous
				// loading: 'lazy', // previous
				// spPath: null, // previous
				// spMedia: null, // previous
				// spWidth: null, // previous
				// spHeight: null, // previous
				style: '--css-width: 100cqi; --object-fit: cover; --aspect-ratio: revert;',
				scale: 100,
				scaleType: 'container',
				aspectRatio: 'revert',
				caption: '',
				node: 'div',
				href: '',
				target: null,
				command: null,
			});

			// 全体設定は、テンプレートから読んだ値と、未指定を埋めた値が一致する
			const fromTemplate = createItem().export();
			const filled = normalizeCarousel({} as never);
			for (const key of [
				'autoplay',
				'loop',
				'perView',
				'arrows',
				'dots',
				'effect',
			] as const) {
				expect(filled[key], key).toBe(fromTemplate[key]);
			}
		});
	});

	describe('表示枚数', () => {
		test.each([
			[Number.NaN, 1],
			[0, 1],
			[-2, 1],
			[2.7, 2],
			[3, 3],
		])('保存する表示枚数 %s は 1 以上の整数 %s に整える', async (input, expected) => {
			const base = carouselItemSeed.toEditorState!(createItem().export(), testConfig);

			const saved = await carouselItemSeed.toItemData!(
				{ ...base, perView: input },
				testConfig,
			);

			expect(saved.perView).toBe(expected);
		});
	});

	describe('スライド数', () => {
		test('path より長い配列があっても、そのスライドの値を捨てない', () => {
			const base = carouselItemSeed.toEditorState!(createItem().export(), testConfig);

			const slides = getSlides({
				...base,
				path: [['/a.png']],
				caption: ['A', 'B'],
			});

			expect(slides).toHaveLength(2);
			expect(slides.map((s) => s.caption)).toStrictEqual(['A', 'B']);
			// Behavior change: スライドの画像の値（path / alt / width / height / loading / media）は、スライドごとに画像の配列になる（配列は同じ値の別の配列なので toStrictEqual で比べる）
			expect(slides[1]?.path).toStrictEqual(DEFAULT_SLIDE.path);
			// expect(slides[1]?.path).toBe(DEFAULT_SLIDE.path); // previous
		});
	});

	describe('template → HTML → data の往復（回帰）', () => {
		/**
		 * SP画像のあるスライドとないスライドを混ぜて保存した item を作る。
		 * 保存は `Item.import` が現在の innerHTML をテンプレートに再利用する経路を通る
		 * @param times - 何も変えずに保存し直す回数
		 */
		async function createMixedItem(times: number) {
			const item = createItem();
			await save(item, (data) => {
				let next = appendSlide(data, { ...DEFAULT_SLIDE });
				next = replaceSlide(next, 0, {
					...DEFAULT_SLIDE,
					path: ['/a.png', '/a-sp.png'],
					alt: ['A'],
					media: ['', '(max-width: 767px)'],
					width: [400, 300],
					height: [300, 200],
				});
				return replaceSlide(next, 1, {
					...DEFAULT_SLIDE,
					path: ['/b.png'],
					alt: ['B'],
					caption: 'Bの説明',
				});
			});
			for (let i = 0; i < times; i++) {
				await save(item, (data) => data);
			}
			return item;
		}

		test('SP画像のあるスライドとないスライドが混在しても、位置がずれない', async () => {
			const item = await createMixedItem(0);

			const slides = getSlides(item.export());
			expect(slides).toHaveLength(2);
			// Behavior change: スライドの画像の値（path / alt / width / height / loading / media）は、スライドごとに画像の配列になる（SP 画像は 2 枚目。SP 画像の無いスライドは画像 1 枚）
			expect(slides[0]).toMatchObject({
				path: ['/a.png', '/a-sp.png'],
				alt: ['A'],
				media: [null, '(max-width: 767px)'],
			});
			expect(slides[1]).toMatchObject({
				path: ['/b.png'],
				alt: ['B'],
				caption: 'Bの説明',
			});
			// expect(slides[0]).toMatchObject({ // previous
			// 	path: '/a.png', // previous
			// 	alt: 'A', // previous
			// 	spPath: '/a-sp.png', // previous
			// 	spMedia: '(max-width: 767px)', // previous
			// }); // previous
			// expect(slides[1]).toMatchObject({ // previous
			// 	path: '/b.png', // previous
			// 	alt: 'B', // previous
			// 	spPath: null, // previous
			// 	caption: 'Bの説明', // previous
			// }); // previous
		});

		test('何も変えずに2回保存し直しても、スライドの値が保たれる', async () => {
			const onceItem = await createMixedItem(0);
			const twiceItem = await createMixedItem(2);

			expect(getSlides(twiceItem.export())).toStrictEqual(getSlides(onceItem.export()));
		});

		test('SP画像のないスライドの<source>に、空の srcset / media や 0 の width / height を残さない', async () => {
			const item = await createMixedItem(2);

			const figures = item.el.querySelectorAll('figure');
			expect(figures).toHaveLength(2);
			expect(figures[0]?.querySelector('source')?.getAttribute('srcset')).toBe(
				'/a-sp.png',
			);
			// Behavior change: 画像1枚のスライドには <source> 自体が無い
			expect(figures[1]?.querySelector('source')).toBeNull();
			// const emptySource = figures[1]?.querySelector('source'); // previous
			// for (const name of ['srcset', 'media', 'width', 'height']) { // previous
			// 	expect(emptySource?.hasAttribute(name), name).toBe(false); // previous
			// } // previous
			expect(figures[1]?.querySelector('img')?.getAttribute('src')).toBe('/b.png');
		});

		test('全体の設定が保存と読み戻しで型を保つ', async () => {
			const item = createItem();

			await save(item, (data) => ({
				...data,
				autoplay: true,
				loop: true,
				perView: 3,
				arrows: false,
				dots: false,
				effect: 'fade',
			}));

			const data = item.export();
			expect(data).toMatchObject({
				autoplay: true,
				loop: true,
				perView: 3,
				arrows: false,
				dots: false,
				effect: 'fade',
			});
		});

		test('表示枚数はラッパーの style の --per-view だけに保存され、変更に追従する', async () => {
			const item = createItem();
			const wrapper = () => item.el.querySelector<HTMLElement>('[data-bge-autoplay]');

			expect(wrapper()?.getAttribute('style')).toBe('--per-view: 1');

			await save(item, (data) => ({ ...data, perView: 3 }));
			expect(wrapper()?.getAttribute('style')).toBe('--per-view: 3');
			expect(wrapper()?.hasAttribute('data-bge-per-view')).toBe(false);

			await save(item, (data) => ({ ...data, perView: 2 }));
			expect(wrapper()?.getAttribute('style')).toBe('--per-view: 2');
		});

		test('toItemData を通らない書き込み（エージェント経由）でも、表示枚数は 1 か所にしか無いので食い違わない', () => {
			const item = createItem();

			item.import({ ...item.export(), perView: 4 });

			const wrapper = item.el.querySelector<HTMLElement>('[data-bge-autoplay]');
			expect(wrapper?.getAttribute('style')).toBe('--per-view: 4');
			expect(item.export().perView).toBe(4);
		});

		test('スライドの名前（キャプションの文字、空なら alt）を data-bge-slide-label に保存し、変更に追従する', async () => {
			const item = createItem();
			const labels = () =>
				[...item.el.querySelectorAll('figure')].map((f) => f.dataset.bgeSlideLabel);

			await save(item, (data) =>
				appendSlide(
					{
						...data,
						caption: ['<strong>春の</strong>\n  庭'],
						alt: [['桜']],
					},
					{ ...DEFAULT_SLIDE, path: ['/b.png'], alt: ['紅葉'], caption: '' },
				),
			);
			expect(labels()).toEqual(['春の 庭', '紅葉']);

			await save(item, (data) => ({ ...data, caption: ['', '秋の山'] }));
			expect(labels()).toEqual(['桜', '秋の山']);
		});

		test('キャプションの改行やブロック要素の境目は、名前では空白になる', async () => {
			const item = createItem();

			await save(item, (data) => ({ ...data, caption: ['春の<br>庭<p>桜</p>'] }));

			expect(item.el.querySelector('figure')?.dataset.bgeSlideLabel).toBe('春の 庭 桜');
		});

		test('キャプションも alt も無いスライドの名前は空にする', async () => {
			const item = createItem();

			// Behavior change: 名前の無いスライドは確定できず、名前が空のまま保存されることは無い
			await expect(
				save(item, (data) => ({ ...data, caption: [''], alt: [['']] })),
			).rejects.toThrow('スライド1');
			// await save(item, (data) => ({ ...data, caption: [''], alt: [['']] })); // previous

			// expect(item.el.querySelector('figure')?.dataset.bgeSlideLabel).toBe(''); // previous
			expect(item.el.querySelector('img')?.getAttribute('alt')).toBe('サンプル画像');
		});

		test('data-bge-slide-label がキャプションと食い違っていても、キャプションから導き直す', async () => {
			const item = createItem();
			await save(item, (data) => ({ ...data, caption: ['春の庭'] }));
			item.el.querySelector('figure')?.setAttribute('data-bge-slide-label', '古い名前');

			await save(item, (data) => data);

			expect(item.el.querySelector('figure')?.dataset.bgeSlideLabel).toBe('春の庭');
		});
	});

	describe('スライドの名前とリンクの名前を必須にする', () => {
		const named = { ...DEFAULT_SLIDE, path: ['/a.png'], alt: ['桜'], caption: '' };

		/**
		 * 確定が拒まれたときのメッセージ。拒まれなければテストを失敗させる
		 * @param state
		 */
		async function rejectionOf(state: CarouselData) {
			try {
				await carouselItemSeed.toItemData!(state, testConfig);
			} catch (error) {
				return (error as Error).message;
			}
			throw new Error('確定が拒まれなかった');
		}

		test('キャプションも alt も無いスライドがあれば、そのスライドの番号だけを示して確定できない', async () => {
			const state = withSlidesOf(named, { ...named, alt: [''], caption: ' <br> ' });

			const message = await rejectionOf(state);

			expect(message).toMatch(/^スライド2: キャプションも代替テキスト\(alt\)も空です/);
			expect(message).not.toContain('スライド1');
		});

		test('名前の無いスライドが複数あれば、名前のあるスライドを除いて、すべての番号を示す', async () => {
			const state = withSlidesOf({ ...named, alt: [''] }, named, { ...named, alt: [''] });

			const message = await rejectionOf(state);

			expect(message).toMatch(
				/^スライド1、スライド3: キャプションも代替テキスト\(alt\)も空です/,
			);
			expect(message).not.toContain('スライド2');
		});

		test('alt が空白だけのスライドも、キャプションが無ければ名前が無いものとして拒む', async () => {
			const state = withSlidesOf(named, { ...named, alt: [' 　\n'], caption: '' });

			expect(await rejectionOf(state)).toMatch(/^スライド2: キャプションも/);
		});

		test.each([
			['リンク', { node: 'a', href: 'https://example.com/' }],
			['ポップアップ', { node: 'button', command: 'show-modal' }],
		] as const)(
			'%s のスライドで alt が空なら、キャプションがあっても確定できない',
			async (_label, link) => {
				const state = withSlidesOf(named, {
					...named,
					...link,
					alt: [''],
					caption: '春の庭',
				});

				const message = await rejectionOf(state);

				expect(message).toMatch(/^スライド2: 代替テキスト\(alt\)が空です/);
				expect(message).not.toContain('スライド1');
			},
		);

		test('リンクの理由と名前なしの理由が同居すれば、番号と理由の組を並べて示す', async () => {
			const state = withSlidesOf(
				{
					...named,
					node: 'a',
					href: 'https://example.com/',
					alt: [''],
					caption: '春の庭',
				},
				named,
				{ ...named, alt: [''], caption: '' },
			);

			const message = await rejectionOf(state);

			expect(message).toMatch(
				/^スライド1: 代替テキスト\(alt\)が空です。.+ スライド3: キャプションも代替テキスト\(alt\)も空です/,
			);
			expect(message).not.toContain('スライド2');
		});

		test('href が空白だけでも、image の toItemData と同じくリンクとして扱い、alt を必須にする', async () => {
			const state = withSlidesOf({ ...named, href: ' ', alt: [''], caption: '春の庭' });

			expect(await rejectionOf(state)).toMatch(/^スライド1: 代替テキスト\(alt\)が空です/);
		});

		test('ポップアップとリンク先が両方あっても、alt があれば確定できる', async () => {
			const state = withSlidesOf({
				...named,
				node: 'button',
				command: 'show-modal',
				href: 'https://example.com/',
				alt: ['拡大表示'],
			});

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.node).toEqual(['button']);
		});

		test('リンク先の無い a や、ポップアップでない button は、エディタと同じく装飾的な画像として扱い、alt が空でも名前があれば確定できる', async () => {
			const state = withSlidesOf(
				{ ...named, node: 'a', href: '', alt: [''], caption: '春の庭' },
				{ ...named, node: 'button', command: null, alt: [''], caption: '秋の山' },
			);

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.slideLabel).toEqual(['春の庭', '秋の山']);
		});

		test('キャプションだけ、alt だけのスライドは確定できる', async () => {
			const state = withSlidesOf(
				{ ...named, alt: [''], caption: '春の庭' },
				{ ...named, alt: ['桜'], caption: '' },
			);

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.slideLabel).toEqual(['春の庭', '桜']);
		});

		test('リンクのスライドは、alt があれば確定できる', async () => {
			const state = withSlidesOf({
				...named,
				node: 'a',
				href: 'https://example.com/',
				alt: ['詳細ページ'],
			});

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.node).toEqual(['a']);
		});

		test('名前の無いスライドを含む入力でも、読み込み・並べ替え・削除は止めない', () => {
			const state = withSlidesOf({ ...named, alt: [''] }, { ...named, alt: [''] }, named);

			expect(() => carouselItemSeed.toEditorState!(state, testConfig)).not.toThrow();
			expect(() => moveSlide(state, 0, 1)).not.toThrow();
			expect(removeSlide(state, 0).path).toHaveLength(2);
		});

		test('スライドの「決定」でも、名前が無ければ確定できない', async () => {
			const noName = { ...named, alt: [''], caption: '' };

			await expect(
				editorStateToSlide(slideToEditorState(noName, testConfig), testConfig),
			).rejects.toThrow('キャプションも代替テキスト(alt)も空');
		});

		test('スライドの「決定」で、リンクなのに alt が無ければ確定できない', async () => {
			const link = {
				...named,
				node: 'a' as const,
				href: 'https://example.com/',
				alt: [''],
				caption: '春の庭',
			};

			await expect(
				editorStateToSlide(slideToEditorState(link, testConfig), testConfig),
			).rejects.toThrow('代替テキスト(alt)');
		});

		test('スライドの「決定」は、キャプションだけでも alt だけでも通る', async () => {
			const onlyCaption = { ...named, alt: [''], caption: '春の庭' };
			const onlyAlt = { ...named, alt: ['桜'], caption: '' };

			await expect(
				editorStateToSlide(slideToEditorState(onlyCaption, testConfig), testConfig),
			).resolves.toMatchObject({ caption: '春の庭' });
			await expect(
				editorStateToSlide(slideToEditorState(onlyAlt, testConfig), testConfig),
				// Behavior change: スライドの画像の値（path / alt / width / height / loading / media）は、スライドごとに画像の配列になる
			).resolves.toMatchObject({ alt: ['桜'] });
			// ).resolves.toMatchObject({ alt: '桜' }); // previous
		});
	});
});

/**
 * スライドを並べた、保存前の状態（全体設定は既定値）を作る
 * @param slides
 */
function withSlidesOf(...slides: Parameters<typeof appendSlide>[1][]): CarouselData {
	let data = normalizeCarousel({} as never);
	for (const [index, slide] of slides.entries()) {
		data = index === 0 ? replaceSlide(data, 0, slide) : appendSlide(data, slide);
	}
	return data;
}
