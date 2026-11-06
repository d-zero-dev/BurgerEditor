import type { Config } from '../types.js';

import { describe, expect, test, vi } from 'vitest';

import { normalizeItemHtml } from './normalize-item-html.js';

const config: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
};

const fillLabel = {
	normalizeItemData: (data: Record<string, unknown>) =>
		data['label'] ? data : { ...data, label: 'filled' },
};

describe('normalizeItemHtml', () => {
	test("returns the item's HTML rendered again when its seed changes the data", () => {
		expect(normalizeItemHtml('<p data-bge="label"></p>', fillLabel, config)).toContain(
			'>filled</p>',
		);
	});

	test('returns null when the seed leaves the data as it is (the HTML is kept as written)', () => {
		expect(
			normalizeItemHtml(
				'<p data-bge="label" class="as-written">kept</p>',
				fillLabel,
				config,
			),
		).toBeNull();
	});

	test('returns null without reading the HTML when the seed has no normalizeItemData', () => {
		const html = { toString: vi.fn(() => '<p data-bge="label"></p>') };

		expect(normalizeItemHtml(html as unknown as string, {}, config)).toBeNull();
		expect(normalizeItemHtml('<p data-bge="label"></p>', null, config)).toBeNull();
		expect(html.toString).not.toHaveBeenCalled();
	});
});
