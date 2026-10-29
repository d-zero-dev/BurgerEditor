import { afterEach, describe, expect, it, vi } from 'vitest';

type GalleryCallback = (this: HTMLElement, i: number, el: HTMLElement) => void | false;

interface BgE {
	execute: (
		root: Document | HTMLElement,
		options?: { gallery?: GalleryCallback },
	) => void;
	options?: { gallery?: GalleryCallback };
	foo?: number;
}

const ORIGIN = location.origin;

/**
 * ギャラリーの保存 HTML
 * @param id
 */
function galleryHTML(id: string) {
	return `<div id="${id}" data-bgt="gallery"><div class="bgt-gallery" data-gallery-effect="fade" data-gallery-delay="1000" data-gallery-duration="300" data-gallery-autoplay="false" data-gallery-ctrl="true" data-gallery-marker="dot"><div class="bgt-gallery__group"><figure class="bgt-gallery__item"><div class="bgt-gallery__img"><img src="/1.png" alt="" /></div></figure><figure class="bgt-gallery__item"><div class="bgt-gallery__img"><img src="/2.png" alt="" /></div></figure></div></div></div>`;
}

const PAGE = `
	<div data-bgb="image1"><div data-bge-popup="1"><a class="bgt-image__link" href="/a.png"><img src="/a.png" alt="" /></a></div></div>
	<div data-bgb="wysiwyg"><a href="#" target="false">x</a></div>
	${galleryHTML('g1')}
	${galleryHTML('g2')}
	<div class="bgt-youtube" data-id="abc"></div>
	<div class="bgt-google-maps" data-lat="1" data-lng="2"></div>`;

const win = window as unknown as { BgE?: Partial<BgE> };

/**
 * モジュールは読み込み時に window.BgE を作るので、テストごとに読み直す
 * @param preset 読み込み前に置いておく window.BgE
 */
async function load(preset?: Partial<BgE>) {
	vi.resetModules();
	if (preset) {
		win.BgE = preset;
	} else {
		delete win.BgE;
	}
	await import('./bge-functions.js');
	return win.BgE as BgE;
}

/**
 * Google Maps API のスタブを置き、Map を生成した要素を集める
 */
function stubGoogleMaps() {
	const maps: HTMLElement[] = [];
	class LatLng {}
	class Map {
		constructor(el: HTMLElement) {
			maps.push(el);
		}
	}
	class AdvancedMarkerElement {}
	vi.stubGlobal('google', {
		maps: {
			LatLng,
			Map,
			MapTypeId: { HYBRID: 'hybrid', ROADMAP: 'roadmap' },
			importLibrary: () => Promise.resolve({ AdvancedMarkerElement }),
		},
	});
	return maps;
}

afterEach(() => {
	vi.unstubAllGlobals();
	delete win.BgE;
	document.body.innerHTML = '';
	document.head.innerHTML = '';
});

describe('window.BgE', () => {
	it('exposes execute() and keeps the properties already on window.BgE', async () => {
		const bge = await load({ foo: 1 });
		expect(typeof bge.execute).toBe('function');
		expect(bge.foo).toBe(1);
	});

	it('runs execute(document, window.BgE.options) on DOMContentLoaded', async () => {
		const spy = vi.fn();
		await load({ options: { gallery: spy } });
		document.body.innerHTML = galleryHTML('g1');
		window.dispatchEvent(new Event('DOMContentLoaded'));
		// 読み直した以前のモジュールのリスナーも残っているので、回数ではなく呼ばれ方を見る
		expect(spy).toHaveBeenCalled();
		expect(spy.mock.calls.at(-1)?.[1]).toBe(document.querySelector('#g1'));
	});

	it('initializes a page without jQuery on the global', async () => {
		const maps = stubGoogleMaps();
		const bge = await load();
		expect('$' in window).toBe(false);
		expect('jQuery' in window).toBe(false);
		document.body.innerHTML = PAGE;
		expect(() => bge.execute(document)).not.toThrow();
		expect(
			document.querySelector<HTMLAnchorElement>('[data-bge-popup] a')?.dataset.href,
		).toBe(`${ORIGIN}/a.png`);
		expect(document.querySelector('[target]')).toBeNull();
		expect(document.querySelectorAll('.bgt-gallery-marker')).toHaveLength(2);
		expect(document.querySelector('.bgt-youtube iframe')).not.toBeNull();
		await vi.waitFor(() =>
			expect(maps).toEqual([document.querySelector('.bgt-google-maps')]),
		);
	});

	it('calls a custom gallery callback with (this = element, index, element)', async () => {
		const bge = await load();
		document.body.innerHTML = galleryHTML('g1') + galleryHTML('g2');
		const calls: { self: HTMLElement; i: number; el: HTMLElement }[] = [];
		bge.execute(document, {
			gallery(i, el) {
				calls.push({ self: this, i, el });
			},
		});
		expect(calls.map((c) => c.i)).toEqual([0, 1]);
		expect(calls.map((c) => c.el.id)).toEqual(['g1', 'g2']);
		expect(calls.every((c) => c.self === c.el)).toBe(true);
		expect(document.querySelector('.bgt-gallery-marker')).toBeNull();
	});

	it('stops iterating galleries when the callback returns false', async () => {
		const bge = await load();
		document.body.innerHTML = galleryHTML('g1') + galleryHTML('g2');
		const seen: string[] = [];
		bge.execute(document, {
			gallery(_, el) {
				seen.push(el.id);
				return false;
			},
		});
		expect(seen).toEqual(['g1']);
	});

	it('scopes execute() to the given root', async () => {
		const bge = await load();
		document.body.innerHTML = `<div id="root">${galleryHTML('in')}</div>${galleryHTML('out')}`;
		const spy = vi.fn();
		bge.execute(document.querySelector<HTMLElement>('#root')!, { gallery: spy });
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
