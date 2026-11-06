import type { Config } from '../types.js';

import { describe, expect, test } from 'vitest';

import { normalizeItemData } from './normalize-item-data.js';

const config: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
	mediaQueries: ['(max-width: 599px)'],
};

describe('normalizeItemData', () => {
	test("passes the data and the config to the seed's normalizeItemData and returns its result", () => {
		const data = { text: 'a' };
		const seed = {
			normalizeItemData: (input: { text?: string }, given: Config) => ({
				...input,
				text: `${input.text}:${given.mediaQueries?.[0]}`,
			}),
		};

		expect(normalizeItemData(seed, data, config)).toStrictEqual({
			text: 'a:(max-width: 599px)',
		});
		// The input is not mutated
		expect(data).toStrictEqual({ text: 'a' });
	});

	test('returns the same object when the seed returns the same object (nothing changed)', () => {
		const data = { text: 'a' };

		expect(normalizeItemData({ normalizeItemData: (input) => input }, data, config)).toBe(
			data,
		);
	});

	test('returns the data as it is for a seed without normalizeItemData', () => {
		const data = { text: 'a' };

		expect(normalizeItemData({}, data, config)).toBe(data);
	});

	test.each([null, undefined])(
		'returns the data as it is when there is no seed (%s): an item this project does not define',
		(seed) => {
			const data = { text: 'a' };

			expect(normalizeItemData(seed, data, config)).toBe(data);
		},
	);
});
