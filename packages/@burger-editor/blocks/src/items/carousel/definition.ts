import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import { normalizeCarousel } from './slides.js';
import style from './style.css';
import template from './template.html';

export type CarouselData = {
	// 全体の設定
	autoplay: boolean;
	loop: boolean;
	perView: number;
	arrows: boolean;
	dots: boolean;
	effect: 'slide' | 'fade';

	// スライドごとの値（すべて同じ長さの配列）。値の意味は image アイテムと同じ。
	// SP 画像は `<picture>` のリストにすると入れ子になるため、`sp*` の固定スロットで持つ
	path: string[];
	alt: string[];
	width: number[];
	height: number[];
	loading: ('eager' | 'lazy')[];
	spPath: (string | null)[];
	spMedia: (string | null)[];
	spWidth: (number | null)[];
	spHeight: (number | null)[];
	style: string[];
	scale: number[];
	scaleType: ('container' | 'original')[];
	aspectRatio: (`${number}/${number}` | 'revert')[];
	caption: string[];
	node: ('div' | 'button' | 'a')[];
	href: string[];
	target: ('_blank' | null)[];
	command: ('show-modal' | null)[];
};

/**
 * carouselアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const carouselDefinition: ItemSeed<string, CarouselData> = {
	// 全体の設定（自動再生・ループ・表示枚数・矢印・ドット・効果）は、ラッパーの
	// `data-bge-*` 属性として保存するだけで、このアイテムの CSS も JS も解釈しない。
	// スライドを送る動作は公開ページ側が属性を読んで行う。`style.css` が持つのは
	// 各スライド（figure / img / figcaption）の見た目だけで、スライドを横に並べる
	// レイアウトは持たない（属性を読む側が決める）。
	//
	// 既定値の正は `template.html` ひとつだけ。足すスライドの初期値や、未指定の
	// 全体設定は、`defaults.ts` がテンプレートを読んで導く（コードに値を写さない）
	version: __VERSION__,
	name: 'carousel',
	template,
	style,
	toEditorState(data) {
		return normalizeCarousel(data);
	},
	toItemData(state) {
		return normalizeCarousel(state);
	},
};

export default createItem<CarouselData>(carouselDefinition);
