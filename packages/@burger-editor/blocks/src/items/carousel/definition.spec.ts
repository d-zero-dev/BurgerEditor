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
	const state = carouselItemSeed.toEditorState!(item.export() as never, testConfig);
	item.import((await carouselItemSeed.toItemData!(update(state), testConfig)) as never);
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
			const data = createItem().export() as never as CarouselData;

			expect(data.path).toHaveLength(1);
			expect(data.autoplay).toBe(false);
			expect(data.loop).toBe(false);
			expect(data.perView).toBe(1);
			expect(data.arrows).toBe(true);
			expect(data.dots).toBe(true);
			expect(data.effect).toBe('slide');
		});

		test('挿入直後（一度も編集していない）の <source> に、空の srcset / media や 0 の width / height を残さない', () => {
			const source = createItem().el.querySelector('source');

			expect(source).not.toBeNull();
			for (const name of ['srcset', 'media', 'width', 'height']) {
				expect(source?.hasAttribute(name), name).toBe(false);
			}
		});
	});

	describe('スライドの操作', () => {
		test('追加したスライドは既定値で、全配列が同じ長さになる', () => {
			const data = appendSlide(
				carouselItemSeed.toEditorState!(createItem().export() as never, testConfig),
				{ ...DEFAULT_SLIDE },
			);

			expect(getSlides(data)).toHaveLength(2);
			expect(data.path).toHaveLength(2);
			expect(data.spPath).toStrictEqual([null, null]);
			expect(getSlides(data)[1]).toStrictEqual(DEFAULT_SLIDE);
		});

		test('残り1枚のときは削除できない', () => {
			const data = carouselItemSeed.toEditorState!(
				createItem().export() as never,
				testConfig,
			);

			expect(removeSlide(data, 0).path).toHaveLength(1);
		});

		test('並べ替えは端では何もしない', () => {
			let data = appendSlide(
				carouselItemSeed.toEditorState!(createItem().export() as never, testConfig),
				{ ...DEFAULT_SLIDE },
			);
			data = replaceSlide(data, 0, { ...DEFAULT_SLIDE, path: '/a.png' });
			data = replaceSlide(data, 1, { ...DEFAULT_SLIDE, path: '/b.png' });

			expect(moveSlide(data, 0, -1).path).toStrictEqual(['/a.png', '/b.png']);
			expect(moveSlide(data, 1, 1).path).toStrictEqual(['/a.png', '/b.png']);
			expect(moveSlide(data, 0, 1).path).toStrictEqual(['/b.png', '/a.png']);
		});
	});

	describe('スライド ↔ imageアイテムの編集状態', () => {
		test('SP画像つきのスライドが往復しても値が変わらない', async () => {
			const slide = {
				...DEFAULT_SLIDE,
				path: '/pc.png',
				spPath: '/sp.png',
				spMedia: '(max-width: 767px)',
				spWidth: 300,
				spHeight: 200,
				alt: '説明',
				caption: 'キャプション',
				href: 'https://example.com/',
				node: 'a' as const,
			};

			const state = slideToEditorState(slide, testConfig);
			expect(state.path).toStrictEqual(['/pc.png', '/sp.png']);
			expect(state.media).toStrictEqual(['', '(max-width: 767px)']);
			expect(state.altEditable).toBe('説明');

			const result = await editorStateToSlide(state, testConfig);
			expect(result).toMatchObject({
				path: '/pc.png',
				spPath: '/sp.png',
				spMedia: '(max-width: 767px)',
				spWidth: 300,
				spHeight: 200,
				alt: '説明',
				caption: 'キャプション',
				href: 'https://example.com/',
				node: 'a',
			});
		});

		test('SP画像のないスライドは spPath が null のまま往復する', async () => {
			const state = slideToEditorState({ ...DEFAULT_SLIDE, path: '/pc.png' }, testConfig);

			const result = await editorStateToSlide(state, testConfig);

			expect(result.spPath).toBeNull();
			expect(result.spMedia).toBeNull();
			expect(result.spWidth).toBeNull();
		});

		test('保存済みHTMLの読み戻しで空文字・0になるSPの値は null に揃える', () => {
			const [slide] = getSlides({
				...carouselItemSeed.toEditorState!(createItem().export() as never, testConfig),
				path: ['/pc.png'],
				spPath: [''],
				spMedia: [''],
				spWidth: [0],
				spHeight: [0],
			});

			expect(slide).toMatchObject({
				spPath: null,
				spMedia: null,
				spWidth: null,
				spHeight: null,
			});
		});
	});

	describe('スライドの操作（範囲外・並び）', () => {
		const threeSlides = () => {
			let data = carouselItemSeed.toEditorState!(
				createItem().export() as never,
				testConfig,
			);
			data = replaceSlide(data, 0, { ...DEFAULT_SLIDE, path: '/a.png' });
			data = appendSlide(data, { ...DEFAULT_SLIDE, path: '/b.png' });
			return appendSlide(data, { ...DEFAULT_SLIDE, path: '/c.png' });
		};

		test('3枚から中間を削除すると、前後の並びが保たれる', () => {
			expect(removeSlide(threeSlides(), 1).path).toStrictEqual(['/a.png', '/c.png']);
		});

		test('範囲外の index では、削除・差し替え・並べ替えのどれも何もしない', () => {
			const data = threeSlides();

			expect(removeSlide(data, -1).path).toStrictEqual(data.path);
			expect(removeSlide(data, 3).path).toStrictEqual(data.path);
			expect(
				replaceSlide(data, 3, { ...DEFAULT_SLIDE, path: '/x.png' }).path,
			).toStrictEqual(data.path);
			expect(moveSlide(data, 3, -1).path).toStrictEqual(data.path);
		});
	});

	describe('全体設定の既定値', () => {
		test('全体設定が無い入力は、既定値で埋めて保存形に整える', async () => {
			const state = carouselItemSeed.toEditorState!({} as never, testConfig);
			const saved = await carouselItemSeed.toItemData!({} as never, testConfig);

			for (const data of [state, saved]) {
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

		test('既定値は template.html から導かれる（コードに別の値を持たない）', () => {
			// 新しく足すスライド。画像と説明は、テンプレートではサンプルが入るので空
			expect(defaultSlide()).toStrictEqual({
				path: '',
				alt: '',
				width: 400,
				height: 300,
				loading: 'lazy',
				spPath: null,
				spMedia: null,
				spWidth: null,
				spHeight: null,
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
			const fromTemplate = createItem().export() as never as CarouselData;
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
			const base = carouselItemSeed.toEditorState!(
				createItem().export() as never,
				testConfig,
			);

			const saved = await carouselItemSeed.toItemData!(
				{ ...base, perView: input },
				testConfig,
			);

			expect(saved.perView).toBe(expected);
		});
	});

	describe('スライド数', () => {
		test('path より長い配列があっても、そのスライドの値を捨てない', () => {
			const base = carouselItemSeed.toEditorState!(
				createItem().export() as never,
				testConfig,
			);

			const slides = getSlides({
				...base,
				path: ['/a.png'],
				caption: ['A', 'B'],
			});

			expect(slides).toHaveLength(2);
			expect(slides.map((s) => s.caption)).toStrictEqual(['A', 'B']);
			expect(slides[1]?.path).toBe(DEFAULT_SLIDE.path);
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
					path: '/a.png',
					alt: 'A',
					spPath: '/a-sp.png',
					spMedia: '(max-width: 767px)',
					spWidth: 300,
					spHeight: 200,
				});
				return replaceSlide(next, 1, {
					...DEFAULT_SLIDE,
					path: '/b.png',
					alt: 'B',
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

			const slides = getSlides(item.export() as never as CarouselData);
			expect(slides).toHaveLength(2);
			expect(slides[0]).toMatchObject({
				path: '/a.png',
				alt: 'A',
				spPath: '/a-sp.png',
				spMedia: '(max-width: 767px)',
			});
			expect(slides[1]).toMatchObject({
				path: '/b.png',
				alt: 'B',
				spPath: null,
				caption: 'Bの説明',
			});
		});

		test('何も変えずに2回保存し直しても、スライドの値が保たれる', async () => {
			const onceItem = await createMixedItem(0);
			const twiceItem = await createMixedItem(2);

			expect(getSlides(twiceItem.export() as never as CarouselData)).toStrictEqual(
				getSlides(onceItem.export() as never as CarouselData),
			);
		});

		test('SP画像のないスライドの<source>に、空の srcset / media や 0 の width / height を残さない', async () => {
			const item = await createMixedItem(2);

			const figures = item.el.querySelectorAll('figure');
			expect(figures).toHaveLength(2);
			expect(figures[0]?.querySelector('source')?.getAttribute('srcset')).toBe(
				'/a-sp.png',
			);
			const emptySource = figures[1]?.querySelector('source');
			for (const name of ['srcset', 'media', 'width', 'height']) {
				expect(emptySource?.hasAttribute(name), name).toBe(false);
			}
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

			const data = item.export() as never as CarouselData;
			expect(data).toMatchObject({
				autoplay: true,
				loop: true,
				perView: 3,
				arrows: false,
				dots: false,
				effect: 'fade',
			});
		});
	});
});
