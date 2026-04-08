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

	test('URL', () => {
		const el = document.createElement('img');
		el.dataset.field = 'foo:src';
		el.setAttribute('src', 'path/to/file.png');
		expect(getValues(el)).toStrictEqual([['foo', 'path/to/file.png', false]]);
		expect(el.src).toBe('https://www.d-zero.co.jp/path/to/file.png');
	});
});
