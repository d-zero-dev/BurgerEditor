import type { BurgerEditorEngine } from '../engine/engine.js';

import { test, expect, beforeEach, vi, describe } from 'vitest';

import { Item } from './item.js';

// Mock BurgerEditorEngine
const createMockEngine = (
	items: Map<string, unknown> = new Map(),
): BurgerEditorEngine => {
	return {
		items,
		config: {},
		itemEditorDialog: {
			open: vi.fn(),
		},
	} as unknown as BurgerEditorEngine;
};

describe('Item', () => {
	let mockEngine: BurgerEditorEngine;

	beforeEach(() => {
		mockEngine = createMockEngine();
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
			mockEngine.items.set('text', seed);

			const item = await Item.create(mockEngine, 'text');

			expect(item.name).toBe('text');
			expect(item.version).toBe('1.0.0');
			expect(item.el.dataset.bgi).toBe('text');
			expect(item.el.dataset.bgiVer).toBe('1.0.0');
		});

		test('should create fallback item when seed not found', async () => {
			const item = await Item.create(mockEngine, 'unknown-item');

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
			mockEngine.items.set('text', seed);

			const el = document.createElement('div');
			el.dataset.bgi = 'text';
			el.dataset.bgiVer = '1.0.0';
			el.innerHTML = '<div>existing content</div>';

			const item = Item.rebind(mockEngine, el);

			expect(item.name).toBe('text');
			expect(item.version).toBe('1.0.0');
			expect(item.el).toBe(el);
		});

		test('should rebind fallback item when seed not found', () => {
			const el = document.createElement('div');
			el.dataset.bgi = 'unknown-item';
			el.dataset.bgiVer = '2.0.0';
			el.innerHTML = '<div>preserved content</div>';

			const item = Item.rebind(mockEngine, el);

			expect(item.name).toBe('unknown-item');
			expect(item.version).toBe('2.0.0');
			expect(item.el).toBe(el);
			expect(item.el.innerHTML).toBe('<div>preserved content</div>');
		});

		test('should throw error when data-bgi not found', () => {
			const el = document.createElement('div');
			// No data-bgi attribute

			expect(() => Item.rebind(mockEngine, el)).toThrow('data-bgi not found');
		});
	});
});
