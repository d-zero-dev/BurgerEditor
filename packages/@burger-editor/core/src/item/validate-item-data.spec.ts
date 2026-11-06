import type { Config } from '../types.js';

import { describe, expect, test, vi } from 'vitest';

import { dataFromHtml } from './data-from-html.js';
import { validateItemData, validateItemHtml } from './validate-item-data.js';

vi.mock('./data-from-html.js', async (importOriginal) => {
	const actual = await importOriginal<{ dataFromHtml: typeof dataFromHtml }>();
	return { dataFromHtml: vi.fn(actual.dataFromHtml) };
});

const config: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
};

const requireLabel = {
	validateItemData: (data: Record<string, unknown>) =>
		data['label'] ? [] : ['label is empty'],
};

describe('validateItemData', () => {
	test('returns the reasons the seed gives', () => {
		expect(validateItemData(requireLabel, { label: '' }, config)).toStrictEqual([
			'label is empty',
		]);
	});

	test('returns an empty list when the seed finds no problem', () => {
		expect(validateItemData(requireLabel, { label: 'x' }, config)).toStrictEqual([]);
	});

	test.each([
		['a seed without validateItemData', {}],
		['an item that is not defined (null)', null],
		['an item that is not defined (undefined)', undefined],
	] as const)('returns an empty list for %s', (_label, seed) => {
		expect(validateItemData(seed, { label: '' }, config)).toStrictEqual([]);
	});
});

describe('validateItemHtml', () => {
	test("reads the item's data back from its HTML and validates it", () => {
		expect(
			validateItemHtml('<p data-bge="label"></p>', requireLabel, config),
		).toStrictEqual(['label is empty']);
		expect(
			validateItemHtml('<p data-bge="label">x</p>', requireLabel, config),
		).toStrictEqual([]);
	});

	test('returns an empty list without reading the HTML back when the seed has no validateItemData', () => {
		vi.mocked(dataFromHtml).mockClear();

		expect(validateItemHtml('<p data-bge="label"></p>', {}, config)).toStrictEqual([]);
		expect(validateItemHtml('<p data-bge="label"></p>', null, config)).toStrictEqual([]);
		expect(dataFromHtml).not.toHaveBeenCalled();
	});

	test('reads the HTML back exactly once when the seed has validateItemData', () => {
		vi.mocked(dataFromHtml).mockClear();

		validateItemHtml('<p data-bge="label">x</p>', requireLabel, config);

		expect(dataFromHtml).toHaveBeenCalledTimes(1);
	});
});
