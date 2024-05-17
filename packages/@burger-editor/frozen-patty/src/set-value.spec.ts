import { test, expect } from 'vitest';

import { setValue } from './set-value.js';

test('setValue', () => {
	const el = document.createElement('div');
	el.dataset.field = 'foo:data-foo';
	expect(el.dataset.foo).toBeUndefined();
	setValue(el, 'foo', 'bar');
	expect(el.dataset.foo).toBe('bar');
});
