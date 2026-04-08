import { describe, expect, test } from 'vitest';

import { normalizeHtmlStructure } from './normalize-html.js';

describe('normalizeHtmlStructure', () => {
	test('should return true for identical HTML structures', () => {
		const html1 = '<p>test</p>';
		const html2 = '<p>test</p>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(true);
	});

	test('should return true for HTML with different whitespace', () => {
		const html1 = '<p>test</p>';
		const html2 = '<p>  test  </p>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(true);
	});

	test('should return true for HTML with different attribute order', () => {
		const html1 = '<div class="test" id="example">content</div>';
		const html2 = '<div id="example" class="test">content</div>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(true);
	});

	test('should return false for HTML with different tag names', () => {
		const html1 = '<p>test</p>';
		const html2 = '<div>test</div>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(false);
	});

	test('should return false for HTML with different attributes', () => {
		const html1 = '<div class="test">content</div>';
		const html2 = '<div class="other">content</div>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(false);
	});

	test('should return false for HTML with different structure', () => {
		const html1 = '<p>test</p>';
		const html2 = '<p><span>test</span></p>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(false);
	});

	test('should return true for empty HTML', () => {
		const html1 = '';
		const html2 = '';
		expect(normalizeHtmlStructure(html1, html2)).toBe(true);
	});

	test('should return false for empty HTML vs non-empty HTML', () => {
		const html1 = '';
		const html2 = '<p>test</p>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(false);
	});

	test('should handle tiptap normalization (empty p tags)', () => {
		const html1 = '<p></p>';
		const html2 = '';
		// tiptapは空のpタグを削除するため、構造が異なる
		expect(normalizeHtmlStructure(html1, html2)).toBe(false);
	});

	test('should return false for invalid HTML', () => {
		const html1 = '<p>test</p>';
		const html2 = '<p>unclosed';
		// パースエラーが発生するためfalseを返す
		expect(normalizeHtmlStructure(html1, html2)).toBe(false);
	});

	test('should handle nested structures', () => {
		const html1 = '<div><p>test</p></div>';
		const html2 = '<div><p>test</p></div>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(true);
	});

	test('should handle multiple children', () => {
		const html1 = '<div><p>test1</p><p>test2</p></div>';
		const html2 = '<div><p>test1</p><p>test2</p></div>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(true);
	});

	test('should return false for different number of children', () => {
		const html1 = '<div><p>test1</p></div>';
		const html2 = '<div><p>test1</p><p>test2</p></div>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(false);
	});

	test('should handle text content normalization', () => {
		const html1 = '<p>test</p>';
		const html2 = '<p>  test  </p>';
		expect(normalizeHtmlStructure(html1, html2)).toBe(true);
	});
});
