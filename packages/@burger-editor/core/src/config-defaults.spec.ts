import { describe, expect, test } from 'vitest';

import { withConfigDefaults } from './config-defaults.js';

describe('withConfigDefaults', () => {
	test('省略したキーは空の値で埋める', () => {
		expect(withConfigDefaults()).toStrictEqual({
			classList: [],
			googleMapsApiKey: null,
			sampleImagePath: '',
			sampleFilePath: '',
			stylesheets: [],
		});
	});

	test('undefined のキーも、省略したものとして空の値で埋める', () => {
		expect(
			withConfigDefaults({ classList: undefined, googleMapsApiKey: undefined }),
		).toMatchObject({
			classList: [],
			googleMapsApiKey: null,
		});
	});

	test('渡したキーはそのまま使い、省略可能なキーも保つ', () => {
		expect(
			withConfigDefaults({
				sampleImagePath: '/img/sample.png',
				mediaQueries: ['(max-width: 599px)'],
			}),
		).toStrictEqual({
			classList: [],
			googleMapsApiKey: null,
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '',
			stylesheets: [],
			mediaQueries: ['(max-width: 599px)'],
		});
	});
});
