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
				carouselItemSeed.toEditorState!(createItem().export(), testConfig),
				{ ...DEFAULT_SLIDE },
			);

			expect(getSlides(data)).toHaveLength(2);
			expect(data.path).toHaveLength(2);
			expect(data.spPath).toStrictEqual([null, null]);
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

			// Behavior change: キャプションも alt も無いスライドは確定できない（この入力は名前が無い）
			await expect(editorStateToSlide(state, testConfig)).rejects.toThrow(
				'キャプションも代替テキスト(alt)も空',
			);
			// const result = await editorStateToSlide(state, testConfig); // previous
			// expect(result.spPath).toBeNull(); // previous
			// expect(result.spMedia).toBeNull(); // previous
			// expect(result.spWidth).toBeNull(); // previous
		});

		test('名前のある SP画像のないスライドは spPath が null のまま往復する', async () => {
			const state = slideToEditorState(
				{ ...DEFAULT_SLIDE, path: '/pc.png', alt: '説明' },
				testConfig,
			);

			const result = await editorStateToSlide(state, testConfig);

			expect(result.spPath).toBeNull();
			expect(result.spMedia).toBeNull();
			expect(result.spWidth).toBeNull();
		});

		test('保存済みHTMLの読み戻しで空文字・0になるSPの値は null に揃える', () => {
			const [slide] = getSlides({
				...carouselItemSeed.toEditorState!(createItem().export(), testConfig),
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
			let data = carouselItemSeed.toEditorState!(createItem().export(), testConfig);
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
				{ alt: ['桜'] } as never,
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

			const slides = getSlides(item.export());
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

			expect(getSlides(twiceItem.export())).toStrictEqual(getSlides(onceItem.export()));
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
						alt: ['桜'],
					},
					{ ...DEFAULT_SLIDE, path: '/b.png', alt: '紅葉', caption: '' },
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
				save(item, (data) => ({ ...data, caption: [''], alt: [''] })),
			).rejects.toThrow('スライド1');
			// await save(item, (data) => ({ ...data, caption: [''], alt: [''] })); // previous

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
		const named = { ...DEFAULT_SLIDE, path: '/a.png', alt: '桜', caption: '' };

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
			const state = withSlidesOf(named, { ...named, alt: '', caption: ' <br> ' });

			const message = await rejectionOf(state);

			expect(message).toMatch(/^スライド2: キャプションも代替テキスト\(alt\)も空です/);
			expect(message).not.toContain('スライド1');
		});

		test('名前の無いスライドが複数あれば、名前のあるスライドを除いて、すべての番号を示す', async () => {
			const state = withSlidesOf({ ...named, alt: '' }, named, { ...named, alt: '' });

			const message = await rejectionOf(state);

			expect(message).toMatch(
				/^スライド1、スライド3: キャプションも代替テキスト\(alt\)も空です/,
			);
			expect(message).not.toContain('スライド2');
		});

		test('alt が空白だけのスライドも、キャプションが無ければ名前が無いものとして拒む', async () => {
			const state = withSlidesOf(named, { ...named, alt: ' 　\n', caption: '' });

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
					alt: '',
					caption: '春の庭',
				});

				const message = await rejectionOf(state);

				expect(message).toMatch(/^スライド2: 代替テキスト\(alt\)が空です/);
				expect(message).not.toContain('スライド1');
			},
		);

		test('リンクの理由と名前なしの理由が同居すれば、番号と理由の組を並べて示す', async () => {
			const state = withSlidesOf(
				{ ...named, node: 'a', href: 'https://example.com/', alt: '', caption: '春の庭' },
				named,
				{ ...named, alt: '', caption: '' },
			);

			const message = await rejectionOf(state);

			expect(message).toMatch(
				/^スライド1: 代替テキスト\(alt\)が空です。.+ スライド3: キャプションも代替テキスト\(alt\)も空です/,
			);
			expect(message).not.toContain('スライド2');
		});

		test('href が空白だけでも、image の toItemData と同じくリンクとして扱い、alt を必須にする', async () => {
			const state = withSlidesOf({ ...named, href: ' ', alt: '', caption: '春の庭' });

			expect(await rejectionOf(state)).toMatch(/^スライド1: 代替テキスト\(alt\)が空です/);
		});

		test('ポップアップとリンク先が両方あっても、alt があれば確定できる', async () => {
			const state = withSlidesOf({
				...named,
				node: 'button',
				command: 'show-modal',
				href: 'https://example.com/',
				alt: '拡大表示',
			});

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.node).toEqual(['button']);
		});

		test('リンク先の無い a や、ポップアップでない button は、エディタと同じく装飾的な画像として扱い、alt が空でも名前があれば確定できる', async () => {
			const state = withSlidesOf(
				{ ...named, node: 'a', href: '', alt: '', caption: '春の庭' },
				{ ...named, node: 'button', command: null, alt: '', caption: '秋の山' },
			);

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.slideLabel).toEqual(['春の庭', '秋の山']);
		});

		test('キャプションだけ、alt だけのスライドは確定できる', async () => {
			const state = withSlidesOf(
				{ ...named, alt: '', caption: '春の庭' },
				{ ...named, alt: '桜', caption: '' },
			);

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.slideLabel).toEqual(['春の庭', '桜']);
		});

		test('リンクのスライドは、alt があれば確定できる', async () => {
			const state = withSlidesOf({
				...named,
				node: 'a',
				href: 'https://example.com/',
				alt: '詳細ページ',
			});

			const saved = await carouselItemSeed.toItemData!(state, testConfig);

			expect(saved.node).toEqual(['a']);
		});

		test('名前の無いスライドを含む入力でも、読み込み・並べ替え・削除は止めない', () => {
			const state = withSlidesOf({ ...named, alt: '' }, { ...named, alt: '' }, named);

			expect(() => carouselItemSeed.toEditorState!(state, testConfig)).not.toThrow();
			expect(() => moveSlide(state, 0, 1)).not.toThrow();
			expect(removeSlide(state, 0).path).toHaveLength(2);
		});

		test('スライドの「決定」でも、名前が無ければ確定できない', async () => {
			const noName = { ...named, alt: '', caption: '' };

			await expect(
				editorStateToSlide(slideToEditorState(noName, testConfig), testConfig),
			).rejects.toThrow('キャプションも代替テキスト(alt)も空');
		});

		test('スライドの「決定」で、リンクなのに alt が無ければ確定できない', async () => {
			const link = {
				...named,
				node: 'a',
				href: 'https://example.com/',
				alt: '',
				caption: '春の庭',
			} as const;

			await expect(
				editorStateToSlide(slideToEditorState(link, testConfig), testConfig),
			).rejects.toThrow('代替テキスト(alt)');
		});

		test('スライドの「決定」は、キャプションだけでも alt だけでも通る', async () => {
			const onlyCaption = { ...named, alt: '', caption: '春の庭' };
			const onlyAlt = { ...named, alt: '桜', caption: '' };

			await expect(
				editorStateToSlide(slideToEditorState(onlyCaption, testConfig), testConfig),
			).resolves.toMatchObject({ caption: '春の庭' });
			await expect(
				editorStateToSlide(slideToEditorState(onlyAlt, testConfig), testConfig),
			).resolves.toMatchObject({ alt: '桜' });
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
