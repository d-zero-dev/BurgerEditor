import type { Config } from '@burger-editor/core';

import { test, expect, describe } from 'vitest';

import googleMapsItemSeed from './index.js';

type GoogleMapsItemData = typeof googleMapsItemSeed._;

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: 'test-api-key',
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
};

const baseData = {
	lat: 33.5902,
	lng: 130.4017,
	zoom: 15,
	url: '',
	img: '',
	search: '',
} as const satisfies Readonly<GoogleMapsItemData>;

describe('googleMapsItemSeed', () => {
	describe('toItemData関数', () => {
		test('座標からApple Maps URLとStatic Maps画像URLを導出する', async () => {
			const result = await googleMapsItemSeed.toItemData?.(baseData, testConfig);

			expect(result?.url).toBe('//maps.apple.com/?q=33.5902,130.4017');
			expect(result?.img).toBe(
				'//maps.google.com/maps/api/staticmap' +
					'?center=33.5902%2C130.4017&zoom=15&scale=2&size=640x400' +
					'&markers=color%3Ared%7Ccolor%3Ared%7C33.5902%2C130.4017&key=test-api-key', // cspell:disable-line
			);
		});

		test('APIキー未設定でもkeyパラメータが空で書き出される', async () => {
			const result = await googleMapsItemSeed.toItemData?.(baseData, {
				...testConfig,
				googleMapsApiKey: null,
			});

			expect(result?.img).toContain('&key=');
			expect(result?.img.endsWith('&key=')).toBe(true);
		});

		test('lat/lng/zoom/searchは変換後も維持される', async () => {
			const result = await googleMapsItemSeed.toItemData?.(
				{ ...baseData, search: '福岡市', zoom: 8 },
				testConfig,
			);

			expect(result?.lat).toBe(33.5902);
			expect(result?.lng).toBe(130.4017);
			expect(result?.zoom).toBe(8);
			expect(result?.search).toBe('福岡市');
		});
	});
});
