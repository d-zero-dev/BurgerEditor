import { describe, expect, test } from 'vitest';

import { createBlock } from './create-block.js';

describe('createBlock', () => {
	test('should create block', () => {
		const block = createBlock('title', [
			{
				titleH2: 'タイトル',
			},
		]);
		expect(block).toBe(`<div data-bgb="title" class="bgb-title">
	<div data-bgt="title-h2" data-bgt-ver="2.1.0" class="bgt-container bgt-title-h2-container"><h2 class="bge-title-h2" data-bge="title-h2">タイトル</h2></div>
</div>`);
	});

	test('should create block with multiple items', () => {
		const block = createBlock('imageText3', [
			{
				popup: false,
				empty: 0,
				hr: false,
				path: '/path/to/img/sample1.jpg',
				srcset: '',
				alt: '画像1',
				width: '',
				height: '',
				caption: '',
			},
			{
				ckeditor: 'テキスト1\n**"サンプル1"**',
			},
			{
				popup: false,
				empty: 0,
				hr: false,
				path: '/path/to/img/sample2.jpg',
				srcset: '',
				alt: '画像2',
				width: '',
				height: '',
				caption: '',
			},
			{
				ckeditor: 'テキスト2\n**"サンプル2"**',
			},
			{
				popup: false,
				empty: 0,
				hr: false,
				path: '/path/to/img/sample3.jpg',
				srcset: '',
				alt: '画像3',
				width: '',
				height: '',
				caption: '',
			},
			{
				ckeditor: 'テキスト3\n**"サンプル3"**',
			},
		]);
		expect(block).toMatchSnapshot();
	});
});
