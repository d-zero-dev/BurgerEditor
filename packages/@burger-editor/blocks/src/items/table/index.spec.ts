import type { Config } from '@burger-editor/core';

import { test, expect, describe } from 'vitest';

import tableItemSeed from './index.js';

type TableItemData = typeof tableItemSeed._;

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
};

const baseData = {
	caption: '料金表',
	th: ['基本料金', 'オプション'],
	td: ['<p>1,000円</p>\n', '<p><strong>無料</strong></p>\n'],
	scrollable: false,
} as const satisfies Readonly<TableItemData>;

describe('tableItemSeed', () => {
	describe('toEditorState関数', () => {
		test('tdのHTMLをMarkdownに変換して編集させる', () => {
			const result = tableItemSeed.toEditorState?.(baseData, testConfig);

			expect(result?.td).toEqual(['1,000円', '**無料**']);
		});

		test('thとcaptionはそのまま維持する', () => {
			const result = tableItemSeed.toEditorState?.(baseData, testConfig);

			expect(result?.th).toEqual(['基本料金', 'オプション']);
			expect(result?.caption).toBe('料金表');
		});
	});

	describe('toItemData関数', () => {
		test('tdのMarkdownをHTMLに変換して書き出す', async () => {
			const result = await tableItemSeed.toItemData?.(
				{ ...baseData, td: ['1,000円', '**無料**'] },
				testConfig,
			);

			expect(result?.td).toEqual(['<p>1,000円</p>\n', '<p><strong>無料</strong></p>\n']);
		});
	});

	test('toEditorState→toItemDataのラウンドトリップでデータが保存形式に戻る', async () => {
		const editorState = tableItemSeed.toEditorState!(baseData, testConfig);
		const result = await tableItemSeed.toItemData!(editorState, testConfig);

		expect(result).toEqual(baseData);
	});
});
