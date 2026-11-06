import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import { fillMediaQueries } from '../image/definition.js';

import {
	assertSlidesNamed,
	defaultSlide,
	getSlides,
	IMAGE_KEYS,
	normalizeCarousel,
	SLIDE_KEYS,
	toSlideImageValues,
} from './slides.js';
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
	// 画像の値（path から media まで）は、スライドの `<picture data-bge-list>` の
	// 入れ子のリストなので、スライドごとにさらに画像ごとの配列になる（image と同じ
	// 並びで、0 が `<img>`、1 以降が `<source>`）。`<img>`（0 番目）の media は、
	// 読み戻すと実行時は null になる。Why not `(string | null)[][]`: スライドを image の
	// 編集状態（`ImageData.media: string[]`）にそのまま渡すので型をそろえ、null は
	// image の `toEditorState`（`?? ''`）が吸収する
	path: string[][];
	alt: string[][];
	width: number[][];
	height: number[][];
	loading: ('eager' | 'lazy')[][];
	media: string[][];
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
	// 画面の保存・ブラウザ中継・エージェントの書き込みのどれでも、HTML にする直前に
	// かかる。冪等で、変えるものが無ければ同じオブジェクトを返し、throw しない
	normalizeItemData(data, config) {
		let next: Partial<CarouselData> = data;
		const set = (key: keyof CarouselData, value: unknown) => {
			if (next === data) {
				next = { ...data };
			}
			(next as Record<string, unknown>)[key] = value;
		};
		// 画像の値をスライドごとの配列に揃える（平らな配列やスカラーのままだと、
		// frozen-patty が内側の <picture> を空にして <img> を失う）
		for (const key of IMAGE_KEYS) {
			const value = toSlideImageValues(key, data[key]);
			if (value !== data[key]) {
				set(key, value);
			}
		}
		// スライドは最低 1 枚。スライドごとの値がすべて空の配列だと、frozen-patty が
		// 外側のリストを空にし、次の保存で雛形にするスライドが失われる
		const slideCounts = SLIDE_KEYS.map((key) => {
			const value: unknown = next[key];
			return Array.isArray(value) ? value.length : undefined;
		}).filter((count) => count !== undefined);
		if (slideCounts.length > 0 && slideCounts.every((count) => count === 0)) {
			set('path', [['']]);
		}
		// スライドごとの配列の長さをそろえる。短いままだと、frozen-patty は足りない
		// スライドを 1 枚目の値（画像の配列を含む）で埋め、別のスライドの alt や
		// <source> が複製される。足りない分は追加直後のスライドの既定値で埋める
		const slideCount = Math.max(0, ...slideCounts);
		let fallback: ReturnType<typeof defaultSlide> | undefined;
		for (const key of SLIDE_KEYS) {
			const values: unknown = next[key];
			if (!Array.isArray(values) || values.length >= slideCount) {
				continue;
			}
			fallback ??= defaultSlide();
			const filler: unknown = fallback[key];
			set(
				key,
				Array.from({ length: slideCount }, (_, index) =>
					index < values.length
						? values[index]
						: Array.isArray(filler)
							? [...filler]
							: filler,
				),
			);
		}
		// スライドごとに image と同じ補正をかける（画像を選んだ2枚目以降の空の
		// media を既定値で埋める。空の media の <source> は、どの画面幅でも
		// <img> より先に採用される）
		const paths: unknown[] = Array.isArray(next.path) ? next.path : [];
		const medias: unknown[] = Array.isArray(next.media) ? next.media : [];
		let media: unknown[] | undefined;
		for (const [index, path] of paths.entries()) {
			const slide = {
				path: path as string[],
				media: medias[index] as string[] | undefined,
			};
			const filled = fillMediaQueries(slide, config);
			if (filled !== slide) {
				media ??= [...medias];
				media[index] = filled.media;
			}
		}
		if (media) {
			// 穴（SP 画像の無いスライド）は、画像の無い media にする
			set(
				'media',
				Array.from(media, (value) => (Array.isArray(value) ? value : [])),
			);
		}
		return next;
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
