import { test, expect, beforeEach, describe, vi } from 'vitest';

import { InsertionPoint } from './insertion-point.js';

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
		test('should set the insert target so the point lands next to the block', () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const block = createMockBlock();
			engine.content.containerElement.append(block.el);

			ip.set(block, false);
			void ip.insert(createMockBlock());

			expect(block.el.nextElementSibling).toBe(ip.el);
		});

		test('should accept null as target block and append at the end', () => {
			const engine = createMockEngine();
			const existingBlock = createMockBlock();
			engine.content.containerElement.append(existingBlock.el);
			const ip = new InsertionPoint(engine);

			ip.set(null, false);
			void ip.insert(createMockBlock());

			expect(engine.content.containerElement.lastElementChild).toBe(ip.el);
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

		test('should resolve after the insertion animation completes and unwrap insertion element', async () => {
			const engine = createMockEngine();
			// A short duration keeps this test fast; the point under test is
			// that a non-zero-duration animation still resolves and unwraps,
			// not the exact timing.
			const ip = new InsertionPoint(engine, 10);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			const result = await ip.insert(insertionBlock);

			expect(result).toBe(insertionBlock);
			expect(engine.isProcessed).toBe(false);
			expect(engine.save).toHaveBeenCalled();
		});

		test('should resolve even when the browser reports prefers-reduced-motion (regression)', async () => {
			// Element.animate()'s `finished` promise settles regardless of the
			// animation's duration, so a 0ms animation (forced here via
			// prefers-reduced-motion) must still resolve and clear
			// engine.isProcessed instead of hanging forever.
			const matchMediaSpy = vi
				.spyOn(window, 'matchMedia')
				.mockReturnValue({ matches: true } as MediaQueryList);

			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			const result = await ip.insert(insertionBlock);

			expect(result).toBe(insertionBlock);
			expect(engine.isProcessed).toBe(false);
			expect(engine.save).toHaveBeenCalled();

			matchMediaSpy.mockRestore();
		});

		test('should still resolve and reset isProcessed if the insertion animation is canceled', async () => {
			const engine = createMockEngine();
			// A long duration that we cancel before it would naturally finish,
			// so the test exercises the `finished` promise's rejection path.
			const ip = new InsertionPoint(engine, 10_000);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			const promise = ip.insert(insertionBlock);

			const [animation] = ip.el.getAnimations();
			animation?.cancel();

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
