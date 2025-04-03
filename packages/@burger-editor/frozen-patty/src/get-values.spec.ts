import { test, expect, describe } from 'vitest';

import { getValues } from './get-values.js';

describe('getValues', () => {
	test('basic', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:data-foo';
		el.dataset.foo = 'bar';
		expect(getValues(el)).toStrictEqual([['foo', 'bar', false]]);
	});

	test('shorthand', () => {
		const el = document.createElement('div');
		el.dataset.field = ':foo';
		el.dataset.fieldFoo = 'bar';
		expect(getValues(el)).toStrictEqual([['foo', 'bar', false]]);
	});
});
