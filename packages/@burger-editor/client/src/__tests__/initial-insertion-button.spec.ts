import { test, expect, beforeEach, describe, vi } from 'vitest';

import { InitialInsertionButton } from '../../../core/src/initial-insertion-button.js';

/**
 *
 */
function createMockEngine() {
	return {
		isProcessed: false,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

/**
 *
 */
function createMockInsertionPoint() {
	return {
		set: vi.fn(),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

describe('InitialInsertionButton', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should create a button element', () => {
			const insertionPoint = createMockInsertionPoint();
			const engine = createMockEngine();
			const afterInsert = vi.fn();

			const button = new InitialInsertionButton(insertionPoint, engine, afterInsert);

			expect(button.el.querySelector('button')).not.toBeNull();
			expect(button.el.querySelector('button')?.textContent).toBe('下に要素を追加');
		});

		test('should set data-bge-component to initial-insertion', () => {
			const button = new InitialInsertionButton(
				createMockInsertionPoint(),
				createMockEngine(),
				vi.fn(),
			);

			expect(button.el.dataset.bgeComponent).toBe('initial-insertion');
		});
	});

	describe('click behavior', () => {
		test('should call afterInsert on click', () => {
			const insertionPoint = createMockInsertionPoint();
			const engine = createMockEngine();
			const afterInsert = vi.fn();

			const iib = new InitialInsertionButton(insertionPoint, engine, afterInsert);
			const btn = iib.el.querySelector('button')!;
			btn.click();

			expect(afterInsert).toHaveBeenCalledOnce();
		});

		test('should call insertionPoint.set with null and false on click', () => {
			const insertionPoint = createMockInsertionPoint();
			const engine = createMockEngine();
			const afterInsert = vi.fn();

			const iib = new InitialInsertionButton(insertionPoint, engine, afterInsert);
			const btn = iib.el.querySelector('button')!;
			btn.click();

			expect(insertionPoint.set).toHaveBeenCalledWith(null, false);
		});

		test('should hide the button on click', () => {
			const insertionPoint = createMockInsertionPoint();
			const engine = createMockEngine();
			const afterInsert = vi.fn();

			const iib = new InitialInsertionButton(insertionPoint, engine, afterInsert);
			const btn = iib.el.querySelector('button')!;
			btn.click();

			expect(iib.el.hidden).toBe(true);
		});

		test('should do nothing when engine.isProcessed is true', () => {
			const insertionPoint = createMockInsertionPoint();
			const engine = createMockEngine();
			engine.isProcessed = true;
			const afterInsert = vi.fn();

			const iib = new InitialInsertionButton(insertionPoint, engine, afterInsert);
			const btn = iib.el.querySelector('button')!;
			btn.click();

			expect(afterInsert).not.toHaveBeenCalled();
			expect(insertionPoint.set).not.toHaveBeenCalled();
			expect(iib.el.hidden).toBe(false);
		});
	});
});
