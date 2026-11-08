import type { CarouselData } from './definition.js';
import type { Config } from '@burger-editor/core';

import { Item } from '@burger-editor/core';
import { afterEach, describe, expect, onTestFinished, test } from 'vitest';
import { commands } from 'vitest/browser';

import carouselItemSeed, { carouselDefinition } from './definition.js';

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
};

afterEach(() => {
	document.body.replaceChildren();
	document.head.querySelector('#carousel-style')?.remove();
});

/**
 * carousel の style.css を読み込み、表示枚数 2・スライド 4 枚・幅 600px のアイテムを置く
 * @param itemStyle - アイテムの外枠に足す style（余白の変数など）
 */
async function mount(itemStyle: string) {
	const style = document.createElement('style');
	style.id = 'carousel-style';
	style.textContent = carouselDefinition.style;
	document.head.append(style);

	const seeds = new Map([['carousel', carouselItemSeed as never]]);
	const item = Item.create('carousel', seeds, testConfig) as unknown as Item<
		CarouselData,
		{}
	>;
	const state = carouselItemSeed.toEditorState!(item.export(), testConfig);
	const slides = (key: keyof CarouselData) =>
		Array.from({ length: 4 }, () => (state[key] as unknown[])[0]);
	const data = {
		...state,
		perView: 2,
		path: slides('path'),
		alt: slides('alt'),
		width: slides('width'),
		height: slides('height'),
		style: slides('style'),
		caption: ['1', '2', '3', '4'],
	} as CarouselData;
	item.import(await carouselItemSeed.toItemData!(data, testConfig));
	item.el.setAttribute('style', `inline-size: 600px; ${itemStyle}`);
	document.body.append(item.el);

	const list = item.el.querySelector<HTMLElement>('[data-bge-list]')!;
	const figures = [...list.querySelectorAll<HTMLElement>(':scope > figure')];
	return { list, figures };
}

describe('carousel の style.css（JS なしのレイアウト）', () => {
	test.each([
		['未指定', '', 300],
		// 単位なしの 0 は、長さとして登録していないと calc() ごと無効になる
		['単位なしの 0', '--bge-options-column-gap: 0', 300],
		['1rem', '--bge-options-column-gap: 1rem', 292],
	])(
		'スライド間の余白が %s のとき、表示枚数 2 で 1 枚の幅は %s px になり横に並ぶ',
		async (_, gap, width) => {
			const { list, figures } = await mount(gap);

			expect(figures[0]!.getBoundingClientRect().width).toBeCloseTo(width, 0);
			expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
		},
	);

	test.each([
		['作者の値（2）より小さい 1', '--bge-carousel-max-per-view: 1', '1', 600],
		['作者の値（2）以上の 5', '--bge-carousel-max-per-view: 5', '2', 300],
		// 0 だと列幅の計算がゼロ除算で無効になるので、1 枚にする
		['0', '--bge-carousel-max-per-view: 0', '1', 600],
		// 数値でない値は無効で、作者の値ではなく既定の 1 枚になる
		['単位付きの 2px', '--bge-carousel-max-per-view: 2px', '1', 600],
	])(
		'表示枚数の上限が %s のとき、実際の表示枚数は %s になり 1 枚の幅は %s px になる（作者の --per-view は変えない）',
		async (_, max, perView, width) => {
			const { list, figures } = await mount(max);
			const wrapper = list.parentElement!;

			expect(wrapper.style.getPropertyValue('--per-view')).toBe('2');
			expect(getComputedStyle(wrapper).getPropertyValue('--bge-carousel-per-view')).toBe(
				perView,
			);
			expect(figures[0]!.getBoundingClientRect().width).toBeCloseTo(width, 0);
		},
	);

	test('スライドの入れ物はキーボードでフォーカスできる（tabindex="0" が保存される）', async () => {
		const { list } = await mount('');

		expect(list.getAttribute('tabindex')).toBe('0');
	});
});

describe('carousel の style.css（スライドの中の画像のリスト）', () => {
	test('スライドの中の <picture>（画像のリスト）には、スライドのリストのレイアウトが当たらない', async () => {
		const { figures } = await mount('');
		const picture = figures[0]!.querySelector('picture')!;
		const style = getComputedStyle(picture);

		expect(Object.hasOwn(picture.dataset, 'bgeList')).toBe(true);
		expect(style.display).not.toBe('grid');
		expect(style.overflowX).toBe('visible');
		expect(style.scrollSnapType).toBe('none');
	});
});

describe('carousel の style.css（CSS だけの矢印とドットのスタイル変数）', () => {
	/**
	 * ブラウザがスクロール位置から `:disabled` / `:target-current` を更新するまで待つ
	 */
	async function settled() {
		for (let i = 0; i < 2; i++) {
			await new Promise(requestAnimationFrame);
		}
	}

	test('矢印は、アイテムに書いた --bge-carousel-button-* の値で描画される', async () => {
		const { list } = await mount(
			[
				'--bge-carousel-button-size: 48px',
				'--bge-carousel-button-font-size: 24px',
				'--bge-carousel-button-color: rgb(1, 2, 3)',
				'--bge-carousel-button-background: rgb(4, 5, 6)',
				'--bge-carousel-button-border: 2px dashed rgb(7, 8, 9)',
				'--bge-carousel-button-radius: 4px',
				'--bge-carousel-button-disabled-opacity: 0.5',
				"--bge-carousel-previous-icon: '←'",
				"--bge-carousel-next-icon: '→'",
			].join(';'),
		);
		await settled();
		const previous = getComputedStyle(list, '::scroll-button(inline-start)');
		const next = getComputedStyle(list, '::scroll-button(inline-end)');

		expect(previous.minWidth).toBe('48px');
		expect(previous.minHeight).toBe('48px');
		expect(previous.fontSize).toBe('24px');
		expect(previous.color).toBe('rgb(1, 2, 3)');
		expect(previous.backgroundColor).toBe('rgb(4, 5, 6)');
		expect(previous.borderTopWidth).toBe('2px');
		expect(previous.borderTopStyle).toBe('dashed');
		expect(previous.borderTopColor).toBe('rgb(7, 8, 9)');
		expect(previous.borderTopLeftRadius).toBe('4px');
		// 先頭にいるので「前へ」は無効
		expect(previous.opacity).toBe('0.5');
		expect(next.opacity).toBe('1');
		// 記号を変えても、代替テキスト（アクセシブルな名前）は保たれる
		expect(previous.content).toBe('"←" / "前のスライド"');
		expect(next.content).toBe('"→" / "次のスライド"');
	});

	test('ドットは、アイテムに書いた --bge-carousel-marker-* の値で描画される', async () => {
		const { list, figures } = await mount(
			[
				'--bge-carousel-marker-size: 20px',
				'--bge-carousel-marker-color: rgb(1, 2, 3)',
				'--bge-carousel-marker-border-width: 3px',
				'--bge-carousel-marker-border-color: rgb(4, 5, 6)',
				'--bge-carousel-marker-radius: 2px',
				'--bge-carousel-marker-current-background: rgb(7, 8, 9)',
				'--bge-carousel-marker-gap: 11px',
				'--bge-carousel-marker-target-size: 40px',
			].join(';'),
		);
		await settled();
		const first = getComputedStyle(figures[0]!, '::scroll-marker');
		const second = getComputedStyle(figures[1]!, '::scroll-marker');

		expect(first.width).toBe('20px');
		expect(first.height).toBe('20px');
		expect(first.color).toBe('rgb(1, 2, 3)');
		// 円の枠線は内側の影。枠線（border）は押せる範囲を広げる透明な帯
		expect(first.boxShadow).toBe('rgb(4, 5, 6) 0px 0px 0px 3px inset');
		expect(first.borderLeftWidth).toBe('10px');
		expect(first.borderLeftColor).toBe('rgba(0, 0, 0, 0)');
		// 外側の角丸は、円の角丸に押せる範囲の分を足したもの（2px + 10px）
		expect(first.borderTopLeftRadius).toBe('12px');
		// 塗りは透明な帯には及ばない
		expect(first.backgroundClip).toBe('padding-box');
		// 先頭のスライドが現在位置
		expect(first.backgroundColor).toBe('rgb(7, 8, 9)');
		expect(second.backgroundColor).toBe('rgba(0, 0, 0, 0)');
		expect(getComputedStyle(list, '::scroll-marker-group').columnGap).toBe('11px');
	});

	test('ドットの押せる範囲は、既定で 1.5rem 四方（直径 0.75rem の円を透明な帯で囲む）', async () => {
		const { figures } = await mount('');
		await settled();
		const marker = getComputedStyle(figures[0]!, '::scroll-marker');

		// 円 12px + 透明な枠線 6px × 2 = 24px
		expect(marker.boxSizing).toBe('content-box');
		expect(marker.width).toBe('12px');
		expect(marker.borderLeftWidth).toBe('6px');
		expect(marker.borderLeftColor).toBe('rgba(0, 0, 0, 0)');
	});

	test('矢印の記号に url() の画像を指定でき、名前は保たれる', async () => {
		const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'/>";
		const icon = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
		const { list } = await mount(`--bge-carousel-previous-icon: ${icon}`);
		await settled();

		expect(getComputedStyle(list, '::scroll-button(inline-start)').content).toBe(
			`${icon} / "前のスライド"`,
		);
	});

	test.each([
		['円の大きさが単位なしの数値', '--bge-carousel-marker-size: 0.75'],
		['押せる範囲が auto', '--bge-carousel-marker-target-size: auto'],
	])(
		'ドットの%sでも、既定の大きさ（円 12px・押せる範囲 24px）に戻る',
		async (_, style) => {
			const { figures } = await mount(style);
			await settled();
			const marker = getComputedStyle(figures[0]!, '::scroll-marker');

			expect(marker.width).toBe('12px');
			expect(marker.borderLeftWidth).toBe('6px');
		},
	);

	test('ドットの押せる範囲を円より小さくしても、透明な帯は 0 になり円の大きさで表示される', async () => {
		const { figures } = await mount('--bge-carousel-marker-target-size: 8px');
		await settled();
		const marker = getComputedStyle(figures[0]!, '::scroll-marker');

		expect(marker.width).toBe('12px');
		expect(marker.borderLeftWidth).toBe('0px');
	});

	test('強制カラーモードでは、円の枠線を 0 にしても 1px の CanvasText で描画し、現在のドットも CanvasText で塗る', async () => {
		await commands.emulateMedia({ forcedColors: 'active' });
		onTestFinished(async () => {
			await commands.emulateMedia({ forcedColors: null });
		});
		const { figures } = await mount('--bge-carousel-marker-border-width: 0');
		await settled();
		const first = getComputedStyle(figures[0]!, '::scroll-marker');
		const second = getComputedStyle(figures[1]!, '::scroll-marker');

		expect(first.forcedColorAdjust).toBe('none');
		expect(second.boxShadow).toMatch(/^rgb\(\d+, \d+, \d+\) 0px 0px 0px 1px inset$/);
		expect(first.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(second.backgroundColor).toBe('rgba(0, 0, 0, 0)');
	});

	test('矢印の記号の変数に不正な値を書いても、既定の記号と名前に戻る（@property で型を登録している）', async () => {
		const { list } = await mount('--bge-carousel-previous-icon: none');
		await settled();

		expect(getComputedStyle(list, '::scroll-button(inline-start)').content).toBe(
			'"‹" / "前のスライド"',
		);
	});

	test('ドットの色は矢印の色とは別の変数で決まる（矢印だけを白にしてもドットは変わらない）', async () => {
		const { list, figures } = await mount(
			'--bge-carousel-button-color: rgb(255, 255, 255)',
		);

		expect(getComputedStyle(list, '::scroll-button(inline-start)').color).toBe(
			'rgb(255, 255, 255)',
		);
		expect(getComputedStyle(figures[0]!, '::scroll-marker').color).toBe('rgb(0, 0, 0)');
	});
});
