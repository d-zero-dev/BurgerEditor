import type { Config } from '@burger-editor/core';

import { test, expect, describe } from 'vitest';

import youtubeItemSeed from './index.js';

type YoutubeItemData = typeof youtubeItemSeed._;

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
};

const baseData = {
	id: 'dQw4w9WgXcQ',
	title: 'サンプル動画',
	thumb: '//img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
	url: '//www.youtube.com/embed/dQw4w9WgXcQ?rel=0&loop=1&autoplay=1&autohide=1&start=0',
} as const satisfies Readonly<YoutubeItemData>;

describe('youtubeItemSeed', () => {
	describe('toEditorState関数', () => {
		test('フォールバックタイトルは編集用に空へ戻す', () => {
			const result = youtubeItemSeed.toEditorState?.(
				{ ...baseData, title: 'YouTube動画' },
				testConfig,
			);

			expect(result?.title).toBe('');
		});

		test('ユーザーが付けたタイトルは維持する', () => {
			const result = youtubeItemSeed.toEditorState?.(baseData, testConfig);

			expect(result?.title).toBe('サンプル動画');
		});
	});

	describe('toItemData関数', () => {
		test('動画URLからIDを抽出しurl/thumbを導出する', async () => {
			const result = await youtubeItemSeed.toItemData?.(
				{ ...baseData, id: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
				testConfig,
			);

			expect(result?.id).toBe('dQw4w9WgXcQ');
			expect(result?.url).toBe(
				'//www.youtube.com/embed/dQw4w9WgXcQ?rel=0&loop=1&autoplay=1&autohide=1&start=0',
			);
			expect(result?.thumb).toBe('//img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
		});

		test('タイトルが空ならフォールバックタイトルを書き出す', async () => {
			const result = await youtubeItemSeed.toItemData?.(
				{ ...baseData, title: '' },
				testConfig,
			);

			expect(result?.title).toBe('YouTube動画');
		});
	});

	test('toEditorState→toItemDataのラウンドトリップでデータが保存形式に戻る', async () => {
		const editorState = youtubeItemSeed.toEditorState!(baseData, testConfig);
		const result = await youtubeItemSeed.toItemData!(editorState, testConfig);

		expect(result).toEqual(baseData);
	});
});
