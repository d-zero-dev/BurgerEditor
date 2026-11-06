import { test, expect } from 'vitest';

import { getValue } from './get-value.js';

test('getValue', () => {
	const el = document.createElement('div');
	el.dataset.field = 'foo:data-foo';
	el.dataset.foo = 'bar';
	expect(getValue(el, 'foo')).toBe('bar');
});

test('<button> の command は、DOM がプロパティを実装していなくても、属性から読める（Node.js の jsdom）', () => {
	const el = document.createElement('button');
	el.setAttribute('command', 'show-modal');
	el.dataset.field = ':command';

	expect(getValue(el, 'command')).toBe('show-modal');
});
