import type { LoadContentResult } from '@burger-editor/core';

import fs from 'node:fs/promises';
import path from 'node:path';

import { NoEditableAreaError, updateHtmlContent } from '@burger-editor/core';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import '../dom-shim.js';

import { FileNotFoundError, loadContent, saveContent } from './edit-content.js';

const TEST_DIR = path.join(import.meta.dirname, '..', '..', 'test-temp');

beforeEach(async () => {
	// Create test directory
	await fs.mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
	// Delete test-temp directory after tests
	await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
});

describe('edit-content with Front Matter support', () => {
	describe('HTML Fragment handling', () => {
		test('should preserve HTML fragment format without adding html/body tags', async () => {
			// Fragment file with Front Matter
			const fragmentContent = `---
title: 'Test Page'
date: 2024-01-01
---
<div class="content">
	<h1>Original Content</h1>
	<p>This is a fragment</p>
</div>`;

			const filePath = path.join(TEST_DIR, 'fragment.html');
			await fs.writeFile(filePath, fragmentContent, 'utf8');

			// Load with editable area specified
			const result = await loadContent(filePath, '.content', '');

			expect(result).toBeTypeOf('object');
			expect(result).not.toBeInstanceOf(NoEditableAreaError);

			const loadResult = result as LoadContentResult;
			expect(loadResult.hasFrontMatter).toBe(true);
			expect(loadResult.frontMatter.title).toBe('Test Page');
			expect(loadResult.editableContent).toContain('Original Content');

			// Update content and save
			const newContent = '<h1>Updated Content</h1><p>This is updated</p>';
			await saveContent(
				filePath,
				newContent,
				'.content',
				loadResult.frontMatter,
				loadResult.originalFrontMatter,
			);

			// Check saved content
			const savedContent = await fs.readFile(filePath, 'utf8');

			// Front Matter should be preserved (gray-matter's actual format)
			expect(savedContent).toContain('title: Test Page');
			expect(savedContent).toContain('date: 2024-01-01');

			// HTML fragment format should be preserved (no html/body tags added)
			expect(savedContent).toContain('<div class="content">');
			expect(savedContent).toContain('Updated Content');
			expect(savedContent).not.toContain('<html>');
			expect(savedContent).not.toContain('<body>');
			expect(savedContent).not.toContain('<!DOCTYPE');
		});

		test('should handle fragment without Front Matter', async () => {
			const fragmentContent = `<section class="main">
	<h1>Fragment without Front Matter</h1>
</section>`;

			const filePath = path.join(TEST_DIR, 'no-fm-fragment.html');
			await fs.writeFile(filePath, fragmentContent, 'utf8');

			const result = await loadContent(filePath, '.main', '');
			const loadResult = result as LoadContentResult;

			expect(loadResult.hasFrontMatter).toBe(false);
			expect(loadResult.frontMatter).toEqual({});

			// Update and save
			await saveContent(filePath, '<h1>Updated Fragment</h1>', '.main');

			const savedContent = await fs.readFile(filePath, 'utf8');
			expect(savedContent).toContain('<section class="main">');
			expect(savedContent).toContain('Updated Fragment');
			expect(savedContent).not.toContain('<html>');
			expect(savedContent).not.toContain('<body>');
		});
	});

	describe('Full HTML Document handling', () => {
		test('should preserve full HTML document structure', async () => {
			const fullDocContent = `---
title: 'Full Document'
---
<!DOCTYPE html>
<html>
	<head>
		<title>Test Page</title>
		<meta charset="UTF-8">
	</head>
	<body>
		<main class="content">
			<h1>Document Content</h1>
		</main>
	</body>
</html>`;

			const filePath = path.join(TEST_DIR, 'full-doc.html');
			await fs.writeFile(filePath, fullDocContent, 'utf8');

			const result = await loadContent(filePath, '.content', '');
			const loadResult = result as LoadContentResult;

			expect(loadResult.hasFrontMatter).toBe(true);
			expect(loadResult.frontMatter.title).toBe('Full Document');

			// Update and save
			await saveContent(
				filePath,
				'<h1>Updated Document Content</h1>',
				'.content',
				loadResult.frontMatter,
				loadResult.originalFrontMatter,
			);

			const savedContent = await fs.readFile(filePath, 'utf8');

			// Complete HTML document structure should be preserved
			expect(savedContent).toContain('<!DOCTYPE html>');
			expect(savedContent).toContain('<html>');
			expect(savedContent).toContain('<head>');
			expect(savedContent).toContain('<title>Test Page</title>');
			expect(savedContent).toContain('<body>');
			expect(savedContent).toContain('Updated Document Content');
			expect(savedContent).toContain('title: Full Document');
		});
	});

	describe('editableArea null handling', () => {
		test('should return full content when editableArea is null', async () => {
			const content = `---
title: 'Null Area Test'
---
<div>Full content editing</div>`;

			const filePath = path.join(TEST_DIR, 'null-area.html');
			await fs.writeFile(filePath, content, 'utf8');

			// Load with editableArea as null
			const loadResult = await loadContent(filePath, null, '');

			if (loadResult instanceof NoEditableAreaError) {
				throw new TypeError('NoEditableAreaError should not be returned');
			}

			// Should return LoadContentResult type
			expect(loadResult).not.toBeInstanceOf(NoEditableAreaError);
			expect(loadResult.editableContent).toContain('<div>Full content editing</div>');
			expect(loadResult.editableContent).not.toContain("title: 'Null Area Test'"); // Front Matter should be removed
			expect(loadResult.hasFrontMatter).toBe(true);
			expect(loadResult.frontMatter.title).toBe('Null Area Test');

			// Update and save entire content
			const newFullContent = '<div>Updated full content</div>';
			await saveContent(
				filePath,
				newFullContent,
				null,
				loadResult.frontMatter,
				loadResult.originalFrontMatter,
			);

			const savedContent = await fs.readFile(filePath, 'utf8');
			expect(savedContent).toContain('Updated full content');
		});
	});

	describe('Error handling', () => {
		test('should return NoEditableAreaError when selector not found', async () => {
			const content = '<div class="other">Content</div>';
			const filePath = path.join(TEST_DIR, 'no-selector.html');
			await fs.writeFile(filePath, content, 'utf8');

			const result = await loadContent(filePath, '.nonexistent', '');

			expect(result).toBeInstanceOf(NoEditableAreaError);
			expect((result as NoEditableAreaError).selector).toBe('.nonexistent');
		});

		test('should create file when it does not exist', async () => {
			const nonExistentPath = path.join(TEST_DIR, 'new-file.html');

			const result = await loadContent(nonExistentPath, '.content', '');
			const loadResult = result as LoadContentResult;

			expect(loadResult.editableContent).toBe('');
			expect(loadResult.hasFrontMatter).toBe(false);

			// File should be created
			const exists = await fs
				.access(nonExistentPath)
				.then(() => true)
				.catch(() => false);
			expect(exists).toBe(true);
		});

		test('saveContent throws NoEditableAreaError on a full HTML document when the selector misses', async () => {
			// Used to silently fall back to <body> and destroy header / nav /
			// scripts. updateFullDocument now mirrors updateFragment's
			// behaviour and throws.
			const fullDoc = `<!DOCTYPE html><html><body><main class="content">old</main></body></html>`;
			const filePath = path.join(TEST_DIR, 'misses-selector.html');
			await fs.writeFile(filePath, fullDoc, 'utf8');
			await expect(
				saveContent(filePath, '<p>x</p>', '.does-not-exist', {}),
			).rejects.toBeInstanceOf(NoEditableAreaError);
		});

		test('saveContent surfaces FileNotFoundError when the file is deleted between load and save', async () => {
			const filePath = path.join(TEST_DIR, 'transient.html');
			await fs.writeFile(filePath, `<main class="c">old</main>`, 'utf8');
			await fs.rm(filePath); // race: external deletion between load and save
			await expect(saveContent(filePath, '<p>x</p>', '.c', {})).rejects.toBeInstanceOf(
				FileNotFoundError,
			);
		});
	});

	describe('updateHtmlContent — DOCTYPE preservation', () => {
		// These pin the spec-compliant SYSTEM-keyword serialization fix in
		// core/document/html-detection.ts. Without them, dropping the SYSTEM
		// keyword (the bug) doesn't fail any test.

		test('preserves simple HTML5 DOCTYPE', () => {
			const input = `<!DOCTYPE html><html><body><main class="c">old</main></body></html>`;
			const out = updateHtmlContent(input, '.c', '<p>new</p>');
			expect(out).toContain('<!DOCTYPE html>');
		});

		test('preserves SYSTEM-only DOCTYPE with the SYSTEM keyword', () => {
			const input = `<!DOCTYPE html SYSTEM "about:legacy-compat"><html><body><main class="c">old</main></body></html>`;
			const out = updateHtmlContent(input, '.c', '<p>new</p>');
			expect(out).toContain('<!DOCTYPE html SYSTEM "about:legacy-compat">');
		});

		test('preserves PUBLIC + SYSTEM DOCTYPE without an extra SYSTEM keyword', () => {
			const input = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html><body><main class="c">old</main></body></html>`;
			const out = updateHtmlContent(input, '.c', '<p>new</p>');
			expect(out).toContain(
				'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
			);
			// Defensive: PUBLIC must not be followed by SYSTEM (that's the
			// per-spec join — public implies system follows in the same form).
			expect(out).not.toMatch(/PUBLIC[^>]*SYSTEM/);
		});
	});
});
