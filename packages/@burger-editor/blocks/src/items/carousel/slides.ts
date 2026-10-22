import type { CarouselData } from './definition.js';
import type { ImageData } from '../image/definition.js';
import type { Config } from '@burger-editor/core';

import { imageDefinition } from '../image/definition.js';

import { templateDefaults } from './defaults.js';

/**
 * カルーセルのデータのうち、スライドごとに 1 要素ずつ持つ配列のキー。
 * frozen-patty はリストの入れ子に対応しないため、スライドごとの
 * 「PC画像 + SP画像」は `spPath` などの固定スロットで持つ。
 */
export const SLIDE_KEYS = [
	'path',
	'alt',
	'width',
	'height',
	'loading',
	'spPath',
	'spMedia',
	'spWidth',
	'spHeight',
	'style',
	'scale',
	'scaleType',
	'aspectRatio',
	'caption',
	'node',
	'href',
	'target',
	'command',
] as const;

type SlideKey = (typeof SLIDE_KEYS)[number];

/**
 * スライド 1 枚分の値。{@link CarouselData} の配列を index ごとに切り出したもの。
 */
export type Slide = { [K in SlideKey]: CarouselData[K][number] };

/**
 * SP 用の値の「無い」を `null` に揃える。frozen-patty は属性が無い `<source>` を
 * `null` として読むが、image エディタ（`slideToImageData` が空の SP を `''` / `0` で
 * 渡す）を経由した値や、属性が空・`0` で保存された HTML は `''` / `0` で届く。
 * それを書き戻すと `media=""` `width="0"` が `<source>` に残るので、`null` に
 * 揃えて属性ごと取り除く。
 * @param slide
 */
function normalizeSp<T extends Record<string, unknown>>(slide: T): T {
	return {
		...slide,
		spPath: slide['spPath'] || null,
		spMedia: slide['spMedia'] || null,
		spWidth: slide['spWidth'] || null,
		spHeight: slide['spHeight'] || null,
	};
}

/**
 * 追加直後のスライド。値は `template.html` の 1 枚目から導く（コードに書き写さない）。
 * 画像と説明（`path` / `alt`）は、テンプレートではサンプルが入るので空にする。
 */
export function defaultSlide(): Slide {
	const template = templateDefaults();
	const slide: Record<string, unknown> = {};
	for (const key of SLIDE_KEYS) {
		slide[key] = template[key][0] ?? null;
	}
	return { ...normalizeSp(slide), path: '', alt: '' } as Slide;
}

/**
 * スライドの配列に分解する。スライド数はスライドごとの配列のうち最長のもので、
 * 最低 1 枚（どれかの配列だけ短くても、そのスライドの値を捨てない）。
 * スライド 0 件は保存できない（リストが空になると、次の `import` で
 * 雛形にする要素が失われる）。
 * 足りない値は {@link defaultSlide} で埋める。frozen-patty は配列の
 * 足りない index を index 0 の値で埋めてしまうため、必ず全配列を同じ長さに
 * 揃えてから保存する。
 *
 * SP 用の値は「無い」ことを `null` に揃える。frozen-patty は属性が無い
 * `<source>` を `null` として読むが、image エディタ（`slideToImageData` が
 * 空の SP を `''` / `0` で渡す）を経由した値や、属性が空・`0` で保存された
 * HTML は `''` / `0` で届く。それを書き戻すと `media=""` `width="0"` が
 * `<source>` に残るので、ここで `null` に揃えて属性ごと取り除く。
 * @param data
 */
export function getSlides(data: Readonly<CarouselData>): Slide[] {
	const count = Math.max(1, ...SLIDE_KEYS.map((key) => data[key]?.length ?? 0));
	const fallback = defaultSlide();
	return Array.from({ length: count }, (_, index) => {
		const slide: Record<string, unknown> = {};
		for (const key of SLIDE_KEYS) {
			slide[key] = data[key]?.[index] ?? fallback[key];
		}
		return normalizeSp(slide) as Slide;
	});
}

/**
 * 表示枚数を 1 以上の整数に整える。数値入力は、空にすると `NaN`、小数や
 * 0 以下も入力できてしまうため、保存する値はここで揃える。
 * @param value
 * @param fallback
 */
function toPerView(value: number | undefined, fallback: number): number {
	if (value === undefined || !Number.isFinite(value)) {
		return fallback;
	}
	return Math.max(1, Math.floor(value));
}

/**
 * スライドの配列を、{@link CarouselData} の配列に戻す。全体設定は `data` の値を保つ。
 * @param data
 * @param slides
 */
export function withSlides(
	data: Readonly<CarouselData>,
	slides: readonly Slide[],
): CarouselData {
	const defaults = templateDefaults();
	const perView = toPerView(data.perView, defaults.perView);
	return {
		autoplay: data.autoplay ?? defaults.autoplay,
		loop: data.loop ?? defaults.loop,
		perView,
		arrows: data.arrows ?? defaults.arrows,
		dots: data.dots ?? defaults.dots,
		effect: data.effect ?? defaults.effect,
		path: slides.map((s) => s.path),
		alt: slides.map((s) => s.alt),
		width: slides.map((s) => s.width),
		height: slides.map((s) => s.height),
		loading: slides.map((s) => s.loading),
		spPath: slides.map((s) => s.spPath),
		spMedia: slides.map((s) => s.spMedia),
		spWidth: slides.map((s) => s.spWidth),
		spHeight: slides.map((s) => s.spHeight),
		style: slides.map((s) => s.style),
		scale: slides.map((s) => s.scale),
		scaleType: slides.map((s) => s.scaleType),
		aspectRatio: slides.map((s) => s.aspectRatio),
		caption: slides.map((s) => s.caption),
		node: slides.map((s) => s.node),
		href: slides.map((s) => s.href),
		target: slides.map((s) => s.target),
		command: slides.map((s) => s.command),
		slideLabel: slideLabels(slides),
	};
}

/**
 * 名前の中で区切り（空白）にする要素。改行とブロック要素。`@burger-editor/runtime` の
 * `carousel/index.ts` が同名の定数として写して持つ（runtime は他のパッケージに依存できない）。
 * 変えるときは両方を直す。両者が同じ名前を導くことは runtime のテストが確かめる
 */
const LABEL_BOUNDARIES =
	'br, hr, p, div, li, dt, dd, ul, ol, dl, h1, h2, h3, h4, h5, h6, blockquote, pre, table, tr, td, th, section, article, aside, header, footer, nav';

/**
 * スライドの名前。キャプションの文字（マークアップを除く）、空なら画像の alt。
 * Node.js から呼ばれるときも `@burger-editor/file-io` が `DOMParser` を用意する。
 * 改行やブロック要素の境目は空白にする（textContent はそのまま連結し、
 * 「春の<br>庭」が「春の庭」になるため）
 * @param slides
 */
function slideLabels(slides: readonly Slide[]): string[] {
	const parser = new DOMParser();
	const normalize = (text: string) => text.replaceAll(/\s+/g, ' ').trim();
	return slides.map((slide) => {
		const { body } = parser.parseFromString(slide.caption, 'text/html');
		for (const el of body.querySelectorAll(LABEL_BOUNDARIES)) {
			el.before(' ');
			el.after(' ');
		}
		return normalize(body.textContent) || normalize(slide.alt);
	});
}

/**
 * 全体設定の欠落を既定値で埋め、スライドの全配列を同じ長さに揃える。
 * @param data
 */
export function normalizeCarousel(data: Readonly<CarouselData>): CarouselData {
	return withSlides(data, getSlides(data));
}

/**
 * 作り終えたスライドを末尾に追加する。
 * @param data
 * @param slide
 */
export function appendSlide(data: Readonly<CarouselData>, slide: Slide): CarouselData {
	return withSlides(data, [...getSlides(data), slide]);
}

/**
 * スライドを 1 枚削除する。残り 1 枚のときは何もしない。
 * @param data
 * @param index
 */
export function removeSlide(data: Readonly<CarouselData>, index: number): CarouselData {
	const slides = getSlides(data);
	if (slides.length <= 1 || index < 0 || index >= slides.length) {
		return withSlides(data, slides);
	}
	return withSlides(
		data,
		slides.filter((_, i) => i !== index),
	);
}

/**
 * 配列の要素を前後に 1 つ動かした、新しい配列を返す。範囲外・端のときは同じ内容。
 * スライドと、スライドに並行して持つ行 ID の両方がこれで動くので、
 * 並びの規則が食い違わない。
 * @param items
 * @param index
 * @param delta - `-1`（前へ）または `1`（後ろへ）
 */
export function moveItem<T>(
	items: readonly T[],
	index: number,
	delta: -1 | 1,
): readonly T[] {
	const target = index + delta;
	const moved = items[index];
	const other = items[target];
	if (moved === undefined || other === undefined) {
		return items;
	}
	const next = [...items];
	next[index] = other;
	next[target] = moved;
	return next;
}

/**
 * スライドを前後に 1 つ動かす。端のときは何もしない。
 * @param data
 * @param index
 * @param delta - `-1`（前へ）または `1`（後ろへ）
 */
export function moveSlide(
	data: Readonly<CarouselData>,
	index: number,
	delta: -1 | 1,
): CarouselData {
	return withSlides(data, moveItem(getSlides(data), index, delta));
}

/**
 * スライド 1 枚を差し替える。
 * @param data
 * @param index
 * @param slide
 */
export function replaceSlide(
	data: Readonly<CarouselData>,
	index: number,
	slide: Slide,
): CarouselData {
	const slides = getSlides(data);
	if (index < 0 || index >= slides.length) {
		return withSlides(data, slides);
	}
	slides[index] = slide;
	return withSlides(data, slides);
}

/**
 * スライド 1 枚を、image アイテムのデータ（`ImageData` の保存形）に直す。
 * SP 画像は 2 枚目（`path[1]`）になる。
 *
 * `fileSize` `mediaInput` `cssWidth` `cssWidthNumber` `cssWidthUnit` `lazy`
 * `popup` `targetBlank` `altEditable` は、image の `toEditorState` が保存形
 * から導出し直す値で、ここでは型を満たすための仮置き。導出は image 側に
 * 任せるので、image のデフォルトが変わってもこの関数は追従しなくてよい。
 * @param slide
 */
function slideToImageData(slide: Slide): ImageData {
	const sp = slide.spPath;
	return {
		path: sp ? [slide.path, sp] : [slide.path],
		alt: [slide.alt],
		width: sp ? [slide.width, slide.spWidth ?? 0] : [slide.width],
		height: sp ? [slide.height, slide.spHeight ?? 0] : [slide.height],
		media: sp ? ['', slide.spMedia ?? ''] : [''],
		loading: [slide.loading],
		fileSize: '0',
		mediaInput: '',
		style: slide.style,
		cssWidth: '100cqi',
		scaleType: slide.scaleType,
		scale: slide.scale,
		aspectRatio: slide.aspectRatio,
		cssWidthNumber: 100,
		cssWidthUnit: 'cqi',
		lazy: slide.loading === 'lazy',
		caption: slide.caption,
		altEditable: slide.alt,
		node: slide.node,
		href: slide.href,
		popup: slide.node === 'button',
		target: slide.target,
		targetBlank: slide.target === '_blank',
		command: slide.command,
	};
}

/**
 * image アイテムの保存形（`toItemData` の結果）を、スライド 1 枚に直す。
 * @param data
 */
function imageDataToSlide(data: Readonly<ImageData>): Slide {
	const sp = data.path?.[1] || null;
	const fallback = defaultSlide();
	return {
		path: data.path?.[0] ?? fallback.path,
		alt: data.alt?.[0] ?? fallback.alt,
		width: data.width?.[0] ?? fallback.width,
		height: data.height?.[0] ?? fallback.height,
		loading: data.loading?.[0] ?? fallback.loading,
		spPath: sp,
		spMedia: sp ? data.media?.[1] || null : null,
		spWidth: sp ? data.width?.[1] || null : null,
		spHeight: sp ? data.height?.[1] || null : null,
		style: data.style ?? fallback.style,
		scale: data.scale ?? fallback.scale,
		scaleType: data.scaleType ?? fallback.scaleType,
		aspectRatio: data.aspectRatio ?? fallback.aspectRatio,
		caption: data.caption ?? fallback.caption,
		node: data.node ?? fallback.node,
		href: data.href ?? fallback.href,
		target: data.target ?? fallback.target,
		command: data.command ?? fallback.command,
	};
}

/**
 * スライド 1 枚を、スライド編集ダイアログ（`ImageEditor`）の編集状態にする。
 * @param slide
 * @param config
 */
export function slideToEditorState(slide: Slide, config: Config): ImageData {
	const data = slideToImageData(slide);
	return imageDefinition.toEditorState
		? imageDefinition.toEditorState(data, config)
		: data;
}

/**
 * スライド編集ダイアログの編集状態を、スライド 1 枚に戻す。
 * @param state
 * @param config
 */
export async function editorStateToSlide(
	state: ImageData,
	config: Config,
): Promise<Slide> {
	const data = imageDefinition.toItemData
		? await imageDefinition.toItemData(state, config)
		: state;
	return imageDataToSlide(data);
}
