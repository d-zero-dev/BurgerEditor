import type { Config, ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';
import { createWidthState } from './width.js';

const ORIGIN = '__org';

export type ImageData = {
	// Images (Multiple)
	path: string[];
	/**
	 * 代替テキスト。`<picture>` の `<source>` 要素には `alt` 属性が無いため、
	 * 実際に HTML へ反映されるのは index 0（`<img>` に変換される画像）の値のみ。
	 * 2枚目以降の値はエディタ上では保持しない（`toItemData` で index 0 の
	 * 1要素配列に正規化する）
	 */
	alt: string[];
	width: number[];
	height: number[];
	media: string[];
	loading: ('eager' | 'lazy')[];

	// Use in editor
	fileSize: string;
	mediaInput: string;
	// Styles
	style: string;
	cssWidth: `${number}px` | `${number}cqi`;
	scaleType: 'container' | 'original';
	scale: number;
	aspectRatio: `${number}/${number}` | 'revert';

	// Editor Display
	cssWidthNumber: number;
	cssWidthUnit: 'px' | 'cqi';

	// Attributes
	lazy: boolean;

	// Additional Data
	caption: string;
	altEditable: string;

	// Behavior
	node: 'div' | 'button' | 'a';
	href: string;
	/**
	 * ポップアップで画像を開くか。保存データの `node` が `button` で `command` が
	 * `show-modal` のときだけ `true`（`toEditorState` で導く）。カルーセルの確定前の検査も
	 * スライドの `node` / `command` から同じ条件で導く（`wrapperNodeOf` を参照）
	 */
	popup: boolean;
	target: '_blank' | null;
	targetBlank: boolean;
	command: 'show-modal' | null;
};

/**
 * リンク・ポップアップの画像で代替テキスト（alt）が必須な理由。エディタの説明文と、
 * `toItemData` が確定を拒むときのメッセージ、カルーセルの検査が同じ文言を使う。
 */
export const ALT_FOR_NAME_NOTE =
	'リンクやポップアップの画像では、代替テキストがリンクやボタンの名前になるため必須です。';

/**
 * `toItemData` が確定を拒むときのメッセージ。カルーセルの確定前の検査も同じ文字列を使う。
 */
export const ALT_REQUIRED_MESSAGE = `代替テキスト(alt)が空です。${ALT_FOR_NAME_NOTE}`;

/**
 * `config.mediaQueries` を省略したときの、2枚目以降の画像（`<source>`）のメディアクエリー。
 * 値の正はここ。README・skills にも同じ値を書いているので、変えるときは
 * `767px` で検索して合わせて直す。
 * @example
 * ```ts
 * DEFAULT_MEDIA_QUERIES // ['(max-width: 767px)']
 * ```
 */
export const DEFAULT_MEDIA_QUERIES: readonly string[] = ['(max-width: 767px)'];

/**
 * 2枚目以降の画像（`<source>`）に付けるメディアクエリーの候補。入力欄の候補になり、
 * 先頭が、空のまま確定されたときと、画像を選んだときの既定値になる。
 *
 * `<source>` の `media` が空だと、どの画面幅でも条件に合い、`<img>`（1枚目）より先に
 * 採用される。広い画面でも2枚目が表示されてしまうので、`normalizeItemData` が、
 * 保存する経路すべて（エディタ・ブラウザ中継・エージェントの書き込み。
 * `page_update` の `insert` / `replace` の生の HTML も、アイテムを読み戻してかける）で、
 * 2枚目に値を付ける。
 * https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element
 * @param config - `mediaQueries` を省略するか空にすると {@link DEFAULT_MEDIA_QUERIES}。
 * `overrides` で `config` を外したテスト用のエンジンでも落ちないよう、`undefined` も受け付ける。
 * 候補の前後の空白は取り除き（残ると、保存される `media` と入力欄の候補が食い違う）、
 * 空白だけの候補は捨て、重複は 1 つにまとめる。配列でない値と、文字列でない候補は無視する
 * @example
 * ```ts
 * mediaQueriesOf({}) // ['(max-width: 767px)']
 * mediaQueriesOf({ mediaQueries: ['(max-width: 599px)', '(max-width: 1023px)'] })
 * // ['(max-width: 599px)', '(max-width: 1023px)']
 * mediaQueriesOf({ mediaQueries: [' (max-width: 599px)', '(max-width: 599px)'] })
 * // ['(max-width: 599px)']
 * ```
 */
export function mediaQueriesOf(config?: Pick<Config, 'mediaQueries'>): readonly string[] {
	// 設定ファイルの値は検査されずに届く（`resolveConfig` は素通しする）。保存の
	// 補正は throw しない約束なので、配列でない値は無いものとし、文字列でない候補は捨てる
	const configured: unknown = config?.mediaQueries;
	const queries = (Array.isArray(configured) ? configured : [])
		.filter((query): query is string => typeof query === 'string')
		.map((query) => query.trim())
		.filter((query) => query !== '');
	return queries.length > 0 ? [...new Set(queries)] : DEFAULT_MEDIA_QUERIES;
}

/**
 * 画像 `index` のメディアクエリー。2枚目以降（index ≥ 1）で空・空白だけ・未設定なら、
 * {@link mediaQueriesOf} の先頭（既定値）を返す。値があれば、前後の空白を取り除いて返す。
 * 画像1（`<img>`）の `media` は `<source>` に出ないので、触らない。
 *
 * エディタの画像読み込み・入力欄から離れたとき・`toItemData`・`normalizeItemData` が、
 * 同じ判定を使う（どれかが別の判定をすると、画面が示す値と保存される値が食い違う）。
 * @param index - 画像の番号（0 が `<img>`）
 * @param mediaQuery - いまのメディアクエリー
 * @param config - `mediaQueries` を持つ設定
 * @example
 * ```ts
 * mediaQueryOrDefault(1, '', {}) // '(max-width: 767px)'
 * mediaQueryOrDefault(1, ' (min-width: 1024px) ', {}) // '(min-width: 1024px)'
 * mediaQueryOrDefault(0, '', {}) // ''
 * ```
 */
export function mediaQueryOrDefault(
	index: number,
	mediaQuery: string | null | undefined,
	config: Pick<Config, 'mediaQueries'> | undefined,
): string {
	// エージェントは任意の JSON を送る。文字列でない値は、空として扱う
	const query = typeof mediaQuery === 'string' ? mediaQuery : '';
	if (index === 0) {
		return query;
	}
	// 候補（mediaQueriesOf）と同じく前後の空白を取り除く。残ると、同じ値でも候補と
	// 一致せず「その他」扱いになる
	return query.trim() || (mediaQueriesOf(config)[0] ?? '');
}

/**
 * 画像を選んだ2枚目以降の `media` が空なら、既定値で埋める。補う必要が無ければ、
 * 同じオブジェクトを返す（`media` を持たない部分データに、`media` を足さない）。
 * エージェントが送る任意の JSON でも throw しない（`normalizeItemData` は throw しない
 * 約束）。`path` が配列でなければ、補わずにそのまま返し、`media` の要素が文字列でなければ、
 * 空として扱う。carousel はスライドごとに `{ path, media }` を渡して同じ補正をかける。
 * @param data - 保存データ（部分データでもよい）
 * @param config - `mediaQueries` を持つ設定
 * @example
 * ```ts
 * fillMediaQueries({ path: ['/pc.png', '/sp.png'], media: ['', ''] }, {});
 * // { path: [...], media: ['', '(max-width: 767px)'] }
 * ```
 */
export function fillMediaQueries<T extends Partial<ImageData>>(
	data: T,
	config: Pick<Config, 'mediaQueries'> | undefined,
): T {
	const paths: unknown[] = Array.isArray(data.path) ? data.path : [];
	const queries: unknown[] = Array.isArray(data.media) ? data.media : [];
	let media: unknown[] | undefined;
	for (const [index, src] of paths.entries()) {
		if (index === 0 || typeof src !== 'string' || !src) {
			continue;
		}
		const current = queries[index];
		const next = mediaQueryOrDefault(index, current as string | undefined, config);
		if (next !== current) {
			media ??= [...queries];
			media[index] = next;
		}
	}
	if (!media) {
		return data;
	}
	// 穴のある配列（画像2が空で画像3だけ選んだ場合）を残さない
	return {
		...data,
		media: Array.from(media, (query) => (typeof query === 'string' ? query : '')),
	};
}

/**
 * 保存データの `node` と `command` から、ポップアップかを導く。`toEditorState` と、
 * カルーセルの確定前の検査が同じ導き方を使う。
 * @param node - 保存データの、画像を包む要素
 * @param command - 保存データの `command`
 * @example
 * ```ts
 * isPopup('button', 'show-modal') // true
 * isPopup('button', null) // false
 * isPopup('a', 'show-modal') // false
 * ```
 */
export function isPopup(
	node: ImageData['node'] | undefined,
	command: ImageData['command'] | undefined,
) {
	return node === 'button' && command === 'show-modal';
}

/**
 * 画像を包む要素。ポップアップは `button`、リンク先があれば `a`、どちらも無ければ `div`。
 * `toItemData` と、エディタの必須表示、カルーセルの確定前の検査が同じ決め方を使う
 * （どれかが別の決め方をすると、画面が示す必須と、確定が拒むものが食い違う）。
 * @param popup - ポップアップで画像を開くか
 * @param href - リンク先URL
 * @example
 * ```ts
 * wrapperNodeOf(true, '') // 'button'
 * wrapperNodeOf(false, 'https://example.com/') // 'a'
 * wrapperNodeOf(false, '') // 'div'
 * ```
 */
export function wrapperNodeOf(popup: boolean, href: string): ImageData['node'] {
	return popup ? 'button' : href ? 'a' : 'div';
}

/**
 * 画像を包む要素が、代替テキスト（alt）なしでは名前を持てないか。
 *
 * リンク（`a`）とポップアップ（`button`）は、中身が画像だけのとき、その `alt` が
 * 要素の名前になる。`alt=""` は装飾的な画像を意味して支援技術に無視されるので、
 * 名前の無いリンクやボタンになる。`figcaption` は包む要素の外にあり、名前にならない。
 * https://html.spec.whatwg.org/multipage/images.html#a-link-or-button-containing-nothing-but-the-image
 * @param node - 画像を包む要素
 * @param alt - 代替テキスト
 * @example
 * ```ts
 * needsAltForName('a', '') // true
 * needsAltForName('a', '詳細ページ') // false
 * needsAltForName('div', '') // false（装飾的な画像）
 * ```
 */
export function needsAltForName(node: ImageData['node'], alt: string | undefined) {
	return node !== 'div' && !alt?.trim();
}

/**
 * imageアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const imageDefinition: ItemSeed<string, ImageData> = {
	version: __VERSION__,
	name: 'image',
	template,
	style,
	toEditorState(data) {
		const path = (data.path ?? []).map((p) => p.replace(ORIGIN, ''));
		const lazy = (data.loading ?? []).includes('lazy');
		const popup = isPopup(data.node, data.command);
		const targetBlank = data.node === 'a' && data.target === '_blank';

		// cssWidth系の値を保存データからクランプ・単位変換して正規化する
		const widthState = createWidthState();
		widthState.setScaleType(data.scaleType);
		widthState.setScale(data.scale);
		widthState.setMaxNumber(data.width?.[0] ?? 400);

		return {
			...data,
			path,
			lazy,
			popup,
			targetBlank,
			altEditable: data.alt?.[0] ?? '',
			mediaInput: data.media?.[0] ?? '',
			cssWidth: widthState.getCSSWidth(),
			cssWidthNumber: widthState.getCSSWidthNumber(),
			cssWidthUnit: widthState.getCSSWidthUnit(),
			scaleType: widthState.getScaleType(),
			scale: widthState.getScale(),
		};
	},
	// 画面の保存・ブラウザ中継・エージェントの書き込み（item_update / block_insert など）の
	// どれでも、HTML にする直前にかかる。2枚目以降の空の media を埋める（冪等）
	normalizeItemData(data, config) {
		return fillMediaQueries(data, config);
	},
	toItemData(state, config) {
		const loading: ('eager' | 'lazy')[] = [state.lazy ? 'lazy' : 'eager'];
		// 画像を選んだ2枚目以降の media が空なら既定値で埋める。空のままだと
		// どの画面幅でも2枚目が採用される（mediaQueriesOf 参照）。同じ補正は
		// normalizeItemData でも、エージェントの書き込みにかかる
		const { media } = fillMediaQueries(state, config);
		// altはimg（index 0）にしか反映されないため、常に1要素配列に正規化する。
		// state.alt[1]以降（エディタの内部状態に残り得る値）をそのまま渡すと
		// 意味のない値が配列に残る
		const alt = [state.altEditable ?? ''];
		const node = wrapperNodeOf(state.popup, state.href);
		// 失敗は EditorDialog が表示し、ダイアログは開いたままになる
		if (needsAltForName(node, state.altEditable)) {
			throw new Error(ALT_REQUIRED_MESSAGE);
		}
		const target = node === 'a' && state.targetBlank ? '_blank' : null;
		const command = node === 'button' ? 'show-modal' : null;
		const styleValue =
			state.scaleType === 'container'
				? //
					[
						//
						`--css-width: ${state.cssWidth}`,
						'--object-fit: cover',
						`--aspect-ratio: ${state.aspectRatio}`,
					].join(';')
				: //
					[
						//
						`--css-width: ${state.cssWidth}`,
					].join(';');

		return {
			...state,
			media,
			alt,
			loading,
			node,
			target,
			command,
			style: styleValue,
		};
	},
};

export default createItem<ImageData>(imageDefinition);
