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
 *
 * @param filePath
 * @param editableArea
 * @param newFileContent
 */
export async function loadContent(
	filePath: string,
	editableArea: string | null,
	newFileContent: string,
): Promise<LoadContentResult | NoEditableAreaError> {
	const readFileContent = await fs.readFile(filePath, 'utf8').catch((error: unknown) => {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return new FileNotFoundError(filePath);
		}
		throw error;
	});

	let fileContent: string;
	if (readFileContent instanceof FileNotFoundError) {
		const dir = path.dirname(filePath);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(filePath, newFileContent, 'utf8');
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
 *
 * @param filePath
 * @param newContent
 * @param editableArea
 * @param frontMatterData
 * @param originalFrontMatter
 */
export async function saveContent(
	filePath: string,
	newContent: string,
	editableArea: string | null,
	frontMatterData?: Record<string, unknown>,
	originalFrontMatter?: string,
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
		// If the file disappeared between loadContent and saveContent (race
		// against another agent / git checkout), surface it as a clear
		// FileNotFoundError instead of letting the raw ENOENT bubble up
		// uncaught from fs.readFile.
		const fileContent = await fs.readFile(filePath, 'utf8').catch((error: unknown) => {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
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
