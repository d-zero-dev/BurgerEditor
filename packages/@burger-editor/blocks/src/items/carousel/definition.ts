import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import { assertSlidesNamed, getSlides, normalizeCarousel } from './slides.js';
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
	// スライドの名前（キャプションの文字、空なら alt）。`caption` / `alt` から導く値で、
	// 読み戻した値は使わない。CSS だけで表示したとき、標準の `::scroll-marker` の
	// 名前を `attr()` で付けるために持つ（Chromium は figcaption から figure の名前を
	// 計算せず、id で指す方法はブロックの複製で重複する）。
	// `toItemData` は名前の無いスライドを拒むので、編集画面で保存すれば空にならない。
	// 一方、`toItemData` を通らない保存（エージェント経由、すでに保存された HTML）では、
	// 空や古いまま残り得る。`@burger-editor/runtime` は実行時にキャプション・alt から
	// 読み直して上書きする
	slideLabel?: string[];
};

/**
 * carouselアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const carouselDefinition: ItemSeed<string, CarouselData> = {
	// 全体の設定（自動再生・ループ・表示枚数・矢印・ドット・効果）は、ラッパーの
	// `data-bge-*` 属性として保存する。`style.css` は scroll snap による横並びと、
	// 対応ブラウザでの標準の矢印・ドット（`::scroll-button()` / `::scroll-marker`）を
	// 持つ。表示枚数は属性値を CSS の計算に使えない（型付き `attr()` は Baseline では
	// ない。https://webstatus.dev/features/attr）ため、`data-bge-*` 属性ではなくラッパーの `style` の `--per-view` だけに
	// 保存する（2 か所に持つと、`toItemData` を通らないエージェント経由の保存で
	// 食い違う）。
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
		// 失敗はEditorDialogが表示し、ダイアログは開いたままになる。読み込み・
		// 並べ替え・削除は検査しないので、名前の無い保存済みスライドも扱える
		const data = normalizeCarousel(state);
		assertSlidesNamed(getSlides(data));
		return data;
	},
};

export default createItem<CarouselData>(carouselDefinition);
