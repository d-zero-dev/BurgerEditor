import type { ParsedFrontMatter } from '../types.js';

import matter from 'gray-matter';

/**
 * Separate Front Matter from HTML file content
 * Important: This process must be executed before DOM parsing
 * @param fileContent HTML file content
 * @returns Result of Front Matter and content separation
 */
export function parseFrontMatter(fileContent: string): ParsedFrontMatter {
	try {
		const parsed = matter(fileContent);

		const hasFrontMatter =
			Object.keys(parsed.data).length > 0 ||
			Boolean(parsed.matter && parsed.matter !== '');

		return {
			data: parsed.data,
			content: parsed.content,
			originalFrontMatter: hasFrontMatter ? parsed.matter : undefined,
			hasFrontMatter,
		};
	} catch {
		// If Front Matter parsing fails, treat the entire file as content
		return {
			data: {},
			content: fileContent,
			originalFrontMatter: undefined,
			hasFrontMatter: false,
		};
	}
}

/**
 * Combine HTML content with Front Matter
 * Important: This process must be executed after HTML stringification
 * @param htmlContent HTML string
 * @param frontMatterData Front Matter data
 * @param _originalFrontMatter Original Front Matter string (currently unused)
 * @returns String combining Front Matter and HTML content
 */
export function stringifyWithFrontMatter(
	htmlContent: string,
	frontMatterData: Record<string, unknown>,
	_originalFrontMatter?: string,
): string {
	// Return HTML as-is if no Front Matter
	if (!frontMatterData || Object.keys(frontMatterData).length === 0) {
		return htmlContent;
	}

	try {
		// Use gray-matter to combine Front Matter and HTML
		const result = matter.stringify(htmlContent, frontMatterData);
		return result;
	} catch {
		// Return original HTML if combination fails
		return htmlContent;
	}
}

/**
 * Determine if Front Matter data has been changed
 * @param original Original Front Matter data
 * @param current Current Front Matter data
 * @returns true if changed
 */
export function isFrontMatterChanged(
	original: Record<string, unknown>,
	current: Record<string, unknown>,
): boolean {
	return JSON.stringify(original) !== JSON.stringify(current);
}
