import { NoEditableAreaError } from './no-editable-area-error.js';

/**
 *
 * @param htmlContent HTML content
 */
export function isFullHtmlDocument(htmlContent: string): boolean {
	const trimmed = htmlContent.trim();
	if (/^<!DOCTYPE\s+html/i.test(trimmed)) return true;
	if (/^<html(?:\s|>)/i.test(trimmed)) return true;
	if (/<html(?:\s|>)/i.test(trimmed)) return true;
	return false;
}

/**
 *
 * @param htmlContent
 */
function parseHtml(htmlContent: string): Document {
	return new DOMParser().parseFromString(htmlContent, 'text/html');
}

/**
 *
 * @param doc
 */
function serializeDocument(doc: Document): string {
	const doctype = doc.doctype;
	const doctypeString = doctype
		? `<!DOCTYPE ${doctype.name}` +
			(doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : '') +
			(doctype.systemId ? ` "${doctype.systemId}"` : '') +
			'>\n'
		: '';
	return doctypeString + doc.documentElement.outerHTML;
}

/**
 *
 * @param htmlContent HTML content
 * @param selector CSS selector
 */
export function extractContentFromHtml(
	htmlContent: string,
	selector: string,
): { content: string; isFullDocument: boolean } | NoEditableAreaError {
	if (!htmlContent.trim()) {
		return { content: '', isFullDocument: false };
	}

	const isFullDocument = isFullHtmlDocument(htmlContent);

	try {
		return isFullDocument
			? extractFromFullDocument(htmlContent, selector)
			: extractFromFragment(htmlContent, selector);
	} catch (error) {
		if (error instanceof NoEditableAreaError) {
			return error;
		}
		throw error;
	}
}

/**
 *
 * @param htmlContent
 * @param selector
 */
function extractFromFullDocument(
	htmlContent: string,
	selector: string,
): { content: string; isFullDocument: boolean } {
	const doc = parseHtml(htmlContent);
	const element = doc.querySelector(selector);
	if (!element) {
		throw new NoEditableAreaError(selector);
	}
	return { content: element.innerHTML, isFullDocument: true };
}

/**
 *
 * @param htmlContent
 * @param selector
 */
function extractFromFragment(
	htmlContent: string,
	selector: string,
): { content: string; isFullDocument: boolean } {
	const tempHtml = `<html><body>${htmlContent}</body></html>`;
	const doc = parseHtml(tempHtml);
	const element = doc.querySelector(selector);
	if (!element) {
		throw new NoEditableAreaError(selector);
	}
	return { content: element.innerHTML, isFullDocument: false };
}

/**
 *
 * @param originalHtml Original HTML content
 * @param selector CSS selector
 * @param newContent New content
 */
export function updateHtmlContent(
	originalHtml: string,
	selector: string,
	newContent: string,
): string {
	return isFullHtmlDocument(originalHtml)
		? updateFullDocument(originalHtml, selector, newContent)
		: updateFragment(originalHtml, selector, newContent);
}

/**
 *
 * @param originalHtml
 * @param selector
 * @param newContent
 */
function updateFullDocument(
	originalHtml: string,
	selector: string,
	newContent: string,
): string {
	const doc = parseHtml(originalHtml);
	const element = doc.querySelector(selector) ?? doc.body;
	element.innerHTML = newContent;
	return serializeDocument(doc);
}

/**
 *
 * @param originalHtml
 * @param selector
 * @param newContent
 */
function updateFragment(
	originalHtml: string,
	selector: string,
	newContent: string,
): string {
	const tempHtml = `<html><body>${originalHtml}</body></html>`;
	const doc = parseHtml(tempHtml);
	const element = doc.querySelector(selector);
	if (!element) {
		throw new NoEditableAreaError(selector);
	}
	element.innerHTML = newContent;
	return doc.body.innerHTML;
}
