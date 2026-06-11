import type { ParsedFrontMatter } from './types.js';

import matter from 'gray-matter';

/**
 * Separate Front Matter from HTML file content.
 * Must be executed before DOM parsing.
 * @param fileContent HTML file content
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
		return {
			data: {},
			content: fileContent,
			originalFrontMatter: undefined,
			hasFrontMatter: false,
		};
	}
}

/**
 * Combine HTML content with Front Matter.
 * Must be executed after HTML stringification.
 * @param htmlContent HTML string
 * @param frontMatterData Front Matter data
 * @param _originalFrontMatter Original Front Matter string (currently unused)
 */
export function stringifyWithFrontMatter(
	htmlContent: string,
	frontMatterData: Record<string, unknown>,
	_originalFrontMatter?: string,
): string {
	if (!frontMatterData || Object.keys(frontMatterData).length === 0) {
		return htmlContent;
	}

	try {
		return matter.stringify(htmlContent, frontMatterData);
	} catch {
		return htmlContent;
	}
}

/**
 *
 * @param original Original Front Matter data
 * @param current Current Front Matter data
 */
export function isFrontMatterChanged(
	original: Record<string, unknown>,
	current: Record<string, unknown>,
): boolean {
	return JSON.stringify(original) !== JSON.stringify(current);
}
