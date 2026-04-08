import { test, expect, describe } from 'vitest';

import { comparePriority } from './compare-priority.js';

describe('comparePriority', () => {
	test('should return 0 for two empty arrays', () => {
		expect(comparePriority([], [])).toBe(0);
	});

	test('should return -1 when first array has lower priority than empty array', () => {
		expect(comparePriority([0], [])).toBe(-1);
	});

	test('should return 0 for identical priority arrays', () => {
		expect(comparePriority([0, 1], [0, 1])).toBe(0);
	});

	test('should return -1 when first array has lower priority due to larger second element', () => {
		expect(comparePriority([0, 1], [0, 0])).toBe(-1);
	});

	test('should return 1 when first array has higher priority due to smaller second element', () => {
		expect(comparePriority([0, 0], [0, 1])).toBe(1);
	});

	test('should return 1 when first array has higher priority due to smaller second element (different lengths)', () => {
		expect(comparePriority([0, 0, 0], [0, 1])).toBe(1);
	});

	test('should return -1 when first array is longer (lower priority) than shorter matching array', () => {
		expect(comparePriority([0, 1, 0], [0, 1])).toBe(-1);
	});

	test('should return 0 for special case: minLength >= 3 with last elements in [0, 1] range', () => {
		expect(comparePriority([0, 1, 0], [0, 1, 1])).toBe(0);
	});

	test('should return 1 when first array has higher priority due to smaller last element', () => {
		expect(comparePriority([0, 1, 0], [0, 1, 5])).toBe(1);
	});

	test('should return -1 when first array has lower priority due to larger last element', () => {
		expect(comparePriority([0, 1, 6], [0, 1, 5])).toBe(-1);
	});

	test('should return 1 when first array has higher priority due to smaller first element', () => {
		expect(comparePriority([7, 1, 6], [8, 1, 5])).toBe(1);
	});

	// H-4: 配列長が異なる場合、短い方（unlayered）が高優先度
	test('[1] vs [1,1] → 1 (shorter has higher priority)', () => {
		expect(comparePriority([1], [1, 1])).toBe(1);
	});

	test('[1,1] vs [1] → -1 (longer has lower priority)', () => {
		expect(comparePriority([1, 1], [1])).toBe(-1);
	});
});
