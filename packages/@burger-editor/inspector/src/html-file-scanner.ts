import type { SearchParams } from './css-variable-matcher.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { exportStyleOptions, BLOCK_OPTION_SCOPE_SELECTOR } from '@burger-editor/core';
import { JSDOM } from 'jsdom';

import { matchesSearchQuery } from './css-variable-matcher.js';
import { proxyJsdomElementForIterableStyle } from './jsdom-proxy-utils.js';

export interface SearchMatch {
	readonly filePath: string;
	readonly lineNumber: number;
	readonly lineContent: string;
}

/**
 * Get line number of an element in the HTML source
 * Uses element index to find the exact position in HTML
 * @param html Full HTML content
 * @param elementIndex Index of this element in the document (for uniqueness)
 * @returns Line number (1-indexed) or 0 if not found
 */
function getElementLineNumber(html: string, elementIndex: number): number {
	// We need to match all [data-bge-container] elements, not just those with specific attributes
	// because elementIndex represents the position in ALL containers
	const lines = html.split('\n');
	let foundCount = 0;

	for (const [i, line] of lines.entries()) {
		if (!line) continue;

		// Match any data-bge-container attribute
		if (line.includes('data-bge-container=')) {
			// Check if this is the matching occurrence
			if (foundCount === elementIndex) {
				return i + 1; // 1-indexed
			}
			foundCount++;
		}
	}

	return 0;
}

/**
 * Scan all HTML files in documentRoot for CSS variable matches
 * @param documentRoot Root directory to search in
 * @param searchParams Search parameters (category and value)
 * @returns Array of matches with file path, line number, and content
 */
export async function scanHtmlFiles(
	documentRoot: string,
	searchParams: SearchParams,
): Promise<SearchMatch[]> {
	const htmlFiles = await collectHtmlFiles(documentRoot);
	const matches: SearchMatch[] = [];

	for (const filePath of htmlFiles) {
		const fileMatches = await searchInFile(filePath, searchParams);
		matches.push(...fileMatches);
	}

	return matches;
}

/**
 * Scan HTML files with multiple queries (AND search)
 * Returns matches where a single element matches ALL queries simultaneously
 * @param documentRoot Root directory to search in
 * @param searchParamsArray Array of search parameters
 * @returns Array of matches where each element matches all queries
 */
export async function scanHtmlFilesWithMultipleQueries(
	documentRoot: string,
	searchParamsArray: readonly SearchParams[],
): Promise<SearchMatch[]> {
	if (searchParamsArray.length === 0) {
		return [];
	}

	if (searchParamsArray.length === 1) {
		return scanHtmlFiles(documentRoot, searchParamsArray[0]!);
	}

	// For AND search, we need to check if a single element matches ALL queries
	const htmlFiles = await collectHtmlFiles(documentRoot);
	const matches: SearchMatch[] = [];

	for (const filePath of htmlFiles) {
		const fileMatches = await searchInFileWithMultipleQueries(
			filePath,
			searchParamsArray,
		);
		matches.push(...fileMatches);
	}

	return matches;
}

/**
 * Search for matches in a single file where each element matches ALL queries
 * @param filePath Absolute path to file
 * @param searchParamsArray Array of search parameters
 * @returns Array of matches where each element matches all queries
 */
async function searchInFileWithMultipleQueries(
	filePath: string,
	searchParamsArray: readonly SearchParams[],
): Promise<SearchMatch[]> {
	const html = await fs.readFile(filePath, 'utf8');
	const matches: SearchMatch[] = [];

	// Parse HTML with jsdom
	const dom = new JSDOM(html);
	const document = dom.window.document;

	// Find all block container elements
	const containers = document.querySelectorAll(BLOCK_OPTION_SCOPE_SELECTOR);

	for (const [i, container] of containers.entries()) {
		if (!container) continue;
		if (!(container instanceof dom.window.HTMLElement)) continue;

		const proxiedElement = proxyJsdomElementForIterableStyle(container);
		const styleOptions = exportStyleOptions(proxiedElement);

		// Check if this element matches ALL queries
		const matchesAllQueries = searchParamsArray.every((params) =>
			matchesSearchQuery(styleOptions, params),
		);

		if (matchesAllQueries) {
			const lineNumber = getElementLineNumber(html, i);
			const styleAttr = container.getAttribute('style') || '';

			matches.push({
				filePath,
				lineNumber,
				lineContent: styleAttr.slice(0, 200), // Truncate for display
			});
		}
	}

	return matches;
}

/**
 * Recursively collect all HTML files from a directory
 * @param dirPath Directory path to search
 * @returns Array of absolute file paths to HTML files
 */
async function collectHtmlFiles(dirPath: string): Promise<string[]> {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			// Skip hidden directories (e.g., .git, .cache)
			if (entry.name.startsWith('.')) {
				continue;
			}

			// Recursively collect files from subdirectories
			const subFiles = await collectHtmlFiles(fullPath);
			files.push(...subFiles);
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			files.push(fullPath);
		}
	}

	return files;
}

/**
 * Search for matches in a single file using DOM parsing
 * @param filePath Absolute path to file
 * @param searchParams Search parameters
 * @returns Array of matches in this file
 */
async function searchInFile(
	filePath: string,
	searchParams: SearchParams,
): Promise<SearchMatch[]> {
	const html = await fs.readFile(filePath, 'utf8');
	const matches: SearchMatch[] = [];

	// Parse HTML with jsdom
	const dom = new JSDOM(html);
	const document = dom.window.document;

	// Find all block container elements
	const containers = document.querySelectorAll(BLOCK_OPTION_SCOPE_SELECTOR);

	for (const [i, container] of containers.entries()) {
		if (!container) continue;
		if (!(container instanceof dom.window.HTMLElement)) continue;

		const proxiedElement = proxyJsdomElementForIterableStyle(container);
		const styleOptions = exportStyleOptions(proxiedElement);

		// Check if this element matches the search query
		if (matchesSearchQuery(styleOptions, searchParams)) {
			const lineNumber = getElementLineNumber(html, i);
			const styleAttr = container.getAttribute('style') || '';

			matches.push({
				filePath,
				lineNumber,
				lineContent: styleAttr.slice(0, 200), // Truncate for display
			});
		}
	}

	return matches;
}
