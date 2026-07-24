import type { Config } from '@burger-editor/core';

import { test, expect, describe } from 'vitest';

import downloadFileItemSeed from './index.js';

type DownloadFileItemData = typeof downloadFileItemSeed._;

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
};

const baseData = {
	path: '/files/manual.pdf',
	download: '',
	name: 'manual.pdf',
	formatedSize: '1.2MB',
	size: '1258291',
	downloadCheck: false,
} as const satisfies Readonly<DownloadFileItemData>;

describe('downloadFileItemSeed', () => {
	describe('toEditorState関数', () => {
		test('download属性が空ならdownloadCheckはfalse', () => {
			const result = downloadFileItemSeed.toEditorState?.(baseData, testConfig);

			expect(result?.downloadCheck).toBe(false);
		});

		test('download属性があればdownloadCheckはtrue', () => {
			const result = downloadFileItemSeed.toEditorState?.(
				{ ...baseData, download: 'manual.pdf' },
				testConfig,
			);

			expect(result?.downloadCheck).toBe(true);
		});
	});

	describe('toItemData関数', () => {
		test('downloadCheckがtrueならnameをdownload属性に書き出す', async () => {
			const result = await downloadFileItemSeed.toItemData?.(
				{ ...baseData, downloadCheck: true },
				testConfig,
			);

			expect(result?.download).toBe('manual.pdf');
		});

		test('downloadCheckがfalseならdownload属性は空', async () => {
			const result = await downloadFileItemSeed.toItemData?.(
				{ ...baseData, download: 'manual.pdf', downloadCheck: false },
				testConfig,
			);

			expect(result?.download).toBe('');
		});
	});

	test('toEditorState→toItemDataのラウンドトリップでデータが保存形式に戻る', async () => {
		const stored = { ...baseData, download: 'manual.pdf' };

		const editorState = downloadFileItemSeed.toEditorState!(stored, testConfig);
		const result = await downloadFileItemSeed.toItemData!(editorState, testConfig);

		expect(result).toEqual({
			path: '/files/manual.pdf',
			download: 'manual.pdf',
			name: 'manual.pdf',
			formatedSize: '1.2MB',
			size: '1258291',
			downloadCheck: true,
		});
	});
});
