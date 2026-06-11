import type { BlockData } from '../types.js';

import {
	extractContentFromHtml,
	isFullHtmlDocument,
	updateHtmlContent,
} from '../document/html-detection.js';
import { NoEditableAreaError } from '../document/no-editable-area-error.js';

import { parseHTMLToBlockData } from './parse-html-to-definition.js';

const BLOCK_SELECTOR = '[data-bge-container]';

export interface ListedBlock {
	readonly index: number;
	readonly data: BlockData;
	readonly html: string;
}

/**
 * Lift a stand-alone block of editable HTML into a parseable container,
 * returning the element list + serializer that re-encodes any structural edit.
 * @param htmlContent
 * @param editableArea
 * @param operate
 */
function withEditableScope<T>(
	htmlContent: string,
	editableArea: string | null,
	operate: (blocks: HTMLElement[], scope: HTMLElement) => T,
): T | NoEditableAreaError {
	const selector = editableArea ?? 'body';
	const isFullDocument = editableArea === null ? false : isFullHtmlDocument(htmlContent);

	const wrapped =
		editableArea === null || !isFullDocument
			? `<html><body>${
					editableArea === null
						? `<div data-bge-temp-scope>${htmlContent}</div>`
						: htmlContent
				}</body></html>`
			: htmlContent;

	const doc = new DOMParser().parseFromString(wrapped, 'text/html');

	const scopeSelector = editableArea === null ? '[data-bge-temp-scope]' : selector;
	const scope = doc.querySelector<HTMLElement>(scopeSelector);
	if (!scope) {
		return new NoEditableAreaError(selector);
	}

	const blocks = [...scope.querySelectorAll<HTMLElement>(`:scope > ${BLOCK_SELECTOR}`)];
	return operate(blocks, scope);
}

/**
 * Read mode: just iterate; no need to re-serialize.
 * @param htmlContent
 * @param editableArea
 */
export function listBlocks(
	htmlContent: string,
	editableArea: string | null,
): ListedBlock[] | NoEditableAreaError {
	return withEditableScope(htmlContent, editableArea, (blocks) =>
		blocks.map<ListedBlock>((el, index) => ({
			index,
			data: parseHTMLToBlockData(el),
			html: el.outerHTML,
		})),
	);
}

/**
 *
 * @param htmlContent
 * @param editableArea
 * @param index
 */
export function getBlock(
	htmlContent: string,
	editableArea: string | null,
	index: number,
): ListedBlock | NoEditableAreaError {
	const result = listBlocks(htmlContent, editableArea);
	if (result instanceof NoEditableAreaError) {
		return result;
	}
	const block = result[index];
	if (!block) {
		throw new RangeError(`Block index ${index} out of range (length=${result.length})`);
	}
	return block;
}

/**
 *
 * @param htmlContent
 * @param editableArea
 * @param mutate
 */
function rewriteScope(
	htmlContent: string,
	editableArea: string | null,
	mutate: (blocks: HTMLElement[], scope: HTMLElement) => void,
): string | NoEditableAreaError {
	if (editableArea === null) {
		const wrapped = `<html><body><div data-bge-temp-scope>${htmlContent}</div></body></html>`;
		const doc = new DOMParser().parseFromString(wrapped, 'text/html');
		const scope = doc.querySelector<HTMLElement>('[data-bge-temp-scope]');
		if (!scope) {
			return new NoEditableAreaError('document');
		}
		const blocks = [...scope.querySelectorAll<HTMLElement>(`:scope > ${BLOCK_SELECTOR}`)];
		mutate(blocks, scope);
		return scope.innerHTML;
	}

	const extracted = extractContentFromHtml(htmlContent, editableArea);
	if (extracted instanceof NoEditableAreaError) {
		return extracted;
	}

	const innerHtml = extracted.content;
	const wrapped = `<html><body><div data-bge-temp-scope>${innerHtml}</div></body></html>`;
	const doc = new DOMParser().parseFromString(wrapped, 'text/html');
	const scope = doc.querySelector<HTMLElement>('[data-bge-temp-scope]');
	if (!scope) {
		return new NoEditableAreaError(editableArea);
	}
	const blocks = [...scope.querySelectorAll<HTMLElement>(`:scope > ${BLOCK_SELECTOR}`)];
	mutate(blocks, scope);
	const updatedInner = scope.innerHTML;
	return updateHtmlContent(htmlContent, editableArea, updatedInner);
}

/**
 *
 * @param blockHtml
 */
function parseBlockHtml(blockHtml: string): HTMLElement {
	const doc = new DOMParser().parseFromString(
		`<html><body>${blockHtml}</body></html>`,
		'text/html',
	);
	const block = doc.body.querySelector<HTMLElement>(BLOCK_SELECTOR);
	if (!block) {
		throw new Error(
			'Provided block HTML does not contain a [data-bge-container] root element.',
		);
	}
	return block;
}

/**
 *
 * @param htmlContent
 * @param editableArea
 * @param atIndex
 * @param blockHtml
 */
export function insertBlock(
	htmlContent: string,
	editableArea: string | null,
	atIndex: number,
	blockHtml: string,
): string | NoEditableAreaError {
	return rewriteScope(htmlContent, editableArea, (blocks, scope) => {
		const newBlock = parseBlockHtml(blockHtml);
		const imported = scope.ownerDocument.importNode(newBlock, true);
		if (atIndex >= blocks.length) {
			scope.append(imported);
		} else if (atIndex <= 0) {
			scope.prepend(imported);
		} else {
			blocks[atIndex]!.before(imported);
		}
	});
}

/**
 *
 * @param htmlContent
 * @param editableArea
 * @param index
 * @param blockHtml
 */
export function replaceBlock(
	htmlContent: string,
	editableArea: string | null,
	index: number,
	blockHtml: string,
): string | NoEditableAreaError {
	return rewriteScope(htmlContent, editableArea, (blocks, scope) => {
		const target = blocks[index];
		if (!target) {
			throw new RangeError(`Block index ${index} out of range (length=${blocks.length})`);
		}
		const newBlock = parseBlockHtml(blockHtml);
		const imported = scope.ownerDocument.importNode(newBlock, true);
		target.replaceWith(imported);
	});
}

/**
 *
 * @param htmlContent
 * @param editableArea
 * @param index
 */
export function deleteBlock(
	htmlContent: string,
	editableArea: string | null,
	index: number,
): string | NoEditableAreaError {
	return rewriteScope(htmlContent, editableArea, (blocks) => {
		const target = blocks[index];
		if (!target) {
			throw new RangeError(`Block index ${index} out of range (length=${blocks.length})`);
		}
		target.remove();
	});
}

/**
 *
 * @param htmlContent
 * @param editableArea
 * @param fromIndex
 * @param toIndex
 */
export function moveBlock(
	htmlContent: string,
	editableArea: string | null,
	fromIndex: number,
	toIndex: number,
): string | NoEditableAreaError {
	return rewriteScope(htmlContent, editableArea, (blocks, scope) => {
		const target = blocks[fromIndex];
		if (!target) {
			throw new RangeError(
				`Block index ${fromIndex} out of range (length=${blocks.length})`,
			);
		}
		target.remove();
		const remaining = [
			...scope.querySelectorAll<HTMLElement>(`:scope > ${BLOCK_SELECTOR}`),
		];
		if (toIndex >= remaining.length) {
			scope.append(target);
		} else if (toIndex <= 0) {
			scope.prepend(target);
		} else {
			remaining[toIndex]!.before(target);
		}
	});
}

/**
 *
 * @param htmlContent
 * @param editableArea
 * @param index
 */
export function duplicateBlock(
	htmlContent: string,
	editableArea: string | null,
	index: number,
): string | NoEditableAreaError {
	return rewriteScope(htmlContent, editableArea, (blocks) => {
		const target = blocks[index];
		if (!target) {
			throw new RangeError(`Block index ${index} out of range (length=${blocks.length})`);
		}
		const clone = target.cloneNode(true) as HTMLElement;
		target.after(clone);
	});
}
