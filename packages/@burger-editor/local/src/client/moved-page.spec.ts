import { describe, expect, test } from 'vitest';

import { movedPageUrl } from './moved-page.js';

describe('movedPageUrl', () => {
	test('returns the new path when the save moved the page', () => {
		expect(movedPageUrl('/company/about.html', '/about.html', 'index.html')).toBe(
			'/company/about.html',
		);
	});

	test('returns null when the page stays where it is', () => {
		expect(movedPageUrl('/about.html', '/about.html', 'index.html')).toBeNull();
	});

	test('treats the site root and its index file as the same page', () => {
		expect(movedPageUrl('/index.html', '/', 'index.html')).toBeNull();
	});

	test('returns null when the server did not report a path', () => {
		expect(movedPageUrl(undefined, '/about.html', 'index.html')).toBeNull();
	});
});
