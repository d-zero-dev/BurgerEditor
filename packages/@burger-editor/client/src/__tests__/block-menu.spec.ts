import { test, expect, beforeEach, describe, vi } from 'vitest';

import { BlockMenu } from '../../../core/src/block-menu.js';
import { ComponentObserver } from '../../../core/src/component-observer.js';

/**
 *
 */
function createMockEngine() {
	const el = document.createElement('div');
	document.body.append(el);

	return {
		el,
		isProcessed: false,
		componentObserver: new ComponentObserver(),
		clearCurrentBlock: vi.fn(),
		content: {
			blockMenu: {
				el: document.createElement('div'),
			},
		},
	} as unknown;
}

describe('BlockMenu', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should set data-bge-component to block-menu', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const create = vi.fn();

			const menu = new BlockMenu(engine, el, create);

			expect(menu.el.dataset.bgeComponent).toBe('block-menu');
		});

		test('should call create function with element', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const create = vi.fn();

			new BlockMenu(engine, el, create);

			expect(create).toHaveBeenCalledWith(el);
		});

		test('should register mousemove listener on document body', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const create = vi.fn();

			const spy = vi.spyOn(el.ownerDocument.body, 'addEventListener');

			new BlockMenu(engine, el, create);

			const mousemoveCalls = spy.mock.calls.filter(([event]) => event === 'mousemove');
			expect(mousemoveCalls.length).toBeGreaterThan(0);
			spy.mockRestore();
		});

		test('should register resize listener', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const create = vi.fn();

			const spy = vi.spyOn(globalThis, 'addEventListener');

			new BlockMenu(engine, el, create);

			const resizeCalls = spy.mock.calls.filter(([event]) => event === 'resize');
			expect(resizeCalls.length).toBeGreaterThan(0);
			spy.mockRestore();
		});
	});

	describe('hide', () => {
		test('should set hidden to true', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const menu = new BlockMenu(engine, el, vi.fn());

			menu.hide();

			expect(menu.el.hidden).toBe(true);
		});

		test('should call engine.clearCurrentBlock', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const menu = new BlockMenu(engine, el, vi.fn());

			menu.hide();

			expect(engine.clearCurrentBlock).toHaveBeenCalled();
		});
	});

	describe('mousemove behavior', () => {
		test('should hide when engine.isProcessed is true', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const menu = new BlockMenu(engine, el, vi.fn());

			engine.isProcessed = true;

			// Simulate mousemove
			document.body.dispatchEvent(
				new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 50 }),
			);

			expect(menu.el.hidden).toBe(true);
		});

		test('should hide when no block is under the mouse', async () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const menu = new BlockMenu(engine, el, vi.fn());

			// jsdom getBoundingClientRect returns zeros, so no block will match
			document.body.dispatchEvent(
				new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 100 }),
			);

			// Wait for rAF
			await new Promise((resolve) => requestAnimationFrame(resolve));

			expect(menu.el.hidden).toBe(true);
		});
	});

	describe('mouseleave behavior', () => {
		test('should hide on document body mouseleave', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const menu = new BlockMenu(engine, el, vi.fn());

			document.body.dispatchEvent(new Event('mouseleave'));

			expect(menu.el.hidden).toBe(true);
		});

		test('should hide on document mouseleave', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const menu = new BlockMenu(engine, el, vi.fn());

			document.dispatchEvent(new Event('mouseleave'));

			expect(menu.el.hidden).toBe(true);
		});
	});

	describe('MutationObserver', () => {
		test('should observe document for child list changes', () => {
			const engine = createMockEngine();
			const el = document.createElement('div');
			const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

			new BlockMenu(engine, el, vi.fn());

			expect(observeSpy).toHaveBeenCalledWith(el.ownerDocument, {
				childList: true,
				subtree: true,
			});
			observeSpy.mockRestore();
		});
	});
});
