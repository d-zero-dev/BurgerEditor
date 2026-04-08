import type { LoadContentResult } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { loadContent, saveContent } from './edit-content.js';
import { NoEditableAreaError } from './no-editable-area-error.js';

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
	});
});
