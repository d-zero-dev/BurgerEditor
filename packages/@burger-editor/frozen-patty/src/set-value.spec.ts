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

	test('style attr', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:style';
		expect(el.style.cssText).toBe('');
		const style = '--foo: var(--bar);';
		setValue(el, 'foo', style);
		expect(el.style.cssText).toBe(style);
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

	test('attr (XSS protection)', () => {
		const el = document.createElement('a');
		el.href = 'default';
		// Host is defined from environmentOptions in vitest.config.ts
		expect(el.href).toBe('https://www.d-zero.co.jp/default');
		el.dataset.field = 'foo:href';
		const url = 'javascript:alert("XSS")';
		setValue(el, 'foo', url);
		expect(el.href).toBe('https://www.d-zero.co.jp/default');
	});

	test('html (XSS protection)', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:html';
		expect(el.innerHTML).toBe('');
		const dangerousHtml = '<script>alert("XSS")</script>';
		setValue(el, 'foo', dangerousHtml);
		expect(el.innerHTML).toBe('alert("XSS")');
	});

	test('html (XSS protection)', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:html';
		expect(el.innerHTML).toBe('');
		const dangerousHtml = '<template><script>alert("XSS")</script></template>';
		setValue(el, 'foo', dangerousHtml);
		expect(el.innerHTML).toBe('alert("XSS")');
	});

	test('html (XSS protection)', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:html';
		expect(el.innerHTML).toBe('');
		const dangerousHtml = '<style><span>XSS</span></style>';
		setValue(el, 'foo', dangerousHtml);
		expect(el.innerHTML).toBe('<span>XSS</span>');
		expect(el.firstElementChild?.localName).toBe('span');
	});
});
