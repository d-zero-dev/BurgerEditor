import type { SearchMatch } from './html-file-scanner.js';
import type { LocalServerConfig } from '../types.js';

import path from 'node:path';

import { test, expect, describe } from 'vitest';

import { formatOutput } from './output-formatter.js';

describe('formatOutput', () => {
	const mockConfig: LocalServerConfig = {
		documentRoot: '/Users/test/project/src',
		host: 'localhost',
		port: 5255,
		// Add minimal required fields for LocalServerConfig
	} as LocalServerConfig;

	const mockMatch: SearchMatch = {
		filePath: '/Users/test/project/src/pages/index.html',
		lineNumber: 42,
		lineContent: '<div style="--bge-options-margin--normal">',
	};

	test('formats output as file path by default', () => {
		const result = formatOutput(mockMatch, {
			showUrl: false,
			config: mockConfig,
		});

		expect(result).toBe('/Users/test/project/src/pages/index.html:42');
	});

	test('formats output as URL when showUrl is true', () => {
		const result = formatOutput(mockMatch, {
			showUrl: true,
			config: mockConfig,
		});

		expect(result).toBe('http://localhost:5255/pages/index.html:42');
	});

	test('handles file in documentRoot directly', () => {
		const match: SearchMatch = {
			filePath: '/Users/test/project/src/index.html',
			lineNumber: 10,
			lineContent: '<div>',
		};

		const result = formatOutput(match, {
			showUrl: true,
			config: mockConfig,
		});

		expect(result).toBe('http://localhost:5255/index.html:10');
	});

	test('handles custom host and port', () => {
		const customConfig: LocalServerConfig = {
			...mockConfig,
			host: '0.0.0.0',
			port: 8080,
		};

		const result = formatOutput(mockMatch, {
			showUrl: true,
			config: customConfig,
		});

		expect(result).toBe('http://0.0.0.0:8080/pages/index.html:42');
	});

	test('normalizes Windows-style paths to forward slashes in URLs', () => {
		const windowsMatch: SearchMatch = {
			filePath: path.join('C:', 'Users', 'test', 'project', 'src', 'pages', 'index.html'),
			lineNumber: 42,
			lineContent: '<div>',
		};

		const windowsConfig: LocalServerConfig = {
			...mockConfig,
			documentRoot: path.join('C:', 'Users', 'test', 'project', 'src'),
		};

		const result = formatOutput(windowsMatch, {
			showUrl: true,
			config: windowsConfig,
		});

		// Should use forward slashes in URL
		expect(result).toContain('http://localhost:5255/pages');
		expect(result).toContain(':42');
		expect(result).not.toContain('\\');
	});

	test('preserves line numbers correctly', () => {
		const match1: SearchMatch = {
			...mockMatch,
			lineNumber: 1,
		};
		const match999: SearchMatch = {
			...mockMatch,
			lineNumber: 999,
		};

		const result1 = formatOutput(match1, {
			showUrl: false,
			config: mockConfig,
		});
		const result999 = formatOutput(match999, {
			showUrl: false,
			config: mockConfig,
		});

		expect(result1).toContain(':1');
		expect(result999).toContain(':999');
	});

	test('handles nested directory structures', () => {
		const nestedMatch: SearchMatch = {
			filePath: '/Users/test/project/src/pages/blog/2024/article.html',
			lineNumber: 123,
			lineContent: '<div>',
		};

		const result = formatOutput(nestedMatch, {
			showUrl: true,
			config: mockConfig,
		});

		expect(result).toBe('http://localhost:5255/pages/blog/2024/article.html:123');
	});
});
