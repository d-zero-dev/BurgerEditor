import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gallery } from './gallery.js';

interface GalleryAttrs {
	effect?: string;
	delay?: string;
	duration?: string;
	autoplay?: string;
	ctrl?: string;
	marker?: string;
}

const IMG = (n: number) => `https://example.com/images/g${n}.svg`;

/**
 * ギャラリーの保存 HTML を作って body に置く
 * @param attrs
 * @param count
 */
function createGallery(attrs: GalleryAttrs = {}, count = 3): HTMLElement {
	const a = {
		effect: 'fade',
		delay: '1000',
		duration: '300',
		autoplay: 'false',
		ctrl: 'true',
		marker: 'thumbs',
		...attrs,
	};
	const el = document.createElement('div');
	el.dataset.bgt = 'gallery';
	el.className = 'bgt-container bgt-gallery-container';
	const items = Array.from({ length: count }, (_, i) => {
		return `<figure class="bgt-gallery__item"><div class="bgt-gallery__img"><img src="${IMG(i + 1)}" alt="" /></div><figcaption class="bgt-gallery__caption">Caption ${i + 1}</figcaption></figure>`;
	}).join('');
	el.innerHTML = `<div class="bgt-gallery" data-gallery-effect="${a.effect}" data-gallery-delay="${a.delay}" data-gallery-duration="${a.duration}" data-gallery-autoplay="${a.autoplay}" data-gallery-ctrl="${a.ctrl}" data-gallery-marker="${a.marker}"><div class="bgt-gallery__group" data-bge-list>${items}</div></div>`;
	document.body.append(el);
	return el;
}

/**
 * 初期化し、画像の読み込みイベントを起こして最初のティックを進める
 * @param el
 * @param imageEvent
 */
async function init(el: HTMLElement, imageEvent = 'load') {
	gallery.call(el, 0, el);
	for (const img of el.querySelectorAll('img')) {
		img.dispatchEvent(new Event(imageEvent));
	}
	await vi.advanceTimersByTimeAsync(0);
}

/**
 * 複製を含むすべてのパネル
 * @param el
 */
function panels(el: HTMLElement) {
	return [...el.querySelectorAll<HTMLElement>('.bgt-gallery__item')];
}

/**
 * マーカーの li
 * @param el
 */
function markers(el: HTMLElement) {
	return [...el.querySelectorAll<HTMLElement>('.bgt-gallery-marker > li')];
}

/**
 * current が付いたパネルの位置
 * @param el
 */
function currentPanelIndexes(el: HTMLElement) {
	return panels(el).flatMap((p, i) => (p.classList.contains('current') ? [i] : []));
}

/**
 * current が付いたマーカーの位置
 * @param el
 */
function currentMarkerIndex(el: HTMLElement) {
	return markers(el).findIndex((li) => li.classList.contains('current'));
}

/**
 * コントローラ
 * @param el
 */
function ctrl(el: HTMLElement) {
	return el.querySelector<HTMLElement>('.bgt-gallery-ctrl');
}

/**
 * ステージ要素
 * @param el
 */
function stage(el: HTMLElement) {
	return el.querySelector<HTMLElement>('.bgt-gallery')!;
}

/**
 * パネルの入れ物
 * @param el
 */
function container(el: HTMLElement) {
	return el.querySelector<HTMLElement>('.bgt-gallery__group')!;
}

/**
 * 「次へ」を押す
 * @param el
 */
function next(el: HTMLElement) {
	el.querySelector<HTMLElement>('.bgt-gallery-ctrl__next')?.click();
}

/**
 * 「前へ」を押す
 * @param el
 */
function prev(el: HTMLElement) {
	el.querySelector<HTMLElement>('.bgt-gallery-ctrl__prev')?.click();
}

/**
 * jsdom はレイアウトを計算しないので、ステージとパネルの矩形を固定する
 * @param width ステージとパネルの幅（関数なら呼ぶたびに評価する）
 */
function layout(width: number | (() => number)) {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: Element,
	) {
		const w =
			this.classList.contains('bgt-gallery') ||
			this.classList.contains('bgt-gallery__item')
				? typeof width === 'function'
					? width()
					: width
				: 0;
		return {
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: w,
			bottom: 0,
			width: w,
			height: 0,
			toJSON() {},
		};
	});
}

/**
 * Touch / TouchEvent の無い jsdom で、ランタイムが読む pageX だけを持つタッチイベントを送る
 * @param el
 * @param type
 * @param pageX
 */
function touch(
	el: Element,
	type: 'touchstart' | 'touchmove' | 'touchend',
	pageX: number,
) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'touches', {
		value: type === 'touchend' ? [] : [{ pageX }],
	});
	Object.defineProperty(event, 'changedTouches', { value: [{ pageX }] });
	el.dispatchEvent(event);
}

beforeEach(() => {
	vi.useFakeTimers({
		toFake: [
			'setTimeout',
			'clearTimeout',
			'setInterval',
			'clearInterval',
			'setImmediate',
			'clearImmediate',
			'requestAnimationFrame',
			'cancelAnimationFrame',
			'Date',
			'performance',
		],
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
	document.body.innerHTML = '';
});

describe('gallery: generated DOM', () => {
	it('appends ul.bgt-gallery-marker after .bgt-gallery with one li per panel', async () => {
		const el = createGallery();
		await init(el);
		const marker = el.querySelector('.bgt-gallery + ul.bgt-gallery-marker');
		expect(marker).not.toBeNull();
		expect(markers(el)).toHaveLength(3);
	});

	it('paints each marker li with the background-image of its panel image', async () => {
		const el = createGallery();
		await init(el);
		expect(markers(el).map((li) => li.style.backgroundImage)).toEqual([
			`url("${IMG(1)}")`,
			`url("${IMG(2)}")`,
			`url("${IMG(3)}")`,
		]);
	});

	it('still generates the marker when data-gallery-marker is "none" (CSS hides it)', async () => {
		const el = createGallery({ marker: 'none' });
		await init(el);
		expect(markers(el)).toHaveLength(3);
	});

	it('marks the first panel and the first marker as current after init', async () => {
		const el = createGallery();
		await init(el);
		expect(currentPanelIndexes(el)).toEqual([0]);
		expect(currentMarkerIndex(el)).toBe(0);
	});

	it('appends .bgt-gallery-ctrl with prev/next buttons inside .bgt-gallery when ctrl is "true"', async () => {
		const el = createGallery();
		await init(el);
		const c = ctrl(el);
		expect(c?.parentElement?.classList.contains('bgt-gallery')).toBe(true);
		expect(c?.querySelector('button.bgt-gallery-ctrl__prev > span')?.textContent).toBe(
			'Prev',
		);
		expect(c?.querySelector('button.bgt-gallery-ctrl__next > span')?.textContent).toBe(
			'Next',
		);
	});

	it('does not generate .bgt-gallery-ctrl when ctrl is "false"', async () => {
		const el = createGallery({ ctrl: 'false' });
		await init(el);
		expect(ctrl(el)).toBeNull();
	});

	it('flags the first position with bgt-gallery-ctrl__state-is-first even in loop mode', async () => {
		const el = createGallery();
		await init(el);
		expect(ctrl(el)?.classList.contains('bgt-gallery-ctrl__state-is-first')).toBe(true);
		expect(ctrl(el)?.classList.contains('bgt-gallery-ctrl__state-is-last')).toBe(false);
		expect(ctrl(el)?.classList.contains('bgt-gallery-ctrl__state-is-ignore')).toBe(false);
	});

	it('initializes even when an image fails to load', async () => {
		const el = createGallery();
		await init(el, 'error');
		expect(markers(el)).toHaveLength(3);
		expect(currentPanelIndexes(el)).toEqual([0]);
	});

	it('does not initialize the same gallery twice', async () => {
		const el = createGallery();
		await init(el);
		await init(el);
		expect(el.querySelectorAll('.bgt-gallery-marker')).toHaveLength(1);
		expect(el.querySelectorAll('.bgt-gallery-ctrl')).toHaveLength(1);
	});
});

describe('gallery: navigation', () => {
	it('moves to the next panel only after the transition duration', async () => {
		const el = createGallery();
		await init(el);
		next(el);
		await vi.advanceTimersByTimeAsync(250);
		// 遷移中はパネルの current が外れ、マーカーは遷移終了まで前の位置を示す
		expect(currentPanelIndexes(el)).toEqual([]);
		expect(currentMarkerIndex(el)).toBe(0);
		await vi.advanceTimersByTimeAsync(100);
		expect(currentPanelIndexes(el)).toEqual([1]);
		expect(currentMarkerIndex(el)).toBe(1);
		expect(ctrl(el)?.classList.contains('bgt-gallery-ctrl__state-is-first')).toBe(false);
		expect(ctrl(el)?.classList.contains('bgt-gallery-ctrl__state-is-last')).toBe(false);
	});

	it('ignores clicks while a transition is running', async () => {
		const el = createGallery();
		await init(el);
		next(el);
		await vi.advanceTimersByTimeAsync(100);
		next(el);
		await vi.advanceTimersByTimeAsync(600);
		expect(currentPanelIndexes(el)).toEqual([1]);
	});

	it('flags the last position and loops from last to first with next', async () => {
		const el = createGallery();
		await init(el);
		next(el);
		await vi.advanceTimersByTimeAsync(400);
		next(el);
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([2]);
		expect(ctrl(el)?.classList.contains('bgt-gallery-ctrl__state-is-last')).toBe(true);
		next(el);
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([0]);
		expect(currentMarkerIndex(el)).toBe(0);
		expect(ctrl(el)?.classList.contains('bgt-gallery-ctrl__state-is-first')).toBe(true);
	});

	it('loops from first to last with prev', async () => {
		const el = createGallery();
		await init(el);
		prev(el);
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([2]);
		expect(currentMarkerIndex(el)).toBe(2);
	});

	it('jumps to the clicked marker', async () => {
		const el = createGallery();
		await init(el);
		markers(el)[2]?.click();
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([2]);
		expect(currentMarkerIndex(el)).toBe(2);
	});
});

describe('gallery: autoplay', () => {
	it('does not advance when autoplay is "false"', async () => {
		const el = createGallery({ autoplay: 'false' });
		await init(el);
		await vi.advanceTimersByTimeAsync(5000);
		expect(currentPanelIndexes(el)).toEqual([0]);
	});

	it('advances every delay + duration (the delay restarts after each transition ends)', async () => {
		const el = createGallery({ autoplay: 'true', delay: '1000', duration: '300' });
		await init(el);
		await vi.advanceTimersByTimeAsync(999);
		expect(currentPanelIndexes(el)).toEqual([0]);
		expect(currentMarkerIndex(el)).toBe(0);
		// delay 経過で遷移が始まる（パネルの current が外れる）
		await vi.advanceTimersByTimeAsync(1);
		expect(currentPanelIndexes(el)).toEqual([]);
		// duration 経過で遷移が終わる
		await vi.advanceTimersByTimeAsync(350);
		expect(currentPanelIndexes(el)).toEqual([1]);
		expect(currentMarkerIndex(el)).toBe(1);
		// 次の delay は遷移終了後に数え直す
		await vi.advanceTimersByTimeAsync(900);
		expect(currentPanelIndexes(el)).toEqual([1]);
		await vi.advanceTimersByTimeAsync(450);
		expect(currentPanelIndexes(el)).toEqual([2]);
		await vi.advanceTimersByTimeAsync(1350);
		expect(currentPanelIndexes(el)).toEqual([0]);
	});

	it('keeps playing after a manual navigation', async () => {
		const el = createGallery({ autoplay: 'true', delay: '1000', duration: '300' });
		await init(el);
		next(el);
		await vi.advanceTimersByTimeAsync(350);
		expect(currentPanelIndexes(el)).toEqual([1]);
		await vi.advanceTimersByTimeAsync(1400);
		expect(currentPanelIndexes(el)).toEqual([2]);
	});
});

describe('gallery: fade effect styles', () => {
	it('shows only the current panel (opacity 1, z-index 10) and hides the others (opacity 0, z-index 0)', async () => {
		const el = createGallery({ effect: 'fade' });
		await init(el);
		expect(panels(el).map((p) => p.style.opacity)).toEqual(['1', '0', '0']);
		expect(panels(el).map((p) => p.style.zIndex)).toEqual(['10', '0', '0']);
		next(el);
		await vi.advanceTimersByTimeAsync(400);
		expect(panels(el).map((p) => p.style.opacity)).toEqual(['0', '1', '0']);
		expect(panels(el).map((p) => p.style.zIndex)).toEqual(['0', '10', '0']);
	});
});

describe('gallery: slide effect', () => {
	it('initializes without error and navigates', async () => {
		const el = createGallery({ effect: 'slide' });
		await init(el);
		expect(currentPanelIndexes(el)).toEqual([0]);
		next(el);
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([1]);
		expect(currentMarkerIndex(el)).toBe(1);
	});
});

describe('gallery: slide layout (stage 600px, panels 600px)', () => {
	it('clones the panels before and after, sizes the container and shows the first panel', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		// 原本 3 枚 + 前後に 2 組ずつの複製
		expect(panels(el)).toHaveLength(15);
		expect(panels(el).map((p) => p.style.width)).toEqual(
			Array.from({ length: 15 }, () => '600px'),
		);
		expect(container(el).style.width).toBe('9000px');
		expect(container(el).style.left).toBe('-3600px');
		expect(currentPanelIndexes(el)).toEqual([6]);
		// 複製に current は付かない
		expect(panels(el)[0]?.classList.contains('current')).toBe(false);
	});

	it('slides by one panel width', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		next(el);
		await vi.advanceTimersByTimeAsync(150);
		const mid = Number.parseFloat(container(el).style.left);
		expect(mid).toBeLessThan(-3600);
		expect(mid).toBeGreaterThan(-4200);
		await vi.advanceTimersByTimeAsync(250);
		expect(container(el).style.left).toBe('-4200px');
		expect(currentPanelIndexes(el)).toEqual([7]);
	});

	it('moves on from the last panel into the clones and snaps back to the first panel', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		for (let i = 0; i < 3; i++) {
			next(el);
			await vi.advanceTimersByTimeAsync(400);
		}
		expect(currentPanelIndexes(el)).toEqual([6]);
		expect(container(el).style.left).toBe('-3600px');
	});

	it('follows the finger while dragging', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		touch(stage(el), 'touchstart', 500);
		await vi.advanceTimersByTimeAsync(50);
		touch(stage(el), 'touchmove', 450);
		await vi.advanceTimersByTimeAsync(20);
		expect(container(el).style.left).toBe('-3650px');
	});

	it('snaps back when dragged less than a quarter of the panel', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		touch(stage(el), 'touchstart', 500);
		await vi.advanceTimersByTimeAsync(300);
		touch(stage(el), 'touchmove', 400);
		await vi.advanceTimersByTimeAsync(20);
		touch(stage(el), 'touchend', 400);
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([6]);
		expect(container(el).style.left).toBe('-3600px');
	});

	it('moves to the next panel when dragged past a quarter of the panel', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		touch(stage(el), 'touchstart', 500);
		await vi.advanceTimersByTimeAsync(300);
		touch(stage(el), 'touchmove', 200);
		await vi.advanceTimersByTimeAsync(20);
		touch(stage(el), 'touchend', 200);
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([7]);
		expect(container(el).style.left).toBe('-4200px');
	});

	it('ignores other navigation while snapping after a drag', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		touch(stage(el), 'touchstart', 500);
		await vi.advanceTimersByTimeAsync(300);
		touch(stage(el), 'touchmove', 200);
		await vi.advanceTimersByTimeAsync(20);
		touch(stage(el), 'touchend', 200);
		await vi.advanceTimersByTimeAsync(50);
		next(el);
		await vi.advanceTimersByTimeAsync(600);
		expect(currentPanelIndexes(el)).toEqual([7]);
	});

	it('swipes to the next panel on a quick short drag', async () => {
		layout(600);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		touch(stage(el), 'touchstart', 500);
		await vi.advanceTimersByTimeAsync(50);
		touch(stage(el), 'touchmove', 480);
		await vi.advanceTimersByTimeAsync(20);
		touch(stage(el), 'touchend', 480);
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([7]);
		expect(container(el).style.left).toBe('-4200px');
	});

	it('measures a gallery that was initialized while hidden once it gets a width', async () => {
		let callback: (() => void) | null = null;
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(cb: () => void) {
					callback = cb;
				}
				disconnect() {}
				observe() {}
			},
		);
		let width = 0;
		layout(() => width);
		const el = createGallery({ effect: 'slide' });
		await init(el);
		expect(panels(el)).toHaveLength(3);
		expect(panels(el).map((p) => p.style.width)).toEqual(['', '', '']);
		expect(container(el).style.width).toBe('');
		width = 600;
		callback!();
		expect(panels(el)).toHaveLength(15);
		expect(container(el).style.width).toBe('9000px');
		expect(container(el).style.left).toBe('-3600px');
		expect(currentPanelIndexes(el)).toEqual([6]);
	});
});

describe('gallery: behavior that differs from Psycle by design', () => {
	it('keeps the current class when the marker of the shown panel is clicked', async () => {
		const el = createGallery();
		await init(el);
		markers(el)[0]?.click();
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([0]);
		expect(currentMarkerIndex(el)).toBe(0);
	});

	it('resumes after a resize interrupted a transition, and a later resize does not restart the delay', async () => {
		const el = createGallery({ autoplay: 'true', delay: '1000', duration: '300' });
		await init(el);
		// 遷移の途中でリサイズ → その場で完了扱いになり、リサイズ終了後に再生が戻る
		await vi.advanceTimersByTimeAsync(1100);
		window.dispatchEvent(new Event('resize'));
		expect(currentPanelIndexes(el)).toEqual([1]);
		await vi.advanceTimersByTimeAsync(300);
		// 遷移していないときのリサイズは、次の遷移の予定（約 2400ms）を遅らせない
		await vi.advanceTimersByTimeAsync(600);
		window.dispatchEvent(new Event('resize'));
		await vi.advanceTimersByTimeAsync(800);
		expect(currentPanelIndexes(el)).toEqual([2]);
	});

	it('ignores window resizes once the gallery is removed from the document', async () => {
		const el = createGallery({ autoplay: 'true', delay: '1000', duration: '300' });
		await init(el);
		el.remove();
		expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
		await vi.advanceTimersByTimeAsync(400);
		expect(currentPanelIndexes(el)).toEqual([0]);
	});

	it('treats an unknown effect as slide and keeps initializing', async () => {
		const el = createGallery({ effect: 'zoom' });
		await init(el);
		expect(container(el).style.position).toBe('absolute');
		expect(currentPanelIndexes(el)).toEqual([0]);
	});

	it('uses delay 3000 and duration 600 when the values are not numbers', async () => {
		const el = createGallery({ autoplay: 'true', delay: 'abc', duration: '' });
		await init(el);
		await vi.advanceTimersByTimeAsync(2999);
		expect(currentPanelIndexes(el)).toEqual([0]);
		await vi.advanceTimersByTimeAsync(1);
		expect(currentPanelIndexes(el)).toEqual([]);
		await vi.advanceTimersByTimeAsync(550);
		expect(currentPanelIndexes(el)).toEqual([]);
		await vi.advanceTimersByTimeAsync(100);
		expect(currentPanelIndexes(el)).toEqual([1]);
	});

	it('does not autoplay with a single panel', async () => {
		const el = createGallery({ autoplay: 'true' }, 1);
		await init(el);
		await vi.advanceTimersByTimeAsync(5000);
		expect(currentPanelIndexes(el)).toEqual([0]);
		expect(currentMarkerIndex(el)).toBe(0);
	});

	it('resumes autoplay after a tap that did not move', async () => {
		layout(600);
		const el = createGallery({
			effect: 'slide',
			autoplay: 'true',
			delay: '1000',
			duration: '300',
		});
		await init(el);
		await vi.advanceTimersByTimeAsync(500);
		touch(stage(el), 'touchstart', 500);
		await vi.advanceTimersByTimeAsync(100);
		touch(stage(el), 'touchend', 500);
		// タップで止まったままにならず、delay 後に次へ進む
		await vi.advanceTimersByTimeAsync(1400);
		expect(currentPanelIndexes(el)).toEqual([7]);
	});

	it('removes its window resize listener once the gallery is removed from the document', async () => {
		const removed = vi.spyOn(window, 'removeEventListener');
		const el = createGallery();
		await init(el);
		el.remove();
		window.dispatchEvent(new Event('resize'));
		expect(removed).toHaveBeenCalledWith('resize', expect.any(Function));
	});
});
