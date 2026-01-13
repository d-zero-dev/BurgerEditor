import type { SearchMatch } from '../search/html-file-scanner.js';
import type { LocalServerConfig } from '../types.js';

import path from 'node:path';

import { test, expect, describe } from 'vitest';

import { validateAndParseQueries, formatSearchResults, executeSearch } from './search.js';

describe('validateAndParseQueries', () => {
	test('validates and parses single query', () => {
		const result = validateAndParseQueries(['margin=normal']);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.params).toHaveLength(1);
			expect(result.params[0]?.category).toBe('margin');
			expect(result.params[0]?.values).toEqual(['normal']);
		}
	});

	test('validates and parses multiple queries', () => {
		const result = validateAndParseQueries(['margin=normal', 'bg-color=blue']);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.params).toHaveLength(2);
			expect(result.params[0]?.category).toBe('margin');
			expect(result.params[1]?.category).toBe('bg-color');
		}
	});

	test('returns error for empty queries array', () => {
		const result = validateAndParseQueries([]);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('At least one search query is required');
		}
	});

	test('returns error for invalid query format', () => {
		const result = validateAndParseQueries(['invalid-format']);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Invalid query format');
		}
	});

	test('returns error on first invalid query in batch', () => {
		const result = validateAndParseQueries(['margin=normal', 'invalid', 'bg-color=blue']);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Invalid query format');
		}
	});

	test('handles wildcard queries', () => {
		const result = validateAndParseQueries(['margin=*']);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.params[0]?.isWildcard).toBe(true);
		}
	});

	test('handles OR queries', () => {
		const result = validateAndParseQueries(['margin=normal,large,xlarge']);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.params[0]?.values).toEqual(['normal', 'large', 'xlarge']);
		}
	});
});

describe('formatSearchResults', () => {
	const mockConfig: LocalServerConfig = {
		documentRoot: '/Users/test/project/src',
		host: 'localhost',
		port: 5255,
	} as LocalServerConfig;

	const mockMatches: SearchMatch[] = [
		{
			filePath: '/Users/test/project/src/index.html',
			lineNumber: 42,
			lineContent: '<div>',
		},
		{
			filePath: '/Users/test/project/src/page.html',
			lineNumber: 100,
			lineContent: '<span>',
		},
	];

	test('formats results as file paths', () => {
		const results = formatSearchResults(mockMatches, false, mockConfig);

		expect(results).toHaveLength(2);
		expect(results[0]).toBe('/Users/test/project/src/index.html:42');
		expect(results[1]).toBe('/Users/test/project/src/page.html:100');
	});

	test('formats results as URLs', () => {
		const results = formatSearchResults(mockMatches, true, mockConfig);

		expect(results).toHaveLength(2);
		expect(results[0]).toBe('http://localhost:5255/index.html:42');
		expect(results[1]).toBe('http://localhost:5255/page.html:100');
	});

	test('returns empty array for no matches', () => {
		const results = formatSearchResults([], false, mockConfig);

		expect(results).toEqual([]);
	});

	test('preserves match order', () => {
		const results = formatSearchResults(mockMatches, false, mockConfig);

		expect(results[0]).toContain('index.html');
		expect(results[1]).toContain('page.html');
	});
});

describe('executeSearch (integration)', () => {
	const testDocumentRoot = path.join(__dirname, '..', '..', '.test', 'src');

	test('executes search and finds matches', async () => {
		const searchParams = [
			{
				category: 'margin',
				values: ['none'],
				isWildcard: false,
				originalQuery: 'margin=none',
			},
		];

		const result = await executeSearch(testDocumentRoot, searchParams);

		expect(result.success).toBe(true);
		expect(result.matches.length).toBeGreaterThan(0);
		expect(result.error).toBeUndefined();
	});

	test('returns success=false when no matches found', async () => {
		const searchParams = [
			{
				category: 'nonexistent',
				values: ['value'],
				isWildcard: false,
				originalQuery: 'nonexistent=value',
			},
		];

		const result = await executeSearch(testDocumentRoot, searchParams);

		expect(result.success).toBe(false);
		expect(result.matches).toEqual([]);
		expect(result.error).toBeUndefined();
	});

	test('returns error for nonexistent documentRoot', async () => {
		const searchParams = [
			{
				category: 'margin',
				values: ['none'],
				isWildcard: false,
				originalQuery: 'margin=none',
			},
		];

		const result = await executeSearch('/nonexistent/path', searchParams);

		expect(result.success).toBe(false);
		expect(result.matches).toEqual([]);
		expect(result.error).toContain('documentRoot does not exist');
	});

	test('executes AND search with multiple queries', async () => {
		const searchParams = [
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

		const result = await executeSearch(testDocumentRoot, searchParams);

		expect(result.success).toBe(true);
		expect(result.matches.length).toBeGreaterThan(0);

		// Verify all matches contain both CSS variables in their file
		const fileContent = result.matches.map((m) => m.lineContent).join(' ');
		expect(fileContent).toContain('margin');
		expect(fileContent).toContain('bg-color');
	});

	test('executes wildcard search', async () => {
		const searchParams = [
			{
				category: 'margin',
				values: ['*'],
				isWildcard: true,
				originalQuery: 'margin=*',
			},
		];

		const result = await executeSearch(testDocumentRoot, searchParams);

		expect(result.success).toBe(true);
		expect(result.matches.length).toBeGreaterThan(0);
	});

	test('executes OR search', async () => {
		const searchParams = [
			{
				category: 'margin',
				values: ['none', 'large'],
				isWildcard: false,
				originalQuery: 'margin=none,large',
			},
		];

		const result = await executeSearch(testDocumentRoot, searchParams);

		expect(result.success).toBe(true);
		expect(result.matches.length).toBeGreaterThanOrEqual(2);
	});
});
