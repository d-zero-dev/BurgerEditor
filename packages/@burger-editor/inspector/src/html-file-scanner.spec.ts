import type { SearchParams } from './css-variable-matcher.js';

import path from 'node:path';

import { test, expect, describe } from 'vitest';

import { scanHtmlFiles, scanHtmlFilesWithMultipleQueries } from './html-file-scanner.js';

describe('scanHtmlFiles', () => {
	// Use actual test files in .test directory
	const testDocumentRoot = path.join(__dirname, '..', '..', '.test', 'src');

	test('finds matches for simple query', async () => {
		const params: SearchParams = {
			category: 'margin',
			values: ['none'],
			isWildcard: false,
			originalQuery: 'margin=none',
		};

		const matches = await scanHtmlFiles(testDocumentRoot, params);

		expect(matches.length).toBeGreaterThan(0);
		expect(matches[0]?.filePath).toContain('index.html');
		expect(matches[0]?.lineNumber).toBeGreaterThan(0);
	});

	test('finds matches for wildcard query', async () => {
		const params: SearchParams = {
			category: 'margin',
			values: ['*'],
			isWildcard: true,
			originalQuery: 'margin=*',
		};

		const matches = await scanHtmlFiles(testDocumentRoot, params);

		expect(matches.length).toBeGreaterThan(0);
		// Should find multiple margin values (none, large, etc.)
		const lineNumbers = new Set(matches.map((m) => m.lineNumber));
		expect(lineNumbers.size).toBeGreaterThan(1);
	});

	test('finds matches for OR query', async () => {
		const params: SearchParams = {
			category: 'margin',
			values: ['none', 'large'],
			isWildcard: false,
			originalQuery: 'margin=none,large',
		};

		const matches = await scanHtmlFiles(testDocumentRoot, params);

		expect(matches.length).toBeGreaterThanOrEqual(2);
		// Should find both margin--none and margin--large
		const content = matches.map((m) => m.lineContent).join(' ');
		expect(content).toContain('margin--none');
		expect(content).toContain('margin--large');
	});

	test('returns empty array when no matches found', async () => {
		const params: SearchParams = {
			category: 'nonexistent',
			values: ['value'],
			isWildcard: false,
			originalQuery: 'nonexistent=value',
		};

		const matches = await scanHtmlFiles(testDocumentRoot, params);

		expect(matches).toEqual([]);
	});

	test('includes correct line content in matches', async () => {
		const params: SearchParams = {
			category: 'margin',
			values: ['none'],
			isWildcard: false,
			originalQuery: 'margin=none',
		};

		const matches = await scanHtmlFiles(testDocumentRoot, params);

		expect(matches.length).toBeGreaterThan(0);
		const firstMatch = matches[0]!;
		expect(firstMatch.lineContent).toContain('--bge-options-margin');
		expect(firstMatch.lineContent).toBeTruthy();
	});
});

describe('scanHtmlFilesWithMultipleQueries', () => {
	const testDocumentRoot = path.join(__dirname, '..', '..', '.test', 'src');

	test('returns matches from files that satisfy all queries (AND)', async () => {
		const queries: SearchParams[] = [
			{
				category: 'margin',
				values: ['none'],
				isWildcard: false,
				originalQuery: 'margin=none',
			},
			{
				category: 'bg-color',
				values: ['blue'],
				isWildcard: false,
				originalQuery: 'bg-color=blue',
			},
		];

		const matches = await scanHtmlFilesWithMultipleQueries(testDocumentRoot, queries);

		// Should only return matches from files that have BOTH margin=none AND bg-color=blue
		expect(matches.length).toBeGreaterThan(0);

		// All matches should contain both CSS variables
		const fileContent = matches.map((m) => m.lineContent).join(' ');
		expect(fileContent).toContain('margin--none');
		expect(fileContent).toContain('bg-color--blue');
	});

	test('handles single query (same as scanHtmlFiles)', async () => {
		const queries: SearchParams[] = [
			{
				category: 'margin',
				values: ['none'],
				isWildcard: false,
				originalQuery: 'margin=none',
			},
		];

		const multiResult = await scanHtmlFilesWithMultipleQueries(testDocumentRoot, queries);
		const singleResult = await scanHtmlFiles(testDocumentRoot, queries[0]!);

		expect(multiResult.length).toBe(singleResult.length);
	});

	test('returns empty array when no files match all queries', async () => {
		const queries: SearchParams[] = [
			{
				category: 'margin',
				values: ['none'],
				isWildcard: false,
				originalQuery: 'margin=none',
			},
			{
				category: 'nonexistent',
				values: ['value'],
				isWildcard: false,
				originalQuery: 'nonexistent=value',
			},
		];

		const matches = await scanHtmlFilesWithMultipleQueries(testDocumentRoot, queries);

		expect(matches).toEqual([]);
	});

	test('returns empty array for empty query array', async () => {
		const matches = await scanHtmlFilesWithMultipleQueries(testDocumentRoot, []);

		expect(matches).toEqual([]);
	});

	test('removes duplicate matches from same line', async () => {
		const queries: SearchParams[] = [
			{
				category: 'padding-block',
				values: ['large'],
				isWildcard: false,
				originalQuery: 'padding-block=large',
			},
			{
				category: 'padding-inline',
				values: ['large'],
				isWildcard: false,
				originalQuery: 'padding-inline=large',
			},
		];

		const matches = await scanHtmlFilesWithMultipleQueries(testDocumentRoot, queries);

		// Check for unique file:line combinations
		const uniqueKeys = new Set(matches.map((m) => `${m.filePath}:${m.lineNumber}`));
		expect(uniqueKeys.size).toBe(matches.length);
	});

	test('sorts results by file path and line number', async () => {
		const queries: SearchParams[] = [
			{
				category: 'width',
				values: ['*'],
				isWildcard: true,
				originalQuery: 'width=*',
			},
		];

		const matches = await scanHtmlFilesWithMultipleQueries(testDocumentRoot, queries);

		// Verify sorting
		for (let i = 1; i < matches.length; i++) {
			const prev = matches[i - 1]!;
			const curr = matches[i]!;

			if (prev.filePath === curr.filePath) {
				expect(prev.lineNumber).toBeLessThanOrEqual(curr.lineNumber);
			} else {
				expect(prev.filePath.localeCompare(curr.filePath)).toBeLessThan(0);
			}
		}
	});
});
