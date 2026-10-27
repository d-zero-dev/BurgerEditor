import type { CarouselData } from './definition.js';
import type { Config } from '@burger-editor/core';

import { Item } from '@burger-editor/core';
import { afterEach, describe, expect, test } from 'vitest';

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

	test('スライドの入れ物はキーボードでフォーカスできる（tabindex="0" が保存される）', async () => {
		const { list } = await mount('');

		expect(list.getAttribute('tabindex')).toBe('0');
	});
});
