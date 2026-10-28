import { describe, test, expect, vi } from 'vitest';

import { enableJQuery } from '../../../test-helper.js';

import Migrator from './Migrator.js';

enableJQuery(vi);

describe('Migrator.autoMigration', () => {
	const migratePopup = (popupValue: string) => {
		const container = document.createElement('div');
		container.innerHTML = `
			<div data-bgt="image">
				<div>
					<img src="/files/photo.jpg" data-bge="path:src">
					<input type="hidden" data-bge="popup" value="${popupValue}">
				</div>
			</div>`;
		Migrator.autoMigration(container);
		return container.querySelector<HTMLElement>('[data-bgt="image"] > div')!.dataset[
			'bgePopup'
		];
	};

	test('keeps the popup setting off for an image with a path', () => {
		expect(migratePopup('0')).toBe('0');
		expect(migratePopup('false')).toBe('0');
		expect(migratePopup('')).toBe('0');
	});

	test('keeps the popup setting on', () => {
		expect(migratePopup('1')).toBe('1');
		expect(migratePopup('true')).toBe('1');
	});
});

describe('Migrator.extractLegacyGoogleMapsData', () => {
	const createBlock = (inputs: string) => {
		const el = document.createElement('div');
		el.innerHTML = inputs;
		return el;
	};

	test('extracts coordinates, zoom and the map URL', () => {
		const el = createBlock(`
			<input class="bge-lat" value="35.681">
			<input class="bge-lng" value="139.767">
			<input class="bge-zoom" value="16">`);
		expect(Migrator.extractLegacyGoogleMapsData(el)).toStrictEqual({
			lat: 35.681,
			lng: 139.767,
			zoom: '16',
			url: '//maps.apple.com/?q=35.681,139.767',
		});
	});

	test('leaves the coordinates and URL to the type template when they are missing', () => {
		const el = createBlock('<input class="cbe-zoom" value="12">');
		expect(Migrator.extractLegacyGoogleMapsData(el)).toStrictEqual({ zoom: '12' });
	});
});

describe('Migrator.convertCbePath', () => {
	test('rewrites CbEditor paths to BurgerEditor paths', () => {
		expect(Migrator.convertCbePath('/cbeditor/img/cb-noimage.gif')).toBe(
			'/bgeditor/img/bg-noimage.gif',
		);
		expect(Migrator.convertCbePath('/files/cb-sample.png')).toBe('/files/bg-sample.png');
	});

	test('replaces only the first match of each name', () => {
		expect(Migrator.convertCbePath('/cb-sample.png/cb-sample.png')).toBe(
			'/bg-sample.png/cb-sample.png',
		);
	});

	test('keeps an unrelated path as is', () => {
		expect(Migrator.convertCbePath('/files/photo.jpg')).toBe('/files/photo.jpg');
	});

	test('returns an empty string when the source input is missing', () => {
		expect(Migrator.convertCbePath($('.not-exist').val())).toBe('');
	});

	test('uses the first value of a multiple select', () => {
		expect(Migrator.convertCbePath(['/cbeditor/a.png', '/b.png'])).toBe(
			'/bgeditor/a.png',
		);
	});

	test('returns an empty string for an empty multiple select', () => {
		expect(Migrator.convertCbePath([])).toBe('');
	});
});
