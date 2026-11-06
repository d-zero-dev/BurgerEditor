import type { Config } from '../types.js';

import { describe, expect, test } from 'vitest';

import { dataFromHtml } from './data-from-html.js';
import { importItemHtml } from './import-item-html.js';

const config: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
};

const html = '<p data-bge="title">A</p><p data-bge="note">x</p>';

describe('importItemHtml', () => {
	test('今の HTML から読んだデータに新しいデータを重ね、HTML にする', () => {
		expect(
			dataFromHtml(importItemHtml(html, { title: 'B' }, null, config)),
		).toStrictEqual({ title: 'B', note: 'x' });
	});

	test('重ねたデータを、アイテム定義の normalizeItemData に通してから HTML にする', () => {
		const seed = {
			normalizeItemData: (data: Record<string, unknown>) => ({
				...data,
				note: `${String(data['title'])}!`,
			}),
		};

		expect(
			dataFromHtml(importItemHtml(html, { title: 'B' }, seed, config)),
		).toStrictEqual({ title: 'B', note: 'B!' });
	});

	test('normalizeItemData には config が渡る', () => {
		const seen: Config[] = [];
		const seed = {
			normalizeItemData: (data: Record<string, unknown>, received: Config) => {
				seen.push(received);
				return data;
			},
		};

		importItemHtml(html, {}, seed, config);

		expect(seen).toStrictEqual([config]);
	});
});
