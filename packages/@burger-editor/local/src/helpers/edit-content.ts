import fs from 'node:fs/promises';
import path from 'node:path';

import { JSDOM } from 'jsdom';
import { format, resolveConfig } from 'prettier';

import { log } from './debug.js';

/**
 *
 * @param filePath
 * @param editableArea
 */
export async function loadContent(filePath: string, editableArea: string | null) {
	try {
		const content = await fs.readFile(filePath, 'utf8');
		if (editableArea === null) {
			log('No editable area');
			return content;
		}
		const dom = new JSDOM(content);
		const document = dom.window.document;
		const selector = editableArea ?? 'body';
		log('Load content from %s', selector);
		const contentDom = document.querySelector(selector);
		if (contentDom === null) {
			return new NoEditableAreaError(selector);
		}
		return contentDom.innerHTML;
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			log('ENOENT: File not found, create empty file');
			const dir = path.dirname(filePath);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(filePath, '', 'utf8');
			return '';
		}
		throw error;
	}
}

/**
 *
 * @param filePath
 * @param newContent
 * @param editableArea
 */
export async function saveContent(
	filePath: string,
	newContent: string,
	editableArea: string | null,
) {
	if (editableArea === null) {
		log('No editable area');
		await fs.writeFile(filePath, newContent, 'utf8');
		return;
	}
	const content = await fs.readFile(filePath, 'utf8');
	const dom = new JSDOM(content);
	const document = dom.window.document;
	const selector = editableArea ?? 'body';
	log('Save content to %s', selector);
	const contentDom = document.querySelector(selector) ?? document.body;
	contentDom.innerHTML = newContent;
	const config = await resolveConfig(filePath);
	let html = dom.serialize();
	html = await format(html, {
		parser: 'html',
		printWidth: 100_000,
		...config,
	});
	await fs.writeFile(filePath, html, 'utf8');
}

export class NoEditableAreaError extends Error {
	readonly selector: string;
	constructor(selector: string) {
		super(`Editable area not found: ${selector}`);
		this.selector = selector;
	}
}
