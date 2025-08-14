import type { LoadContentResult } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';

import { log } from './debug.js';
import { parseFrontMatter, stringifyWithFrontMatter } from './front-matter.js';
import { extractContentFromHtml, updateHtmlContent } from './html-detection.js';

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
 * @returns Result containing Front Matter and content
 */
export async function loadContent(
	filePath: string,
	editableArea: string | null,
): Promise<LoadContentResult | NoEditableAreaError> {
	try {
		// 1. File loading
		const fileContent = await fs.readFile(filePath, 'utf8');

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

		try {
			// 4. Extract editable area (fragment compatible)
			const extraction = extractContentFromHtml(parsed.content, selector);

			// Return result containing Front Matter and editable content
			const result: LoadContentResult = {
				editableContent: extraction.content,
				frontMatter: parsed.data,
				originalFrontMatter: parsed.originalFrontMatter,
				hasFrontMatter: parsed.hasFrontMatter,
			};

			return result;
		} catch (extractionError) {
			if (
				extractionError instanceof Error &&
				extractionError.message.includes('Selector not found')
			) {
				return new NoEditableAreaError(selector);
			}
			throw extractionError;
		}
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			log('ENOENT: File not found, create empty file');
			const dir = path.dirname(filePath);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(filePath, '', 'utf8');

			// Default result for empty files
			const result: LoadContentResult = {
				editableContent: '',
				frontMatter: {},
				originalFrontMatter: undefined,
				hasFrontMatter: false,
			};
			return result;
		}
		throw error;
	}
}

/**
 * Save content to HTML file (Front Matter compatible version)
 *
 * Processing order:
 * 1. Read existing file
 * 2. Front Matter separation
 * 3. HTML DOM parsing
 * 4. Update editable area
 * 5. Front Matter combination
 * 6. Prettier formatting (after Front Matter combination)
 * 7. File saving
 * @param filePath File path
 * @param newContent New content
 * @param editableArea CSS selector for editable area
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
	if (editableArea === null) {
		log('No editable area, saving full content');

		// Combine with Front Matter and save file if editableArea is null
		let finalContent: string;
		if (frontMatterData && Object.keys(frontMatterData).length > 0) {
			finalContent = stringifyWithFrontMatter(
				newContent,
				frontMatterData,
				originalFrontMatter,
			);
		} else {
			finalContent = newContent;
		}

		// Format entire file after Front Matter combination
		const config = await resolveConfig(filePath);
		finalContent = await format(finalContent, {
			parser: 'html',
			printWidth: 100_000,
			...config,
		});

		await fs.writeFile(filePath, finalContent, 'utf8');
		return;
	}

	// 1. Read existing file
	const fileContent = await fs.readFile(filePath, 'utf8');

	// 2. Front Matter separation
	const parsed = parseFrontMatter(fileContent);
	log('Existing Front Matter parsed: hasFrontMatter=%s', parsed.hasFrontMatter);

	// 3. Update HTML (Fragment/Full Document compatible)
	const selector = editableArea ?? 'body';
	log('Save content to %s', selector);

	// 4. Update editable area (fragment compatible)
	const html = updateHtmlContent(parsed.content, selector, newContent);

	// 5. Front Matter combination (after HTML stringification, before Prettier)
	// Use new Front Matter data if provided, otherwise maintain existing
	const finalFrontMatterData = frontMatterData ?? parsed.data;
	const finalOriginalFrontMatter = originalFrontMatter ?? parsed.originalFrontMatter;

	let finalContent = stringifyWithFrontMatter(
		html,
		finalFrontMatterData,
		finalOriginalFrontMatter,
	);

	// 6. Format entire file after Front Matter combination
	const config = await resolveConfig(filePath);
	finalContent = await format(finalContent, {
		parser: 'html',
		printWidth: 100_000,
		...config,
	});

	// 7. Save file
	await fs.writeFile(filePath, finalContent, 'utf8');
}

export class NoEditableAreaError extends Error {
	readonly selector: string;
	constructor(selector: string) {
		super(`Editable area not found: ${selector}`);
		this.selector = selector;
	}
}
