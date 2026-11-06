// ブラウザ中継（エージェントの item_update / page_update の update-item をタブで適用する経路）を、
// 本物の image / carousel の定義と、エンジンの設定（/config.json から来る mediaQueries）で通す
import { applyLiveBlockOp, BurgerEditorEngine, itemImport } from '@burger-editor/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import carouselItemSeed from '../carousel/definition.js';
import imageItemSeed from '../image/definition.js';

/**
 * @param name
 * @param template
 */
function blockOf(name: string, template: string) {
	return (
		`<div data-bge-name="${name}" data-bge-container="grid:1"><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item="">` +
		`<div data-bgi="${name}" data-bgi-ver="0.0.0">${itemImport(template, {})}</div>` +
		'</div></div></div></div>'
	);
}

let engine: BurgerEditorEngine;

beforeEach(async () => {
	document.body.innerHTML = '<div id="engine-root"></div>';
	engine = await BurgerEditorEngine.new({
		root: '#engine-root',
		config: {
			classList: [],
			stylesheets: [],
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '/pdf/sample.pdf',
			googleMapsApiKey: null,
			mediaQueries: ['(max-width: 599px)'],
		},
		items: {
			image: imageItemSeed as never,
			carousel: carouselItemSeed as never,
		},
		catalog: {},
		generalCSS: '',
		initialContents:
			blockOf('image', imageItemSeed.template ?? '') +
			blockOf('carousel', carouselItemSeed.template ?? ''),
	});
});

afterEach(() => {
	engine[Symbol.dispose]();
});

describe('ブラウザ中継の update-item', () => {
	test('image の画像2の空の media は、エンジンの設定の mediaQueries の先頭で埋まる', async () => {
		const result = await applyLiveBlockOp(
			engine,
			engine.content,
			{
				op: 'update-item',
				index: 0,
				itemIndex: 0,
				data: { path: ['/img/pc.png', '/img/sp.png'], media: ['', ''] },
			},
			{ highlight: false },
		);

		expect(result.touched?.el.querySelector('source')?.getAttribute('media')).toBe(
			'(max-width: 599px)',
		);
	});

	test('carousel のスライドの画像2の空の media も、同じ設定で埋まる', async () => {
		const result = await applyLiveBlockOp(
			engine,
			engine.content,
			{
				op: 'update-item',
				index: 1,
				itemIndex: 0,
				data: { path: [['/img/pc.png', '/img/sp.png']], media: [['', '']] },
			},
			{ highlight: false },
		);

		expect(result.touched?.el.querySelector('source')?.getAttribute('media')).toBe(
			'(max-width: 599px)',
		);
	});
});
