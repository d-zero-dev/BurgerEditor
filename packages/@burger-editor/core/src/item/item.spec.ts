import type { Config } from '../types.js';

import { test, expect, beforeEach, describe } from 'vitest';

import { Item } from './item.js';

const testConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
};

describe('Item', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('create', () => {
		test('should create item with existing seed', async () => {
			const seed = {
				name: 'text',
				version: '1.0.0',
				template: '<div>test</div>',
				style: '',
			};
			const seeds = new Map([['text', seed]]);

			const item = await Item.create('text', seeds, testConfig);

			expect(item.name).toBe('text');
			expect(item.version).toBe('1.0.0');
			expect(item.el.dataset.bgi).toBe('text');
			expect(item.el.dataset.bgiVer).toBe('1.0.0');
		});

		test('should create fallback item when seed not found', async () => {
			const item = await Item.create('unknown-item', new Map(), testConfig);

			expect(item.name).toBe('unknown-item');
			expect(item.version).toBe('0.0.0');
			expect(item.el.dataset.bgi).toBe('unknown-item');
			expect(item.el.dataset.bgiVer).toBeUndefined();
			expect(item.el.innerHTML).toBe('');
		});
	});

	describe('rebind', () => {
		test('should rebind item with existing seed', () => {
			const seed = {
				name: 'text',
				version: '1.0.0',
				template: '<div>test</div>',
				style: '',
			};
			const seeds = new Map([['text', seed]]);

			const el = document.createElement('div');
			el.dataset.bgi = 'text';
			el.dataset.bgiVer = '1.0.0';
			el.innerHTML = '<div>existing content</div>';

			const item = Item.rebind(el, seeds, testConfig);

			expect(item.name).toBe('text');
			expect(item.version).toBe('1.0.0');
			expect(item.el).toBe(el);
		});

		test('should rebind fallback item when seed not found', () => {
			const el = document.createElement('div');
			el.dataset.bgi = 'unknown-item';
			el.dataset.bgiVer = '2.0.0';
			el.innerHTML = '<div>preserved content</div>';

			const item = Item.rebind(el, new Map(), testConfig);

			expect(item.name).toBe('unknown-item');
			expect(item.version).toBe('2.0.0');
			expect(item.el).toBe(el);
			expect(item.el.innerHTML).toBe('<div>preserved content</div>');
		});

		test('should throw error when data-bgi not found', () => {
			const el = document.createElement('div');
			// No data-bgi attribute

			expect(() => Item.rebind(el, new Map(), testConfig)).toThrow('data-bgi not found');
		});
	});

	describe('import', () => {
		// data-bge-list付きのpicture要素を持つseed。1件目がimg、2件目以降が
		// sourceに変換される（frozen-patty側の逆順リスト規則）
		const pictureSeed = {
			name: 'responsive-image',
			version: '1.0.0',
			style: '',
			template:
				'<picture data-bge-list><img src="" alt="" width="1" height="1" loading="lazy" data-bge="path:src, :alt, :width, :height, :loading, :media"></picture>',
		};
		const pictureSeeds = new Map([['responsive-image', pictureSeed]]);

		test('picture を含む item で import() を2回連続しても img の alt と loading が保持される', () => {
			const item = Item.create('responsive-image', pictureSeeds, testConfig, {
				path: ['/img/a.png', '/img/b.png'],
				width: [400, 800],
				height: [300, 600],
				media: ['', '(min-width: 768px)'],
				alt: ['代替テキスト'],
				loading: ['lazy'],
			});

			// 2回目のimport（＝2回目の保存）。この時点でitem.el.innerHTMLは
			// 1回目のmerge結果（<source>が先頭、<img>が末尾）になっている
			item.import({ path: ['/img/a.png', '/img/c.png'] });

			const exported = item.export();
			expect(exported.alt).toStrictEqual(['代替テキスト']);
			expect(exported.loading).toStrictEqual(['lazy']);
			expect(exported.path).toStrictEqual(['/img/a.png', '/img/c.png']);

			const img = item.el.querySelector('img');
			expect(img?.getAttribute('alt')).toBe('代替テキスト');
			expect(img?.getAttribute('loading')).toBe('lazy');
			expect(item.el.querySelectorAll('source')).toHaveLength(1);
		});

		test('import() は部分データで呼んでも既存データを保持する', () => {
			const item = Item.create('responsive-image', pictureSeeds, testConfig, {
				path: ['/img/a.png', '/img/b.png'],
				width: [400, 800],
				height: [300, 600],
				media: ['', '(min-width: 768px)'],
				alt: ['代替テキスト'],
				loading: ['lazy'],
			});

			item.import({ media: ['', '(min-width: 1024px)'] });

			const exported = item.export();
			expect(exported.alt).toStrictEqual(['代替テキスト']);
			expect(exported.path).toStrictEqual(['/img/a.png', '/img/b.png']);
			expect(exported.media).toStrictEqual([null, '(min-width: 1024px)']);
		});
	});
});
