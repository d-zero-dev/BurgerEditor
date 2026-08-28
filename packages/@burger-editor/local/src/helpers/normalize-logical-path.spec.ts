import { describe, expect, test } from 'vitest';

import { normalizeLogicalPath } from './normalize-logical-path.js';

describe('normalizeLogicalPath', () => {
	test('"/" becomes "/index.html" with the default index file name', () => {
		expect(normalizeLogicalPath('/', 'index.html')).toBe('/index.html');
	});

	test('a path that already names a file is returned unchanged', () => {
		expect(normalizeLogicalPath('/about.html', 'index.html')).toBe('/about.html');
	});

	test('a trailing-slash directory path gets the index file name appended', () => {
		expect(normalizeLogicalPath('/dir/', 'index.html')).toBe('/dir/index.html');
	});

	test('a nested trailing-slash path gets the index file name appended', () => {
		expect(normalizeLogicalPath('/a/b/c/', 'index.html')).toBe('/a/b/c/index.html');
	});

	test('a custom indexFileName is what gets appended', () => {
		expect(normalizeLogicalPath('/', 'top.html')).toBe('/top.html');
		expect(normalizeLogicalPath('/docs/', 'default.htm')).toBe('/docs/default.htm');
	});

	test('a path that already ends with the index file name is left alone (no double index)', () => {
		expect(normalizeLogicalPath('/index.html', 'index.html')).toBe('/index.html');
		expect(normalizeLogicalPath('/dir/index.html', 'index.html')).toBe('/dir/index.html');
	});

	test('an extension-less path without a trailing slash is not treated as a directory', () => {
		expect(normalizeLogicalPath('/dir', 'index.html')).toBe('/dir');
	});

	test('an empty string is returned unchanged (only a trailing "/" triggers normalization)', () => {
		expect(normalizeLogicalPath('', 'index.html')).toBe('');
	});
});
