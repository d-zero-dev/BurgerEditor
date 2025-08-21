import { JSDOM } from 'jsdom';

import { NoEditableAreaError } from './no-editable-area-error.js';

/**
 * Determine if HTML is a complete document or fragment
 * @param htmlContent HTML content
 * @returns true for complete document, false for fragment
 */
export function isFullHtmlDocument(htmlContent: string): boolean {
	const trimmed = htmlContent.trim();

	// Complete document if starts with DOCTYPE declaration
	if (/^<!DOCTYPE\s+html/i.test(trimmed)) {
		return true;
	}

	// Complete document if starts with <html> tag
	if (/^<html(?:\s|>)/i.test(trimmed)) {
		return true;
	}

	// Complete document if contains <html> tag
	if (/<html(?:\s|>)/i.test(trimmed)) {
		return true;
	}

	// Otherwise it's a fragment
	return false;
}

/**
 * Extract content from HTML by selector (fragment-compatible version)
 * @param htmlContent HTML content
 * @param selector CSS selector
 * @returns Extracted content and HTML type
 */
export function extractContentFromHtml(
	htmlContent: string,
	selector: string,
): { content: string; isFullDocument: boolean } | NoEditableAreaError {
	// Return empty string for empty files
	if (!htmlContent.trim()) {
		return { content: '', isFullDocument: false };
	}

	const isFullDocument = isFullHtmlDocument(htmlContent);

	try {
		if (isFullDocument) {
			// Use JSDOM as usual for complete HTML documents
			return extractFromFullDocument(htmlContent, selector);
		}

		// Special handling for HTML fragments
		return extractFromFragment(htmlContent, selector);
	} catch (error) {
		if (error instanceof NoEditableAreaError) {
			return error;
		}
		throw error;
	}
}

/**
 * Extract element from complete HTML document
 * @param htmlContent
 * @param selector
 */
function extractFromFullDocument(
	htmlContent: string,
	selector: string,
): { content: string; isFullDocument: boolean } {
	const dom = new JSDOM(htmlContent);
	const document = dom.window.document;
	const element = document.querySelector(selector);

	if (!element) {
		throw new NoEditableAreaError(selector);
	}

	return {
		content: element.innerHTML,
		isFullDocument: true,
	};
}

/**
 * Extract element from HTML fragment
 * @param htmlContent
 * @param selector
 */
function extractFromFragment(
	htmlContent: string,
	selector: string,
): { content: string; isFullDocument: boolean } {
	// Temporarily treat fragment as complete HTML while preserving original structure
	const tempHtml = `<html><body>${htmlContent}</body></html>`;
	const dom = new JSDOM(tempHtml);
	const document = dom.window.document;
	const element = document.querySelector(selector);

	if (!element) {
		throw new NoEditableAreaError(selector);
	}

	return {
		content: element.innerHTML,
		isFullDocument: false,
	};
}

/**
 * Update HTML with new content (fragment-compatible version)
 * @param originalHtml Original HTML content
 * @param selector CSS selector
 * @param newContent New content
 * @returns Updated HTML content
 */
export function updateHtmlContent(
	originalHtml: string,
	selector: string,
	newContent: string,
): string {
	const isFullDocument = isFullHtmlDocument(originalHtml);

	if (isFullDocument) {
		// For complete HTML documents
		return updateFullDocument(originalHtml, selector, newContent);
	} else {
		// For HTML fragments
		return updateFragment(originalHtml, selector, newContent);
	}
}

/**
 * Update complete HTML document
 * @param originalHtml
 * @param selector
 * @param newContent
 */
function updateFullDocument(
	originalHtml: string,
	selector: string,
	newContent: string,
): string {
	const dom = new JSDOM(originalHtml);
	const document = dom.window.document;
	const element = document.querySelector(selector) ?? document.body;

	element.innerHTML = newContent;
	return dom.serialize();
}

/**
 * Update HTML fragment
 * @param originalHtml
 * @param selector
 * @param newContent
 */
function updateFragment(
	originalHtml: string,
	selector: string,
	newContent: string,
): string {
	// Temporarily treat fragment as complete HTML
	const tempHtml = `<html><body>${originalHtml}</body></html>`;
	const dom = new JSDOM(tempHtml);
	const document = dom.window.document;
	const element = document.querySelector(selector);

	if (!element) {
		throw new NoEditableAreaError(selector);
	}

	element.innerHTML = newContent;

	// Get only the body content (fragment part)
	return document.body.innerHTML;
}
