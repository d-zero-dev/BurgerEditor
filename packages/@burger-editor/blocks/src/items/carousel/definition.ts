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
	// ラッパーの `style`（`--per-view`）。`perView` から導く値で、読み戻した値は使わない
	layoutStyle?: string;

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
	// `data-bge-*` 属性として保存する。`style.css` は scroll snap による横並びと、
	// 対応ブラウザでの標準の矢印・ドット（`::scroll-button()` / `::scroll-marker`）を
	// 持つ。表示枚数は属性値を CSS の計算に使えない（型付き `attr()` は Baseline では
	// ない）ため、`--per-view` としてラッパーの `style` にも書く。
	// 自動再生・ループ・フェードと、未対応ブラウザの矢印・ドットは
	// `@burger-editor/runtime` が属性を読んで補う。
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
