import { test, expect, describe } from 'vitest';

import { setValue } from './set-value.js';

describe('setValue', () => {
	test('basic', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:data-foo';
		expect(el.dataset.foo).toBeUndefined();
		setValue(el, 'foo', 'bar');
		expect(el.dataset.foo).toBe('bar');
	});

	test('attr', () => {
		const el = document.createElement('a');
		el.dataset.field = 'foo:href';
		expect(el.href).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'foo', url);
		expect(el.href).toBe(url);
	});

	test('shorthand', () => {
		const el = document.createElement('a');
		el.dataset.field = ':href';
		expect(el.href).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'href', url);
		expect(el.href).toBe(url);
	});

	test('text', () => {
		const el = document.createElement('a');
		el.dataset.field = 'href';
		expect(el.href).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'href', url);
		expect(el.textContent).toBe(url);
	});

	test('text', () => {
		const el = document.createElement('a');
		el.dataset.field = 'foo:text';
		expect(el.textContent).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'foo', url);
		expect(el.textContent).toBe(url);
	});

	test('text shorthand', () => {
		const el = document.createElement('a');
		el.dataset.field = 'foo';
		expect(el.textContent).toBe('');
		const url = 'https://example.com/path/to/file.html';
		setValue(el, 'foo', url);
		expect(el.textContent).toBe(url);
	});
});
