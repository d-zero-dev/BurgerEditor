import { describe, expect, test } from 'vitest';

import { normalizeIndent } from './normalize-indent.js';

describe('normalizeIndent', () => {
	test('should remove leading tabs from all lines', () => {
		const input = '\t\t<h3>Title</h3>\n\t\t<p>Text</p>';
		const expected = '<h3>Title</h3>\n<p>Text</p>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should remove leading spaces from all lines', () => {
		const input = '    <h3>Title</h3>\n    <p>Text</p>';
		const expected = '<h3>Title</h3>\n<p>Text</p>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should handle mixed indentation levels', () => {
		const input = '\t\t<div>\n\t\t\t<p>Nested</p>\n\t\t</div>';
		const expected = '<div>\n\t<p>Nested</p>\n</div>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should preserve lines without base indent', () => {
		const input = '\t\t<div>\n<p>No indent</p>\n\t\t</div>';
		const expected = '<div>\n<p>No indent</p>\n</div>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should return unchanged if no indent', () => {
		const input = '<h3>Title</h3>\n<p>Text</p>';
		expect(normalizeIndent(input)).toBe(input);
	});

	test('should handle empty string', () => {
		expect(normalizeIndent('')).toBe('');
	});

	test('should handle single line with indent', () => {
		const input = '\t\t<h3>Title</h3>';
		const expected = '<h3>Title</h3>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should return empty string for only whitespace lines', () => {
		const input = '   \n   \n   ';
		expect(normalizeIndent(input)).toBe('');
	});

	test('should remove empty lines at the beginning and end', () => {
		const input = '\n\n\t\t<h3>Title</h3>\n\t\t<p>Text</p>\n\n';
		const expected = '<h3>Title</h3>\n<p>Text</p>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should handle complex HTML structure', () => {
		const input = `\t\t\t<h3>u-blue</h3>
\t\t\t<p>テキストを<span class="u-blue">青色に変更</span>します。</p>
\t\t\t<h3>u-white</h3>
\t\t\t<p>テキストを<span class="u-white">白色に変更</span>します。</p>`;
		const expected = `<h3>u-blue</h3>
<p>テキストを<span class="u-blue">青色に変更</span>します。</p>
<h3>u-white</h3>
<p>テキストを<span class="u-white">白色に変更</span>します。</p>`;
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should handle tabs and spaces separately', () => {
		const input = '\t\t<div>\n\t\t\t<p>Tab indent</p>\n\t\t</div>';
		const expected = '<div>\n\t<p>Tab indent</p>\n</div>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should handle CRLF line endings', () => {
		const input = '\t\t<h3>Title</h3>\r\n\t\t<p>Text</p>';
		const expected = '<h3>Title</h3>\r\n<p>Text</p>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should preserve CRLF line endings', () => {
		const input = '    <div>\r\n    \t<p>Mixed</p>\r\n    </div>';
		const expected = '<div>\r\n\t<p>Mixed</p>\r\n</div>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should handle complex HTML with CRLF', () => {
		const input = '\t\t\t<h3>u-blue</h3>\r\n\t\t\t<p>Text</p>\r\n\t\t\t<h3>u-white</h3>';
		const expected = '<h3>u-blue</h3>\r\n<p>Text</p>\r\n<h3>u-white</h3>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should handle innerHTML-like input with leading/trailing whitespace', () => {
		const input = '\n\t\t\t<h3>Title</h3>\n\t\t\t<p>Text</p>\n\t\t';
		const expected = '<h3>Title</h3>\n<p>Text</p>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should return empty string for only whitespace with indent', () => {
		const input = '\n\t\t\t\n\t\t\t\n';
		expect(normalizeIndent(input)).toBe('');
	});

	test('should trim when no indent detected', () => {
		const input = '\n<h3>Title</h3>\n<p>Text</p>\n';
		const expected = '<h3>Title</h3>\n<p>Text</p>';
		expect(normalizeIndent(input)).toBe(expected);
	});

	test('should handle first line with no indent but other lines with indent', () => {
		const input =
			'<ul class="note-01">\n\t\t\t\t\t\t\t\t<li>Item 1</li>\n\t\t\t\t\t\t\t\t<li>Item 2</li>\n\t\t\t\t\t\t\t</ul>';
		expect(normalizeIndent(input)).toBe(input);
	});

	test('should be idempotent (calling twice should give same result)', () => {
		const input = '<ul>\n\t\t\t\t<li>Item</li>\n\t\t\t</ul>';
		const firstPass = normalizeIndent(input);
		const secondPass = normalizeIndent(firstPass);
		expect(firstPass).toBe(secondPass);
	});
});
