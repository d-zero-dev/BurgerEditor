import type { LoadContentResult } from '@burger-editor/core';

import fs from 'node:fs/promises';
import path from 'node:path';

import {
	extractContentFromHtml,
	NoEditableAreaError,
	parseFrontMatter,
	stringifyWithFrontMatter,
	updateHtmlContent,
} from '@burger-editor/core';
import { format, resolveConfig } from 'prettier';

class FileNotFoundError extends Error {
	readonly filePath: string;
	constructor(filePath: string) {
		super(`File not found: ${filePath}`);
		this.filePath = filePath;
	}
}

/**
 * Options for {@link loadContent}.
 */
export interface LoadContentOptions {
	/**
	 * Whether a missing file is written to disk with `newFileContent` before
	 * it is returned. Defaults to `true`. With `false` the content is still
	 * built from `newFileContent`, but nothing is written — for callers that
	 * only show the page (e.g. opening it in the editor) and leave creating
	 * the file to the first save.
	 */
	readonly createMissingFile?: boolean;
}

/**
 * Options for {@link saveContent}.
 */
export interface SaveContentOptions {
	/**
	 * Template used as the surrounding HTML when the file does not exist yet
	 * and an `editableArea` is given. Without it, a missing file makes
	 * `saveContent` throw {@link FileNotFoundError}.
	 */
	readonly newFileContent?: string;
}

/**
 * Read a page and pull out its editable area and Front Matter. A missing
 * file is treated as `newFileContent`, and is also written to disk unless
 * `options.createMissingFile` is `false`.
 * @param filePath
 * @param editableArea
 * @param newFileContent
 * @param options
 * @example
 * ```ts
 * // Show a page without creating it on disk when it doesn't exist yet
 * const result = await loadContent(filePath, '.content', template, {
 * 	createMissingFile: false,
 * });
 * ```
 */
export async function loadContent(
	filePath: string,
	editableArea: string | null,
	newFileContent: string,
	options: LoadContentOptions = {},
): Promise<LoadContentResult | NoEditableAreaError> {
	const { createMissingFile = true } = options;
	const readFileContent = await fs.readFile(filePath, 'utf8').catch((error: unknown) => {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return new FileNotFoundError(filePath);
		}
		throw error;
	});

	let fileContent: string;
	if (readFileContent instanceof FileNotFoundError) {
		if (createMissingFile) {
			const dir = path.dirname(filePath);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(filePath, newFileContent, 'utf8');
		}
		fileContent = newFileContent;
	} else {
		fileContent = readFileContent;
	}

	const parsed = parseFrontMatter(fileContent);

	if (editableArea === null) {
		return {
			editableContent: parsed.content,
			frontMatter: parsed.data,
			originalFrontMatter: parsed.originalFrontMatter,
			hasFrontMatter: parsed.hasFrontMatter,
		};
	}

	const extraction = extractContentFromHtml(parsed.content, editableArea);
	if (extraction instanceof NoEditableAreaError) {
		return extraction;
	}

	return {
		editableContent: extraction.content,
		frontMatter: parsed.data,
		originalFrontMatter: parsed.originalFrontMatter,
		hasFrontMatter: parsed.hasFrontMatter,
	};
}

/**
 * Write `newContent` into a page's editable area (or as the whole page when
 * `editableArea` is `null`), keeping the rest of the file and its Front
 * Matter, and format the result with Prettier.
 * @param filePath
 * @param newContent
 * @param editableArea
 * @param frontMatterData
 * @param originalFrontMatter
 * @param options
 * @example
 * ```ts
 * // Create the page from the template on its first save
 * await saveContent(filePath, '<h1>Home</h1>', '.content', undefined, undefined, {
 * 	newFileContent: template,
 * });
 * ```
 */
export async function saveContent(
	filePath: string,
	newContent: string,
	editableArea: string | null,
	frontMatterData?: Record<string, unknown>,
	originalFrontMatter?: string,
	options: SaveContentOptions = {},
): Promise<void> {
	const prettierConfig = await resolveConfig(filePath);
	const prettierOptions = {
		parser: 'html',
		printWidth: 100_000,
		...prettierConfig,
	};

	let finalContent = newContent;

	if (editableArea === null) {
		if (frontMatterData && Object.keys(frontMatterData).length > 0) {
			finalContent = stringifyWithFrontMatter(
				newContent,
				frontMatterData,
				originalFrontMatter,
			);
		}
	} else {
		// A missing file is either not created yet (the caller passes
		// `newFileContent` to build it from) or disappeared between
		// loadContent and saveContent (race against another agent / git
		// checkout). Surface the latter as a clear FileNotFoundError instead
		// of letting the raw ENOENT bubble up uncaught from fs.readFile.
		const fileContent = await fs.readFile(filePath, 'utf8').catch((error: unknown) => {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				if (options.newFileContent !== undefined) {
					return options.newFileContent;
				}
				throw new FileNotFoundError(filePath);
			}
			throw error;
		});
		const parsed = parseFrontMatter(fileContent);
		const html = updateHtmlContent(parsed.content, editableArea, newContent);
		const finalFrontMatterData = frontMatterData ?? parsed.data;
		const finalOriginalFrontMatter = originalFrontMatter ?? parsed.originalFrontMatter;
		finalContent = stringifyWithFrontMatter(
			html,
			finalFrontMatterData,
			finalOriginalFrontMatter,
		);
	}

	finalContent = await format(finalContent, prettierOptions);
	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(filePath, finalContent, 'utf8');
}

export { FileNotFoundError };
