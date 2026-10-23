import type { ItemSeed } from '@burger-editor/core';

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
	toItemData(state) {
		const loading: ('eager' | 'lazy')[] = [state.lazy ? 'lazy' : 'eager'];
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
