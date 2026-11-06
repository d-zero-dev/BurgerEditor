import type { CarouselData } from './definition.js';
import type { ImageData } from '../image/definition.js';
import type { Config } from '@burger-editor/core';

import {
	ALT_REQUIRED_MESSAGE,
	imageDefinition,
	isPopup,
	needsAltForName,
	wrapperNodeOf,
} from '../image/definition.js';

import { templateDefaults } from './defaults.js';

/**
 * スライドの `<picture data-bge-list>` の中にあるキー。スライドごとの値が、
 * image アイテムと同じ画像ごとの配列になる（0 が `<img>`、1 以降が `<source>`）。
 * @example
 * ```ts
 * // スライド 1 枚目に PC 画像と SP 画像、2 枚目に画像 1 枚
 * const data: Pick<CarouselData, (typeof IMAGE_KEYS)[number]> = {
 * 	path: [['/pc1.png', '/sp1.png'], ['/pc2.png']],
 * 	alt: [['説明1'], ['説明2']],
 * 	width: [[400, 300], [400]],
 * 	height: [[300, 200], [300]],
 * 	loading: [['lazy'], ['lazy']],
 * 	media: [['', '(max-width: 767px)'], ['']],
 * };
 * ```
 */
export const IMAGE_KEYS = ['path', 'alt', 'width', 'height', 'loading', 'media'] as const;

/**
 * カルーセルのデータのうち、スライドごとに 1 要素ずつ持つ配列のキー。
 * {@link IMAGE_KEYS} の値は、さらに画像ごとの配列（frozen-patty の入れ子のリスト）。
 */
export const SLIDE_KEYS = [
	...IMAGE_KEYS,
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

type ImageKey = (typeof IMAGE_KEYS)[number];

/**
 * @param key - A key of {@link CarouselData}
 */
function isImageKey(key: string): key is ImageKey {
	return (IMAGE_KEYS as readonly string[]).includes(key);
}

/**
 * スライド 1 枚分の値。{@link CarouselData} の配列を index ごとに切り出したもの。
 */
export type Slide = { [K in SlideKey]: CarouselData[K][number] };

/**
 * スライド 1 枚分の画像の値を、画像ごとの配列に揃える。配列でない値は 1 枚の画像
 * として包み、無い値と空の配列は `fallback` にする。frozen-patty は内側の配列が
 * 空だと `<picture>` の中身を描かず、次の保存の雛形にする `<img>` も失うので、
 * 空のままにしない。
 * @param value
 * @param fallback
 */
function toImageValues<T>(value: unknown, fallback: readonly T[]): T[] {
	if (Array.isArray(value)) {
		return value.length > 0 ? (value as T[]) : [...fallback];
	}
	return value == null ? [...fallback] : [value as T];
}

/**
 * 保存データの画像のキー 1 つ分を、スライドごとの配列（配列の配列）に揃える。
 * エージェントは image と同じ平らな配列（`path: ['/a.png', '/b.png']`）や、
 * カタログの雛形のスカラー（`path: ''`）を送り得る。そのまま書くと、frozen-patty は
 * 内側の `<picture>` を空にして `<img>` を失う。平らな値はスライド 1 枚に画像 1 枚
 * として包み、`path` の空の配列は空の画像 1 枚にする。無い値（部分データ）と、
 * すでに揃っている値は、同じ参照を返す。
 * @param key - 画像のキー（`path` の空の配列だけを、空の画像 1 枚にする）
 * @param value - エージェントが送った値（任意の JSON）
 * @returns 揃えた値。変える必要が無ければ `value` そのもの
 * @example
 * ```ts
 * toSlideImageValues('path', ['/a.png', '/b.png']); // [['/a.png'], ['/b.png']]
 * toSlideImageValues('path', ''); // [['']]
 * toSlideImageValues('path', [[]]); // [['']]
 * toSlideImageValues('media', [['', '(max-width: 767px)']]); // 同じ参照
 * toSlideImageValues('path', undefined); // undefined（部分データ）
 * ```
 */
export function toSlideImageValues(key: ImageKey, value: unknown): unknown {
	if (value === undefined) {
		return value;
	}
	if (!Array.isArray(value)) {
		return [[value]];
	}
	let next: unknown[] | undefined;
	for (const [index, item] of value.entries()) {
		const fixed = Array.isArray(item)
			? key === 'path' && item.length === 0
				? ['']
				: item
			: item === undefined
				? item
				: [item];
		if (fixed !== item) {
			next ??= [...value];
			next[index] = fixed;
		}
	}
	return next ?? value;
}

/**
 * 追加直後のスライド。値は `template.html` の 1 枚目から導く（コードに書き写さない）。
 * 画像と説明（`path` / `alt`）は、テンプレートではサンプルが入るので空にする。
 */
export function defaultSlide(): Slide {
	const template = templateDefaults();
	const slide: Record<string, unknown> = {};
	for (const key of SLIDE_KEYS) {
		const value: unknown = template[key][0];
		// 内側の配列はテンプレートの読み取り結果（キャッシュ）と共有しない
		slide[key] = Array.isArray(value) ? [...value] : (value ?? null);
	}
	return { ...slide, path: [''], alt: [''] } as Slide;
}

/**
 * スライドの配列に分解する。スライド数はスライドごとの配列のうち最長のもので、
 * 最低 1 枚（どれかの配列だけ短くても、そのスライドの値を捨てない）。
 * スライド 0 件は保存できない（リストが空になると、次の `import` で
 * 雛形にする要素が失われる）。
 * 足りない値は {@link defaultSlide} で埋める。frozen-patty は配列の
 * 足りない index を index 0 の値で埋めてしまうため、必ず全配列を同じ長さに
 * 揃えてから保存する。画像の値（{@link IMAGE_KEYS}）は画像ごとの配列に揃える
 * （配列でない値は 1 枚の画像、空の配列は既定値）。
 * @param data
 */
export function getSlides(data: Readonly<CarouselData>): Slide[] {
	const lengthOf = (key: SlideKey) => {
		const value: unknown = data[key];
		return Array.isArray(value) ? value.length : 0;
	};
	const count = Math.max(1, ...SLIDE_KEYS.map((key) => lengthOf(key)));
	const fallback = defaultSlide();
	return Array.from({ length: count }, (_, index) => {
		const slide: Record<string, unknown> = {};
		for (const key of SLIDE_KEYS) {
			const values: unknown = data[key];
			const value: unknown = Array.isArray(values) ? values[index] : undefined;
			slide[key] = isImageKey(key)
				? toImageValues<unknown>(value, fallback[key])
				: (value ?? fallback[key]);
		}
		return slide as Slide;
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
		media: slides.map((s) => s.media),
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
 * スライド 1 枚の名前。キャプションの文字（マークアップを除く）、空なら画像の alt。
 * Node.js から呼ばれるときも `@burger-editor/file-io` が `DOMParser` を用意する。
 * 改行やブロック要素の境目は空白にする（textContent はそのまま連結し、
 * 「春の<br>庭」が「春の庭」になるため）
 * @param slide - 名前の元
 * @param slide.caption - キャプション（HTML）
 * @param slide.alt - 画像1の代替テキスト
 * @param parser - 複数枚を続けて導くときに使い回す
 * @example
 * ```ts
 * slideLabelOf({ caption: '春の<br>庭', alt: '桜' }) // '春の 庭'
 * slideLabelOf({ caption: '', alt: '桜' }) // '桜'
 * slideLabelOf({ caption: '', alt: '' }) // ''（名前が無い）
 * ```
 */
export function slideLabelOf(
	slide: { readonly caption: string; readonly alt: string },
	parser = new DOMParser(),
): string {
	const normalize = (text: string) => text.replaceAll(/\s+/g, ' ').trim();
	const { body } = parser.parseFromString(slide.caption, 'text/html');
	for (const el of body.querySelectorAll(LABEL_BOUNDARIES)) {
		el.before(' ');
		el.after(' ');
	}
	return normalize(body.textContent) || normalize(slide.alt);
}

/**
 * スライドごとの名前。{@link slideLabelOf} を全スライドに適用する。
 * @param slides
 */
function slideLabels(slides: readonly Slide[]): string[] {
	const parser = new DOMParser();
	return slides.map((slide) =>
		slideLabelOf({ caption: slide.caption, alt: slide.alt[0] ?? '' }, parser),
	);
}

/**
 * スライドにキャプションか alt のどちらかが必須な理由。スライド編集ダイアログの
 * 説明文と、確定を拒むときのメッセージ、エージェントの書き込みを拒む理由が同じ文言を
 * 使う（文言を変えるときは、エージェントが読む理由文でもあることに注意する）。
 */
export const SLIDE_NAME_NOTE =
	'キャプションか代替テキストのどちらかが、スライドとドットの名前になるため必須です。';

/**
 * キャプションも alt も無いスライドを拒むときの理由（編集画面の確定とエージェントの
 * 書き込みで共通）。
 */
const UNNAMED_SLIDE_MESSAGE = `キャプションも代替テキスト(alt)も空です。${SLIDE_NAME_NOTE}`;

/**
 * リンク・ポップアップのスライドで alt が空のときの理由。image と同じ文言を使う。
 */
const UNNAMED_LINK_MESSAGE = ALT_REQUIRED_MESSAGE;

/**
 * スライドが名前を持てない理由。名前を持てるなら `null`。
 *
 * 包む要素は image のエディタと同じ決め方（{@link wrapperNodeOf}）で、保存された
 * `node` ではなくポップアップ・リンク先から導く。保存された `node` を使うと、
 * リンク先が空の `a` のように、エディタが必須と示さないものまで拒んでしまう。
 * @param slide
 * @param parser - 複数枚を続けて調べるときに使い回す
 */
function unnamedReasonOf(slide: Slide, parser?: DOMParser): string | null {
	const popup = isPopup(slide.node, slide.command);
	// エージェントは任意の JSON を送る。文字列でない値は、空として扱う
	const rawAlt: unknown = slide.alt[0];
	const rawCaption: unknown = slide.caption;
	const alt = typeof rawAlt === 'string' ? rawAlt : '';
	const caption = typeof rawCaption === 'string' ? rawCaption : '';
	if (needsAltForName(wrapperNodeOf(popup, slide.href), alt)) {
		return UNNAMED_LINK_MESSAGE;
	}
	return slideLabelOf({ caption, alt }, parser) ? null : UNNAMED_SLIDE_MESSAGE;
}

/**
 * 保存する前に、すべてのスライドが名前を持つことを確かめる。名前の無いスライドは、
 * ドットの名前（`::scroll-marker`）が支援技術から消え、リンクやポップアップの
 * スライドは操作する要素に名前が付かない。保存済みの HTML を開くだけでは呼ばないので、
 * すでに保存された名前の無いスライドも開ける。そのカルーセルを確定するときは、
 * 名前の無いスライドを直す必要がある。
 *
 * 編集画面の「決定」（`toItemData`）が呼ぶ。エージェントの書き込みは、同じ判定を
 * {@link unnamedSlidesMessage} から得る（`validateItemData`）。
 * @param slides - 検査するスライド（{@link getSlides} の結果）
 * @throws {Error} 名前の無いスライドがあるとき。メッセージにスライドの番号（1 始まり）を含む
 * @example
 * ```ts
 * assertSlidesNamed(getSlides(normalizeCarousel(state)));
 * ```
 */
export function assertSlidesNamed(slides: readonly Slide[]): void {
	const message = unnamedSlidesMessage(slides);
	if (message) {
		throw new Error(message);
	}
}

/**
 * 名前を持てないスライドがあるとき、その番号（1 始まり）と理由を並べたメッセージ。
 * すべてのスライドが名前を持つなら `null`。{@link assertSlidesNamed}（編集画面の
 * 「決定」）と、`validateItemData`（`toItemData` を通らない書き込み）が、同じ文を使う。
 * @param slides - 検査するスライド（{@link getSlides} の結果）
 * @example
 * ```ts
 * unnamedSlidesMessage(getSlides(data));
 * // 'スライド2: キャプションも代替テキスト(alt)も空です。…'
 * // すべてのスライドに名前があれば null
 * ```
 */
export function unnamedSlidesMessage(slides: readonly Slide[]): string | null {
	const parser = new DOMParser();
	const byReason = new Map<string, string[]>();
	for (const [index, slide] of slides.entries()) {
		const reason = unnamedReasonOf(slide, parser);
		if (reason) {
			const names = byReason.get(reason) ?? [];
			names.push(`スライド${index + 1}`);
			byReason.set(reason, names);
		}
	}
	if (byReason.size === 0) {
		return null;
	}
	return [...byReason]
		.map(([reason, names]) => `${names.join('、')}: ${reason}`)
		.join(' ');
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
 * スライドの画像の値は image と同じ形なので、そのまま渡す。
 *
 * `fileSize` `mediaInput` `cssWidth` `cssWidthNumber` `cssWidthUnit` `lazy`
 * `popup` `targetBlank` `altEditable` は、image の `toEditorState` が保存形
 * から導出し直す値で、ここでは型を満たすための仮置き。導出は image 側に
 * 任せるので、image のデフォルトが変わってもこの関数は追従しなくてよい。
 * @param slide
 */
function slideToImageData(slide: Slide): ImageData {
	return {
		...slide,
		fileSize: '0',
		mediaInput: '',
		cssWidth: '100cqi',
		cssWidthNumber: 100,
		cssWidthUnit: 'cqi',
		lazy: slide.loading[0] === 'lazy',
		altEditable: slide.alt[0] ?? '',
		popup: slide.node === 'button',
		targetBlank: slide.target === '_blank',
	};
}

/**
 * image アイテムの保存形（`toItemData` の結果）から、スライドの値だけを拾う
 * （編集専用の値は保存しない）。
 * @param data
 */
function imageDataToSlide(data: Readonly<ImageData>): Slide {
	const fallback = defaultSlide();
	const slide: Record<string, unknown> = {};
	for (const key of SLIDE_KEYS) {
		const value: unknown = data[key];
		slide[key] = isImageKey(key)
			? toImageValues<unknown>(value, fallback[key])
			: (value ?? fallback[key]);
	}
	return slide as Slide;
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
 * @throws {Error} リンクやポップアップで alt が空のとき（image の `toItemData`）、
 * またはキャプションも alt も空のとき。ダイアログは開いたまま理由を表示する
 */
export async function editorStateToSlide(
	state: ImageData,
	config: Config,
): Promise<Slide> {
	const data = imageDefinition.toItemData
		? await imageDefinition.toItemData(state, config)
		: state;
	const slide = imageDataToSlide(data);
	const reason = unnamedReasonOf(slide);
	if (reason) {
		throw new Error(reason);
	}
	return slide;
}
