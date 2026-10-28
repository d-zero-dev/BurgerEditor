import type * as GalleryModule from './gallery.js';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let gallery: typeof GalleryModule.gallery;

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
 *
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
 *
 * @param el
 */
async function init(el: HTMLElement) {
	gallery.call(el, 0, el);
	for (const img of el.querySelectorAll('img')) {
		img.dispatchEvent(new Event('load'));
	}
	await vi.advanceTimersByTimeAsync(0);
}

/**
 *
 * @param el
 */
function panels(el: HTMLElement) {
	return [...el.querySelectorAll<HTMLElement>('.bgt-gallery__item')];
}

/**
 *
 * @param el
 */
function markers(el: HTMLElement) {
	return [...el.querySelectorAll<HTMLElement>('.bgt-gallery-marker > li')];
}

/**
 *
 * @param el
 */
function currentPanelIndexes(el: HTMLElement) {
	return panels(el).flatMap((p, i) => (p.classList.contains('current') ? [i] : []));
}

/**
 *
 * @param el
 */
function currentMarkerIndex(el: HTMLElement) {
	return markers(el).findIndex((li) => li.classList.contains('current'));
}

/**
 *
 * @param el
 */
function ctrl(el: HTMLElement) {
	return el.querySelector<HTMLElement>('.bgt-gallery-ctrl');
}

/**
 *
 * @param el
 */
function next(el: HTMLElement) {
	el.querySelector<HTMLElement>('.bgt-gallery-ctrl__next')?.click();
}

/**
 *
 * @param el
 */
function prev(el: HTMLElement) {
	el.querySelector<HTMLElement>('.bgt-gallery-ctrl__prev')?.click();
}

beforeAll(async () => {
	// Psycle（と現行の gallery.ts）はグローバルの $ を前提にする
	const jqueryModule = await import('jquery');
	const jq = jqueryModule.default;
	vi.stubGlobal('$', jq);
	vi.stubGlobal('jQuery', jq);
	({ gallery } = await import('./gallery.js'));
});

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
	// jQuery のアニメーションは window.requestAnimationFrame / window.setTimeout を直接見る。
	// vitest の fake timers は globalThis 側を差し替えるので、window 側も同じものに揃える
	Object.assign(window, {
		requestAnimationFrame: globalThis.requestAnimationFrame,
		cancelAnimationFrame: globalThis.cancelAnimationFrame,
		setTimeout: globalThis.setTimeout,
		clearTimeout: globalThis.clearTimeout,
	});
});

afterEach(() => {
	// 遷移途中で終わったテストのアニメーションループを次のテストに持ち越さない
	const jq = (globalThis as { $?: JQueryStatic }).$;
	if (jq) {
		jq.timers.length = 0;
		jq.fx.stop();
	}
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
