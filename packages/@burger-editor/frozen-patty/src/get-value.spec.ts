import { test, expect } from 'vitest';

import { getValue } from './get-value.js';

test('getValue', () => {
	const el = document.createElement('div');
	el.dataset.field = 'foo:data-foo';
	el.dataset.foo = 'bar';
	expect(getValue(el, 'foo')).toBe('bar');
});
