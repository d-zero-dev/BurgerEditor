import { test, expect, beforeEach, describe } from 'vitest';

import { ComponentObserver } from '../component-observer.js';
import { ItemEditorDialog } from '../item-editor-dialog.js';

import { Item } from './item.js';

/**
 *
 */
function createMockEditor() {
	return new ItemEditorDialog({
		config: {
			classList: [],
			googleMapsApiKey: null,
			sampleImagePath: '',
			sampleFilePath: '',
			stylesheets: [],
		},
		onOpened: () => {},
		getComponentObserver: () => new ComponentObserver(),
		getTemplate: () => document.createRange().createContextualFragment('').children,
		getContentStylesheet: () => Promise.resolve(''),
		onClosed: () => {},
		onOpen: () => false,
		createEditorComponent: () => {},
	});
}

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
				editor: '',
			};
			const seeds = new Map([['text', seed]]);

			const item = await Item.create('text', seeds, createMockEditor());

			expect(item.name).toBe('text');
			expect(item.version).toBe('1.0.0');
			expect(item.el.dataset.bgi).toBe('text');
			expect(item.el.dataset.bgiVer).toBe('1.0.0');
		});

		test('should create fallback item when seed not found', async () => {
			const item = await Item.create('unknown-item', new Map(), createMockEditor());

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
				editor: '',
			};
			const seeds = new Map([['text', seed]]);

			const el = document.createElement('div');
			el.dataset.bgi = 'text';
			el.dataset.bgiVer = '1.0.0';
			el.innerHTML = '<div>existing content</div>';

			const item = Item.rebind(el, seeds, createMockEditor());

			expect(item.name).toBe('text');
			expect(item.version).toBe('1.0.0');
			expect(item.el).toBe(el);
		});

		test('should rebind fallback item when seed not found', () => {
			const el = document.createElement('div');
			el.dataset.bgi = 'unknown-item';
			el.dataset.bgiVer = '2.0.0';
			el.innerHTML = '<div>preserved content</div>';

			const item = Item.rebind(el, new Map(), createMockEditor());

			expect(item.name).toBe('unknown-item');
			expect(item.version).toBe('2.0.0');
			expect(item.el).toBe(el);
			expect(item.el.innerHTML).toBe('<div>preserved content</div>');
		});

		test('should throw error when data-bgi not found', () => {
			const el = document.createElement('div');
			// No data-bgi attribute

			expect(() => Item.rebind(el, new Map(), createMockEditor())).toThrow(
				'data-bgi not found',
			);
		});
	});
});
