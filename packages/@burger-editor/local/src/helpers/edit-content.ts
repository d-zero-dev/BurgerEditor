import type { LoadContentResult } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';

import { log } from './debug.js';
import { parseFrontMatter, stringifyWithFrontMatter } from './front-matter.js';
import { extractContentFromHtml, updateHtmlContent } from './html-detection.js';
import { NoEditableAreaError } from './no-editable-area-error.js';

/**
 * Load content from HTML file (Front Matter compatible version)
 *
 * Processing order:
 * 1. File loading
 * 2. Front Matter separation (executed first)
 * 3. HTML DOM parsing
 * 4. Extract editable area
 * @param filePath File path
 * @param editableArea CSS selector for editable area
 * @param newFileContent
 * @returns Result containing Front Matter and content
 */
export async function loadContent(
	filePath: string,
	editableArea: string | null,
	newFileContent: string,
): Promise<LoadContentResult | NoEditableAreaError> {
	// 1. File loading
	const readFileContent = await fs.readFile(filePath, 'utf8').catch((error: unknown) => {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return new FileNotFoundError(filePath);
		}
		throw error;
	});

	let fileContent: string;

	if (readFileContent instanceof FileNotFoundError) {
		log('ENOENT: File not found, create empty file');
		const dir = path.dirname(filePath);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(filePath, newFileContent, 'utf8');

		fileContent = newFileContent;
	} else {
		fileContent = readFileContent;
	}

	// 2. Front Matter separation (executed first)
	const parsed = parseFrontMatter(fileContent);
	log(
		'Front Matter parsed: hasFrontMatter=%s, dataKeys=%o',
		parsed.hasFrontMatter,
		Object.keys(parsed.data),
	);

	// Return HTML content without Front Matter if editableArea is null
	if (editableArea === null) {
		log('No editable area, returning full content');
		return {
			editableContent: parsed.content,
			frontMatter: parsed.data,
			originalFrontMatter: parsed.originalFrontMatter,
			hasFrontMatter: parsed.hasFrontMatter,
		};
	}

	// 3. Extract editable area from HTML (Fragment/Full Document compatible)
	const selector = editableArea ?? 'body';
	log('Load content from %s', selector);

	// 4. Extract editable area (fragment compatible)
	const extraction = extractContentFromHtml(parsed.content, selector);

	if (extraction instanceof NoEditableAreaError) {
		return extraction;
	}

	// Return result containing Front Matter and editable content
	const result: LoadContentResult = {
		editableContent: extraction.content,
		frontMatter: parsed.data,
		originalFrontMatter: parsed.originalFrontMatter,
		hasFrontMatter: parsed.hasFrontMatter,
	};

	return result;
}

/**
 * Save content to HTML file (Front Matter compatible version)
 *
 * Processing order:
 * 1. Resolve Prettier configuration
 * 2. Process content based on editableArea:
 *    - If editableArea is null: Combine newContent with Front Matter (if provided)
 *    - If editableArea is not null:
 *      - Read existing file
 *      - Front Matter separation
 *      - Update HTML content in editable area
 *      - Front Matter combination (use provided data or maintain existing)
 * 3. Prettier formatting (after Front Matter combination)
 * 4. File saving
 * @param filePath File path
 * @param newContent New content
 * @param editableArea CSS selector for editable area (null for full content editing)
 * @param frontMatterData Front Matter data (optional)
 * @param originalFrontMatter Original Front Matter string (optional)
 */
export async function saveContent(
	filePath: string,
	newContent: string,
	editableArea: string | null,
	frontMatterData?: Record<string, unknown>,
	originalFrontMatter?: string,
) {
	// 1. Resolve Prettier configuration
	const prettierConfig = await resolveConfig(filePath);
	const prettierOptions = {
		parser: 'html',
		printWidth: 100_000,
		...prettierConfig,
	};

	let finalContent = newContent;

	// 2. Process content based on editableArea
	if (editableArea === null) {
		log('No editable area, saving full content');

		// Combine with Front Matter if provided
		if (frontMatterData && Object.keys(frontMatterData).length > 0) {
			finalContent = stringifyWithFrontMatter(
				newContent,
				frontMatterData,
				originalFrontMatter,
			);
		}
	} else {
		// 2-1. Read existing file
		const fileContent = await fs.readFile(filePath, 'utf8');

		// 2-2. Front Matter separation
		const parsed = parseFrontMatter(fileContent);
		log('Existing Front Matter parsed: hasFrontMatter=%s', parsed.hasFrontMatter);

		// 2-3. Update HTML (Fragment/Full Document compatible)
		const selector = editableArea ?? 'body';
		log('Save content to %s', selector);

		// 2-4. Update editable area (fragment compatible)
		const html = updateHtmlContent(parsed.content, selector, newContent);

		// 2-5. Front Matter combination (after HTML stringification, before Prettier)
		// Use new Front Matter data if provided, otherwise maintain existing
		const finalFrontMatterData = frontMatterData ?? parsed.data;
		const finalOriginalFrontMatter = originalFrontMatter ?? parsed.originalFrontMatter;

		finalContent = stringifyWithFrontMatter(
			html,
			finalFrontMatterData,
			finalOriginalFrontMatter,
		);
	}

	// 3. Format entire file after Front Matter combination
	finalContent = await format(finalContent, prettierOptions);

	// 4. Save file
	await fs.writeFile(filePath, finalContent, 'utf8');
}

class FileNotFoundError extends Error {
	readonly filePath: string;
	constructor(filePath: string) {
		super(`File not found: ${filePath}`);
		this.filePath = filePath;
	}
}
