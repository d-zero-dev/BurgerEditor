/**
 * 画像タイプの「クリックでポップアップ」を `<dialog>` で表示する。
 *
 * 保存済みページは長らく jQuery プラグインの colorbox で拡大表示されてきたので、
 * 利用者から見える振る舞いは colorbox の既定値とランタイムが渡していた設定に揃える:
 *
 * - `rel` によるグループ化: ページ内のポップアップ画像すべてを 1 グループとして前後に移動し、
 *   `{current} / {total}` を表示する。グループは開いた時点で文書順に集める（`execute()` を
 *   別の root で複数回呼んでも 1 グループになる）
 * - `loop`: 末尾の次は先頭、先頭の前は末尾
 * - `arrowKey` / `escKey` / `overlayClose`: ← → で移動、Esc と背景クリックで閉じる
 * - 2 枚以上のとき表示中の画像をクリックすると次へ進む
 * - `preloading`: 前後の画像を先に読み込む
 * - `transition: 'elastic'`（300ms）: 枠を初期サイズ 600×450 から画像の大きさへ広げる。
 *   アニメーション自体は CSS（`bge_style_default.css`）が持ち、ここは枠の寸法を決めるだけ
 * - `maxWidth` / `maxHeight: '95%'`: 画面の 95% から枠の余白と線を引いた大きさに画像を収める。
 *   上限は CSS カスタムプロパティ `--bge-popup-max-inline-size` / `--bge-popup-max-block-size`
 *   （CSS の長さ。`%` は画面に対する割合）で変えられる。値の解決はブラウザに任せる
 * - タイトルはリンクの `title` 属性
 * - `returnFocus`: 閉じたら開いたリンクへフォーカスを戻す
 *
 * colorbox と違い、href の拡張子で画像かどうかを判定しない（拡大対象は画像タイプの画像パスに限られ、
 * 拡張子の無い配信 URL も画像として扱うほうが正しい）。`$.colorbox.*` API と `cbox_*` イベントは提供しない。
 * `showModal()` の無い環境では開かない。
 */

import { px, wrap } from './util.js';

// 保存済みページの世代ごとの印。`.bgt-colorbox` は v2.4.x まで、`[data-bge-popup="1"]` は
// v2.11.0 まで、`[data-bge-popup="true"]` はそれ以降の画像タイプが書く
const SELECTOR = '[data-bge-popup="true"] a, [data-bge-popup="1"] a, .bgt-colorbox';
const BOUND_ATTR = 'data-bge-popup-bound';
const LOADING_CLASS = 'bgt-popup--loading';
const INITIAL_WIDTH = 600;
const INITIAL_HEIGHT = 450;
// colorbox の `imgError` の既定文言。設定可能にはしない（colorbox でも変えずに使っていた）
const IMG_ERROR = 'This image failed to load.';

interface Popup {
	readonly dialog: HTMLDialogElement;
	readonly box: HTMLElement;
	readonly loaded: HTMLElement;
	readonly measure: HTMLElement;
	readonly photo: HTMLImageElement;
	readonly error: HTMLElement;
	readonly title: HTMLElement;
	readonly current: HTMLElement;
	readonly prev: HTMLButtonElement;
	readonly next: HTMLButtonElement;
	items: HTMLAnchorElement[];
	index: number;
	opener: HTMLElement | null;
}

const popups = new WeakMap<Document, Popup>();

/**
 * root 内のポップアップ対象リンクをバインドする。同じリンクを二度バインドしない
 * @param root 探索の起点
 */
export function imagePopup(root: ParentNode) {
	for (const el of root.querySelectorAll<HTMLAnchorElement>(SELECTOR)) {
		if (el.hasAttribute(BOUND_ATTR)) {
			continue;
		}
		el.setAttribute(BOUND_ATTR, '');

		// リンク先は data-href に退避し、要素はボタンとして振る舞わせる。href を残して
		// click を抑止する作りにはしない。colorbox のころからこの形で保存ページが動いており、
		// 「ポップアップが開く要素がリンクとして振る舞う」状態（中クリックで画像だけが
		// 開く等）を新たに作らないため
		const href = el.href;
		if (href) {
			el.dataset.href = href;
			el.removeAttribute('href');
			el.tabIndex = 0;
			el.role = 'button';
		}

		el.addEventListener('click', (e) => {
			e.preventDefault();
			open(el);
		});
		el.addEventListener('keydown', (e) => {
			switch (e.key) {
				case 'Enter':
				case ' ': {
					e.preventDefault();
					el.click();
				}
			}
		});
	}
}

/**
 * @param el 開くリンク
 */
function open(el: HTMLAnchorElement) {
	const doc = el.ownerDocument;
	const popup = getPopup(doc);
	// showModal の無い環境では開かない。代替（画像へ遷移する等）は用意しない
	if (typeof popup.dialog.showModal !== 'function') {
		return;
	}
	// グループは開いた時点の文書全体から集める（colorbox の rel と同じ）
	popup.items = [...doc.querySelectorAll<HTMLAnchorElement>(`a[${BOUND_ATTR}]`)].filter(
		(a) => a.dataset.href,
	);
	const index = popup.items.indexOf(el);
	if (index === -1) {
		return;
	}
	popup.opener = el;
	// 上限の計測はダイアログが表示されてからでないとできないので、先に開く
	popup.dialog.showModal();
	// 開くときは初期サイズから画像の大きさへ広がる（colorbox の elastic）
	const { maxWidth, maxHeight } = maxSize(popup);
	setFrameSize(
		popup,
		Math.min(INITIAL_WIDTH, maxWidth),
		Math.min(INITIAL_HEIGHT, maxHeight),
	);
	show(popup, index);
}

/**
 * @param popup
 * @param index 表示する画像の番号。範囲外は循環する
 */
function show(popup: Popup, index: number) {
	const total = popup.items.length;
	popup.index = wrap(index, total);
	const item = popup.items[popup.index];
	if (!item) {
		return;
	}
	const src = item.dataset.href ?? '';
	const multiple = total > 1;

	popup.title.textContent = item.title;
	popup.title.hidden = !item.title;
	// 1 枚のときは colorbox と同じく文字列も空にする
	popup.current.textContent = multiple ? `${popup.index + 1} / ${total}` : '';
	popup.current.hidden = !multiple;
	popup.prev.hidden = !multiple;
	popup.next.hidden = !multiple;
	popup.error.hidden = true;
	popup.dialog.classList.add(LOADING_CLASS);

	// 拡大画像の代替テキストはサムネイルのものを使う（colorbox は alt を付けなかった）
	popup.photo.alt = item.querySelector('img')?.alt ?? '';
	popup.photo.removeAttribute('width');
	popup.photo.removeAttribute('height');
	popup.photo.src = src;

	if (multiple) {
		preload(popup, popup.index + 1);
		preload(popup, popup.index - 1);
	}
}

/**
 * @param popup
 * @param index
 */
function preload(popup: Popup, index: number) {
	const src = popup.items[wrap(index, popup.items.length)]?.dataset.href;
	if (src) {
		new Image().src = src;
	}
}

/**
 * 画像の自然サイズを上限に収め、枠（`.bgt-popup__loaded`）の寸法を決める。
 * 寸法を明示するのは、CSS のトランジションで枠が広がる動きを出すため
 * @param popup
 */
function fit(popup: Popup) {
	const { naturalWidth, naturalHeight } = popup.photo;
	if (!naturalWidth || !naturalHeight) {
		return;
	}
	const { maxWidth, maxHeight } = maxSize(popup);
	let width = naturalWidth;
	let height = naturalHeight;
	// 端数は切り捨てる（colorbox が出していた寸法と同じにするため）
	if (width > maxWidth) {
		height = Math.floor((height * maxWidth) / width);
		width = maxWidth;
	}
	if (height > maxHeight) {
		width = Math.floor((width * maxHeight) / height);
		height = maxHeight;
	}
	popup.photo.width = width;
	popup.photo.height = height;
	setFrameSize(popup, width, height);
}

/**
 * @param popup
 * @param width
 * @param height
 */
function setFrameSize(popup: Popup, width: number, height: number) {
	popup.loaded.style.width = `${Math.max(width, 0)}px`;
	popup.loaded.style.height = `${Math.max(height, 0)}px`;
}

/**
 * 画像に使える最大の大きさ。colorbox と同じく、画面に対する上限から枠の余白と線の分を引く。
 * 上限はカスタムプロパティを幅と高さに持つ計測用の要素（画面に固定）の大きさとして
 * ブラウザに解決させる。ダイアログが開いているときだけ計測できる
 * @param popup
 */
function maxSize(popup: Popup) {
	const limit = popup.measure.getBoundingClientRect();
	const boxStyle = getComputedStyle(popup.box);
	const loadedStyle = getComputedStyle(popup.loaded);
	const horizontal =
		px(boxStyle.paddingLeft) +
		px(boxStyle.paddingRight) +
		px(loadedStyle.borderLeftWidth) +
		px(loadedStyle.borderRightWidth);
	const vertical =
		px(boxStyle.paddingTop) +
		px(boxStyle.paddingBottom) +
		px(loadedStyle.borderTopWidth) +
		px(loadedStyle.borderBottomWidth);
	return {
		maxWidth: Math.round(limit.width) - horizontal,
		maxHeight: Math.round(limit.height) - vertical,
	};
}

/**
 * ダイアログは文書に 1 つだけ作り、使い回す
 * @param doc
 */
function getPopup(doc: Document): Popup {
	const existing = popups.get(doc);
	if (existing) {
		// body を描き直すサイトでダイアログが外れていたら付け直す
		if (!existing.dialog.isConnected) {
			doc.body.append(existing.dialog);
		}
		return existing;
	}

	const dialog = doc.createElement('dialog');
	dialog.className = 'bgt-popup';
	dialog.setAttribute('aria-label', '拡大画像');

	const box = element(doc, 'div', 'bgt-popup__box');
	// 開いたときのフォーカスは枠に置く（colorbox と同じ。最初のボタンに飛ばさない）
	box.tabIndex = -1;
	box.autofocus = true;
	const content = element(doc, 'div', 'bgt-popup__content');
	const loaded = element(doc, 'div', 'bgt-popup__loaded');
	const photo = element(doc, 'img', 'bgt-popup__photo');
	const error = element(doc, 'p', 'bgt-popup__error');
	error.textContent = IMG_ERROR;
	error.hidden = true;
	const loading = element(doc, 'div', 'bgt-popup__loading');
	const title = element(doc, 'div', 'bgt-popup__title');
	const current = element(doc, 'div', 'bgt-popup__current');
	const prev = button(doc, 'bgt-popup__prev', '前の画像');
	const next = button(doc, 'bgt-popup__next', '次の画像');
	const close = button(doc, 'bgt-popup__close', '閉じる');
	// 上限の計測用。画面に固定し、カスタムプロパティをそのまま幅と高さにする
	const measure = element(doc, 'div', 'bgt-popup__measure');
	measure.setAttribute(
		'style',
		'position:fixed;inset-block-start:0;inset-inline-start:0;visibility:hidden;pointer-events:none;inline-size:var(--bge-popup-max-inline-size,95%);block-size:var(--bge-popup-max-block-size,95%)',
	);
	measure.setAttribute('aria-hidden', 'true');

	loaded.append(photo, error, loading);
	content.append(loaded, title, current, prev, next, close);
	box.append(content);
	dialog.append(box, measure);
	doc.body.append(dialog);

	const popup: Popup = {
		dialog,
		box,
		loaded,
		measure,
		photo,
		error,
		title,
		current,
		prev,
		next,
		items: [],
		index: 0,
		opener: null,
	};

	prev.addEventListener('click', () => show(popup, popup.index - 1));
	next.addEventListener('click', () => show(popup, popup.index + 1));
	close.addEventListener('click', () => dialog.close());
	photo.addEventListener('click', () => {
		if (popup.items.length > 1) {
			show(popup, popup.index + 1);
		}
	});
	photo.addEventListener('load', () => {
		dialog.classList.remove(LOADING_CLASS);
		fit(popup);
	});
	photo.addEventListener('error', () => {
		dialog.classList.remove(LOADING_CLASS);
		error.hidden = false;
	});
	dialog.addEventListener('keydown', (e) => {
		switch (e.key) {
			case 'ArrowLeft': {
				if (popup.items.length > 1) {
					e.preventDefault();
					show(popup, popup.index - 1);
				}
				break;
			}
			case 'ArrowRight': {
				if (popup.items.length > 1) {
					e.preventDefault();
					show(popup, popup.index + 1);
				}
				break;
			}
			case 'Escape': {
				e.preventDefault();
				dialog.close();
				break;
			}
		}
	});
	// 背景（ダイアログ自身の領域で、枠の外）のクリックで閉じる
	dialog.addEventListener('click', (e) => {
		if (e.target === dialog) {
			dialog.close();
		}
	});
	dialog.addEventListener('close', () => {
		dialog.classList.remove(LOADING_CLASS);
		popup.photo.removeAttribute('src');
		// 次に開くとき前回の大きさから縮むアニメーションにならないよう、枠の寸法を消す
		popup.loaded.style.width = '';
		popup.loaded.style.height = '';
		popup.opener?.focus();
		popup.opener = null;
	});

	popups.set(doc, popup);
	return popup;
}

/**
 * @param doc
 * @param tag
 * @param className
 */
function element<K extends keyof HTMLElementTagNameMap>(
	doc: Document,
	tag: K,
	className: string,
): HTMLElementTagNameMap[K] {
	const el = doc.createElement(tag);
	el.className = className;
	return el;
}

/**
 * @param doc
 * @param className
 * @param label 読み上げ用の文字。CSS が視覚的に隠す（colorbox は英語の固定文言だった）
 */
function button(doc: Document, className: string, label: string) {
	const el = element(doc, 'button', className);
	el.type = 'button';
	el.textContent = label;
	return el;
}
