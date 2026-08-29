import { describe, expect, test } from 'vitest';

import { isExternallyChanged } from './hash-check.js';

describe('isExternallyChanged', () => {
	test('is false when persistedHash is null (never read/written through local)', () => {
		expect(isExternallyChanged({ revision: 1, persistedHash: null }, 'abc')).toBe(false);
	});

	test('is false when the current hash matches persistedHash', () => {
		expect(isExternallyChanged({ revision: 1, persistedHash: 'abc' }, 'abc')).toBe(false);
	});

	test('is true when the current hash differs from persistedHash', () => {
		expect(isExternallyChanged({ revision: 1, persistedHash: 'abc' }, 'def')).toBe(true);
	});
});
