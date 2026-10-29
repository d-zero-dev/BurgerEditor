import type * as ImagePopupModule from './image-popup.js';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = location.origin;

let imagePopup: typeof ImagePopupModule.imagePopup;

// jsdom は <dialog> の showModal / close を実装していないので、open 属性の付け外しと
// close イベントだけを補う。開いているときの showModal は本物と同じく例外にする
const showModal = vi.fn(function (this: HTMLDialogElement) {
	if (this.open) {
		throw new DOMException('The dialog is already open.', 'InvalidStateError');
	}
	this.setAttribute('open', '');
});
const close = vi.fn(function (this: HTMLDialogElement) {
	if (!this.open) {
		return;
	}
	this.removeAttribute('open');
	this.dispatchEvent(new Event('close'));
});

beforeEach(async () => {
	const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
	Object.defineProperty(proto, 'showModal', { value: showModal, configurable: true });
	Object.defineProperty(proto, 'close', { value: close, configurable: true });
	// ダイアログは文書ごとに使い回すので、テストごとにモジュールを読み直して独立させる
	vi.resetModules();
	const imagePopupModule = await import('./image-popup.js');
	imagePopup = imagePopupModule.imagePopup;
});

afterEach(() => {
	const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
	delete proto.showModal;
	delete proto.close;
	showModal.mockClear();
	close.mockClear();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

/**
 * ポップアップ画像 1 枚分の保存 HTML
 * @param id
 * @param href
 * @param extra
 * @param alt
 */
function popupHTML(id: string, href: string, extra = '', alt = '') {
	return `<div data-bge-popup="1"><a id="${id}" class="bgt-image__link" href="${href}" ${extra}><figure><div class="bgt-box__image-container"><img src="${href}" alt="${alt}" /></div></figure></a></div>`;
}

/**
 * HTML を置いてバインドする
 * @param html
 */
function setup(html: string) {
	document.body.innerHTML = html;
	imagePopup(document);
}

/**
 * 生成されたダイアログ
 */
function dialog() {
	return document.querySelector<HTMLDialogElement>('dialog.bgt-popup');
}

/**
 * ダイアログの中の要素
 * @param selector
 */
function q<T extends Element = HTMLElement>(selector: string) {
	return dialog()?.querySelector<T>(selector) ?? null;
}

/**
 * 拡大画像
 */
function photo() {
	return q<HTMLImageElement>('.bgt-popup__photo');
}

/**
 * 枠
 */
function loaded() {
	return q('.bgt-popup__loaded');
}

/**
 * 要素の文字列
 * @param selector
 */
function text(selector: string) {
	return q(selector)?.textContent ?? null;
}

/**
 * 要素の hidden
 * @param selector
 */
function hidden(selector: string) {
	return q(selector)?.hidden ?? null;
}

/**
 * id の要素をクリックする
 * @param id
 */
function click(id: string) {
	document.querySelector<HTMLElement>(`#${id}`)?.click();
}

/**
 * キーを押す
 * @param target
 * @param key
 */
function key(target: Element | null, key: string) {
	target?.dispatchEvent(
		new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
	);
}

/**
 * 上限の計測用要素の矩形を固定する（jsdom はレイアウトを計算しない）
 * @param width
 * @param height
 */
function limit(width: number, height: number) {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: Element,
	) {
		const hit = this.classList.contains('bgt-popup__measure');
		const w = hit ? width : 0;
		const h = hit ? height : 0;
		return {
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: w,
			bottom: h,
			width: w,
			height: h,
			toJSON() {},
		};
	});
}

/**
 * 読み込んだ画像の自然サイズを与えて load を起こす
 * @param width
 * @param height
 */
function loadPhoto(width: number, height: number) {
	const img = photo()!;
	Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
	Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
	img.dispatchEvent(new Event('load'));
}

const GROUP =
	popupHTML('a', '/a.png', 'title="Title A"', 'alt A') +
	popupHTML('b', '/b.png') +
	popupHTML('c', '/c.png', 'title="Title C"');

describe('image popup: opening', () => {
	it('opens a modal dialog with the image, alt, title and counter on click', () => {
		setup(GROUP);
		click('a');
		expect(dialog()?.open).toBe(true);
		expect(photo()?.getAttribute('src')).toBe(`${ORIGIN}/a.png`);
		expect(photo()?.alt).toBe('alt A');
		expect(text('.bgt-popup__title')).toBe('Title A');
		expect(hidden('.bgt-popup__title')).toBe(false);
		expect(text('.bgt-popup__current')).toBe('1 / 3');
	});

	it('opens with Enter and Space on the focused link', () => {
		setup(GROUP);
		key(document.querySelector('#b'), 'Enter');
		expect(dialog()?.open).toBe(true);
		expect(text('.bgt-popup__current')).toBe('2 / 3');
		dialog()?.close();
		key(document.querySelector('#c'), ' ');
		expect(dialog()?.open).toBe(true);
		expect(text('.bgt-popup__current')).toBe('3 / 3');
	});

	it('hides the title when the link has none', () => {
		setup(GROUP);
		click('b');
		expect(hidden('.bgt-popup__title')).toBe(true);
	});

	it('shows an image even when the href has no image extension', () => {
		setup(popupHTML('x', '/images/123'));
		click('x');
		expect(photo()?.getAttribute('src')).toBe(`${ORIGIN}/images/123`);
	});

	it('creates a single dialog in body even when bound twice', () => {
		setup(GROUP);
		imagePopup(document);
		click('a');
		expect(document.querySelectorAll('dialog.bgt-popup')).toHaveLength(1);
		expect(showModal).toHaveBeenCalledTimes(1);
		expect(dialog()?.parentElement).toBe(document.body);
	});

	it('opens once per Enter even when bound twice', () => {
		setup(GROUP);
		imagePopup(document);
		key(document.querySelector('#a'), 'Enter');
		expect(showModal).toHaveBeenCalledTimes(1);
	});

	it('re-attaches the dialog to body when the page removed it', () => {
		setup(GROUP);
		click('a');
		dialog()?.close();
		dialog()?.remove();
		expect(dialog()).toBeNull();
		click('b');
		expect(dialog()?.parentElement).toBe(document.body);
		expect(dialog()?.open).toBe(true);
	});

	it('does nothing (and does not throw) where showModal is not available', () => {
		const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
		delete proto.showModal;
		setup(GROUP);
		expect(() => click('a')).not.toThrow();
		expect(dialog()?.open).toBe(false);
		expect(document.querySelector('#a')?.hasAttribute('href')).toBe(false);
	});
});

describe('image popup: group', () => {
	it('collects every bound link in the document in DOM order, across roots', () => {
		document.body.innerHTML = `<div id="r1">${popupHTML('a', '/a.png')}</div><div id="r2">${popupHTML('b', '/b.png')}${popupHTML('c', '/c.png')}</div>`;
		imagePopup(document.querySelector<HTMLElement>('#r2')!);
		imagePopup(document.querySelector<HTMLElement>('#r1')!);
		click('b');
		expect(text('.bgt-popup__current')).toBe('2 / 3');
	});

	it('moves with next / previous and loops at both ends', () => {
		setup(GROUP);
		click('a');
		q('.bgt-popup__next')?.click();
		expect(photo()?.getAttribute('src')).toBe(`${ORIGIN}/b.png`);
		expect(text('.bgt-popup__current')).toBe('2 / 3');
		q('.bgt-popup__next')?.click();
		q('.bgt-popup__next')?.click();
		expect(photo()?.getAttribute('src')).toBe(`${ORIGIN}/a.png`);
		expect(text('.bgt-popup__current')).toBe('1 / 3');
		q('.bgt-popup__prev')?.click();
		expect(photo()?.getAttribute('src')).toBe(`${ORIGIN}/c.png`);
		expect(text('.bgt-popup__current')).toBe('3 / 3');
	});

	it('moves with the arrow keys', () => {
		setup(GROUP);
		click('a');
		key(dialog(), 'ArrowRight');
		expect(text('.bgt-popup__current')).toBe('2 / 3');
		key(dialog(), 'ArrowLeft');
		key(dialog(), 'ArrowLeft');
		expect(text('.bgt-popup__current')).toBe('3 / 3');
	});

	it('advances on image click when the group has more than one image', () => {
		setup(GROUP);
		click('a');
		photo()?.click();
		expect(text('.bgt-popup__current')).toBe('2 / 3');
	});

	it('updates the title per image', () => {
		setup(GROUP);
		click('a');
		q('.bgt-popup__next')?.click();
		expect(hidden('.bgt-popup__title')).toBe(true);
		q('.bgt-popup__next')?.click();
		expect(text('.bgt-popup__title')).toBe('Title C');
		expect(hidden('.bgt-popup__title')).toBe(false);
	});

	it('preloads the previous and next images', () => {
		const created: string[] = [];
		vi.stubGlobal(
			'Image',
			class {
				set src(value: string) {
					created.push(value);
				}
			},
		);
		setup(GROUP);
		click('a');
		expect(created).toEqual([`${ORIGIN}/b.png`, `${ORIGIN}/c.png`]);
	});

	it('hides navigation and counter, and ignores image clicks and arrow keys, for a single image', () => {
		setup(popupHTML('solo', '/solo.png'));
		click('solo');
		expect(hidden('.bgt-popup__prev')).toBe(true);
		expect(hidden('.bgt-popup__next')).toBe(true);
		expect(hidden('.bgt-popup__current')).toBe(true);
		expect(text('.bgt-popup__current')).toBe('');
		photo()?.click();
		key(dialog(), 'ArrowRight');
		expect(dialog()?.open).toBe(true);
		expect(photo()?.getAttribute('src')).toBe(`${ORIGIN}/solo.png`);
	});
});

describe('image popup: closing', () => {
	it('closes with the close button and returns focus to the opener when nothing moved', () => {
		setup(GROUP);
		const a = document.querySelector<HTMLElement>('#a')!;
		a.focus();
		click('a');
		q('.bgt-popup__close')?.click();
		expect(dialog()?.open).toBe(false);
		expect(document.activeElement).toBe(a);
	});

	it('returns focus to the link of the image shown last, not the opener', () => {
		setup(GROUP);
		const a = document.querySelector<HTMLElement>('#a')!;
		a.focus();
		click('a');
		q('.bgt-popup__next')?.click();
		q('.bgt-popup__next')?.click();
		q('.bgt-popup__close')?.click();
		expect(document.activeElement).toBe(document.querySelector('#c'));
	});

	it('closes with Escape', () => {
		setup(GROUP);
		click('a');
		key(dialog(), 'Escape');
		expect(dialog()?.open).toBe(false);
	});

	it('closes on a click outside the box (backdrop)', () => {
		setup(GROUP);
		click('a');
		dialog()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(dialog()?.open).toBe(false);
	});

	it('does not close on a click inside the box', () => {
		setup(GROUP);
		click('a');
		q('.bgt-popup__box')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(dialog()?.open).toBe(true);
	});
});

describe('image popup: loading state', () => {
	it('marks the dialog as loading until the image loads', () => {
		setup(GROUP);
		click('a');
		expect(dialog()?.classList.contains('bgt-popup--loading')).toBe(true);
		photo()?.dispatchEvent(new Event('load'));
		expect(dialog()?.classList.contains('bgt-popup--loading')).toBe(false);
	});

	it('shows the colorbox error text when the image fails to load', () => {
		setup(GROUP);
		click('a');
		photo()?.dispatchEvent(new Event('error'));
		expect(text('.bgt-popup__error')).toBe('This image failed to load.');
		expect(hidden('.bgt-popup__error')).toBe(false);
		q('.bgt-popup__next')?.click();
		expect(hidden('.bgt-popup__error')).toBe(true);
	});
});

describe('image popup: sizing (limit 1216x760)', () => {
	it('opens the frame at the initial size 600x450 before the image loads', () => {
		limit(1216, 760);
		setup(GROUP);
		click('a');
		expect(loaded()?.style.width).toBe('600px');
		expect(loaded()?.style.height).toBe('450px');
	});

	it('clamps the initial size to the limit', () => {
		limit(500, 400);
		setup(GROUP);
		click('a');
		expect(loaded()?.style.width).toBe('500px');
		expect(loaded()?.style.height).toBe('400px');
	});

	it('shrinks a landscape image to the width limit, rounding the height down', () => {
		limit(1216, 760);
		setup(GROUP);
		click('a');
		loadPhoto(2000, 1001);
		expect(photo()?.width).toBe(1216);
		expect(photo()?.height).toBe(608);
		expect(loaded()?.style.width).toBe('1216px');
		expect(loaded()?.style.height).toBe('608px');
	});

	it('shrinks a portrait image to the height limit', () => {
		limit(1216, 760);
		setup(GROUP);
		click('a');
		loadPhoto(1000, 3000);
		expect(photo()?.width).toBe(253);
		expect(photo()?.height).toBe(760);
		expect(loaded()?.style.width).toBe('253px');
		expect(loaded()?.style.height).toBe('760px');
	});

	it('keeps a small image at its natural size', () => {
		limit(1216, 760);
		setup(GROUP);
		click('a');
		loadPhoto(200, 150);
		expect(photo()?.width).toBe(200);
		expect(photo()?.height).toBe(150);
		expect(loaded()?.style.width).toBe('200px');
		expect(loaded()?.style.height).toBe('150px');
	});

	it('clears the frame size on close so the next open starts from the initial size', () => {
		limit(1216, 760);
		setup(GROUP);
		click('a');
		loadPhoto(2000, 1000);
		dialog()?.close();
		expect(loaded()?.style.width).toBe('');
		expect(loaded()?.style.height).toBe('');
	});
});
