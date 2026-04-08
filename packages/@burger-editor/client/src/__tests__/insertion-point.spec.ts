import { test, expect, beforeEach, describe, vi } from 'vitest';

import { InsertionPoint } from '../../../core/src/insertion-point.js';

/**
 *
 */
function createMockEngine() {
	const containerElement = document.createElement('div');
	document.body.append(containerElement);

	return {
		isProcessed: false,
		content: {
			containerElement,
			update: vi.fn(),
		},
		save: vi.fn(),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

/**
 *
 */
function createMockBlock() {
	const el = document.createElement('div');
	el.dataset.bgeContainer = 'block';
	el.textContent = 'block content';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { el } as any;
}

describe('InsertionPoint', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('set', () => {
		test('should set the insert target block', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const block = createMockBlock();

			// set should not throw
			ip.set(block, false);
		});

		test('should accept null as target block', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);

			ip.set(null, false);
		});
	});

	describe('insert', () => {
		test('should throw when insert target is not set', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const block = createMockBlock();

			expect(() => ip.insert(block)).toThrow('InsertionPoint is not set');
		});

		test('should return a Promise', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			const result = ip.insert(insertionBlock);

			expect(result).toBeInstanceOf(Promise);
		});

		test('should append element to container when target is null', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			void ip.insert(insertionBlock);

			expect(engine.content.containerElement.contains(ip.el)).toBe(true);
		});

		test('should set engine.isProcessed to true during insertion', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			void ip.insert(insertionBlock);

			expect(engine.isProcessed).toBe(true);
		});

		test('should call content.update during insertion', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			void ip.insert(insertionBlock);

			expect(engine.content.update).toHaveBeenCalled();
		});

		test('should resolve after transitionend and unwrap insertion element', async () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			const promise = ip.insert(insertionBlock);

			// Wait for rAF to set up the transitionend listener
			await new Promise((resolve) => requestAnimationFrame(resolve));

			// Dispatch transitionend to complete the insertion
			ip.el.dispatchEvent(new Event('transitionend'));

			const result = await promise;

			expect(result).toBe(insertionBlock);
			expect(engine.isProcessed).toBe(false);
			expect(engine.save).toHaveBeenCalled();
		});

		test('should insert before target block when toTop is true', () => {
			const engine = createMockEngine();
			const existingBlock = createMockBlock();
			engine.content.containerElement.append(existingBlock.el);

			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(existingBlock, true);
			void ip.insert(insertionBlock);

			// ip.el should be inserted before existingBlock.el
			const children = [...engine.content.containerElement.children];
			const ipIndex = children.indexOf(ip.el);
			const existingIndex = children.indexOf(existingBlock.el);
			expect(ipIndex).toBeLessThan(existingIndex);
		});

		test('should insert after target block when toTop is false', () => {
			const engine = createMockEngine();
			const existingBlock = createMockBlock();
			engine.content.containerElement.append(existingBlock.el);

			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(existingBlock, false);
			void ip.insert(insertionBlock);

			// ip.el should be after existingBlock.el
			const children = [...engine.content.containerElement.children];
			const ipIndex = children.indexOf(ip.el);
			const existingIndex = children.indexOf(existingBlock.el);
			expect(ipIndex).toBeGreaterThan(existingIndex);
		});
	});
});
