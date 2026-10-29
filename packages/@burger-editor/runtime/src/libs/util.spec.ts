import { describe, expect, it } from 'vitest';

import { px, wrap } from './util.js';

describe('px', () => {
	it('parses a px value', () => {
		expect(px('12.5px')).toBe(12.5);
	});

	it('returns 0 for an empty or non-numeric value', () => {
		expect(px('')).toBe(0);
		expect(px('auto')).toBe(0);
	});
});

describe('wrap', () => {
	it('keeps an index inside the range', () => {
		expect(wrap(0, 3)).toBe(0);
		expect(wrap(2, 3)).toBe(2);
		expect(wrap(3, 3)).toBe(0);
		expect(wrap(7, 3)).toBe(1);
	});

	it('counts negative indexes from the end', () => {
		expect(wrap(-1, 3)).toBe(2);
		expect(wrap(-3, 3)).toBe(0);
		expect(wrap(-4, 3)).toBe(2);
	});

	it('returns 0 for an empty range', () => {
		expect(wrap(5, 0)).toBe(0);
	});
});
