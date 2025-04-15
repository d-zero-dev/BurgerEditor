import { describe, expect, test } from 'vitest';

import { replaceCommentWithHTML } from './replace-comment-with-html.js';

describe('replaceCommentWithHTML', () => {
	test('should replace comment with html', () => {
		const html = replaceCommentWithHTML('<!-- test-test -->', {
			testTest: 'test-text',
		});
		expect(html).toBe('test-text');
	});

	test('should replace comment with html with data', () => {
		const html = replaceCommentWithHTML(
			'<!-- test2{"foo": "bar"} -->',
			{
				test: '<span>test</span>',
				test2: '<div>test</div>',
			},
			(key, html, data) => {
				return html.replace('test', `${key}:${data.foo}`);
			},
		);
		expect(html).toBe('<div>test2:bar</div>');
	});
});
