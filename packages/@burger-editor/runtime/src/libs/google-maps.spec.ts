import { afterEach, describe, expect, it, vi } from 'vitest';

import { googleMaps } from './google-maps.js';

interface MapCall {
	el: HTMLElement;
	options: { center: { lat: number; lng: number }; zoom: number; mapId: string };
}

/**
 * Google Maps API のスタブを置き、Map とマーカーの生成を記録する
 */
function stubGoogleMaps() {
	const maps: MapCall[] = [];
	const markers: { position: { lat: number; lng: number }; map: unknown }[] = [];
	class LatLng {
		constructor(
			public lat: number,
			public lng: number,
		) {}
	}
	class Map {
		constructor(el: HTMLElement, options: MapCall['options']) {
			maps.push({ el, options });
		}
	}
	class AdvancedMarkerElement {
		constructor(options: { position: LatLng; map: unknown }) {
			markers.push(options);
		}
	}
	vi.stubGlobal('google', {
		maps: {
			LatLng,
			Map,
			MapTypeId: { HYBRID: 'hybrid', ROADMAP: 'roadmap' },
			importLibrary: () => Promise.resolve({ AdvancedMarkerElement }),
		},
	});
	return { maps, markers };
}

/**
 * Google Maps タイプの要素を作って body に置く
 * @param attrs
 */
function create(attrs: Record<string, string>) {
	const el = document.createElement('div');
	el.className = 'bgt-google-maps';
	for (const [name, value] of Object.entries(attrs)) {
		el.setAttribute(name, value);
	}
	document.body.append(el);
	return el;
}

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

describe('googleMaps', () => {
	it('does nothing when the Google Maps API is not loaded', async () => {
		const el = create({ 'data-lat': '1', 'data-lng': '2' });
		await expect(googleMaps(el)).resolves.toBeUndefined();
	});

	it('creates a map centered on data-lat / data-lng with data-zoom and a marker', async () => {
		const { maps, markers } = stubGoogleMaps();
		const el = create({ 'data-lat': '35.5', 'data-lng': '139.5', 'data-zoom': '10' });
		await googleMaps(el);
		expect(maps).toHaveLength(1);
		expect(maps[0]?.el).toBe(el);
		expect(maps[0]?.options.center).toMatchObject({ lat: 35.5, lng: 139.5 });
		expect(maps[0]?.options.zoom).toBe(10);
		expect(maps[0]?.options.mapId).toMatch(/^bge-map-\d+$/);
		expect(markers[0]?.position).toMatchObject({ lat: 35.5, lng: 139.5 });
	});

	it('falls back to Tokyo Station and zoom 14 when the attributes are missing or not numeric', async () => {
		const { maps } = stubGoogleMaps();
		await googleMaps(create({ 'data-lat': 'abc', 'data-zoom': '' }));
		expect(maps[0]?.options.center).toMatchObject({ lat: 35.681_382, lng: 139.766_084 });
		expect(maps[0]?.options.zoom).toBe(14);
	});

	it('treats 0 as a valid coordinate and zoom', async () => {
		const { maps } = stubGoogleMaps();
		await googleMaps(create({ 'data-lat': '0', 'data-lng': '0', 'data-zoom': '0' }));
		expect(maps[0]?.options.center).toMatchObject({ lat: 0, lng: 0 });
		expect(maps[0]?.options.zoom).toBe(0);
	});

	it('gives each map a distinct mapId', async () => {
		const { maps } = stubGoogleMaps();
		await googleMaps(create({}));
		await googleMaps(create({}));
		expect(maps[0]?.options.mapId).not.toBe(maps[1]?.options.mapId);
	});
});
