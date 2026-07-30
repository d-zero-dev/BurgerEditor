import { test, expect, beforeEach, describe, vi } from 'vitest';

import { InsertionPoint } from './insertion-point.js';

/**
 * @param animateInsertion - hostの演出フックを模したモック
 */
function createMockEngine(
	animateInsertion: (markerEl: HTMLElement) => Promise<void> = () => Promise.resolve(),
) {
	const containerElement = document.createElement('div');
	document.body.append(containerElement);

	return {
		isProcessed: false,
		content: {
			containerElement,
			animateInsertion,
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
		test('should reject when insert target is not set', async () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const block = createMockBlock();

			await expect(ip.insert(block)).rejects.toThrow('InsertionPoint is not set');
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

		test('should run the host animation with the marker element', async () => {
			const animateInsertion = vi.fn().mockResolvedValue();
			const engine = createMockEngine(animateInsertion);
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			await ip.insert(insertionBlock);

			expect(animateInsertion).toHaveBeenCalledWith(ip.el);
		});

		test('should resolve after the animation completes and unwrap the insertion element', async () => {
			const engine = createMockEngine();
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			const result = await ip.insert(insertionBlock);

			expect(result).toBe(insertionBlock);
			expect(engine.content.containerElement.contains(insertionBlock.el)).toBe(true);
			expect(ip.el.isConnected).toBe(false);
			expect(engine.isProcessed).toBe(false);
			expect(engine.save).toHaveBeenCalled();
		});

		test('should not resolve before the host animation settles', async () => {
			let finish!: () => void;
			const engine = createMockEngine(
				() =>
					new Promise<void>((resolve) => {
						finish = resolve;
					}),
			);
			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(null, false);
			const promise = ip.insert(insertionBlock);

			// アニメーション完了前はマーカーがDOMに残りisProcessedもtrueのまま
			await Promise.resolve();
			expect(ip.el.isConnected).toBe(true);
			expect(engine.isProcessed).toBe(true);

			finish();
			await promise;

			expect(ip.el.isConnected).toBe(false);
			expect(engine.isProcessed).toBe(false);
		});

		test('should insert before target block when toTop is true', () => {
			const engine = createMockEngine();
			const existingBlock = createMockBlock();
			engine.content.containerElement.append(existingBlock.el);

			const ip = new InsertionPoint(engine);
			const insertionBlock = createMockBlock();

			ip.set(existingBlock, true);
			void ip.insert(insertionBlock);

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

			const children = [...engine.content.containerElement.children];
			const ipIndex = children.indexOf(ip.el);
			const existingIndex = children.indexOf(existingBlock.el);
			expect(ipIndex).toBeGreaterThan(existingIndex);
		});
	});
});
