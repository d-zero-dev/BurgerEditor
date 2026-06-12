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
 * Walk the body's descendant elements and collect selectors that *do* match,
 * up to `limit`. Used to surface "did you mean…?" hints alongside
 * `NoEditableAreaError` so a typo in `editableArea` isn't a dead end.
 *
 * Prefers selectors that look like editable-area roots: id, then class on a
 * top-level element. Falls back to tag-with-class on shallow descendants.
 * @param doc
 * @param limit
 */
export function collectCandidateSelectors(doc: Document, limit = 5): string[] {
	const out = new Set<string>();
	const root = doc.body ?? doc.documentElement;
	if (!root) return [];
	// Walk top-level + one level deep.
	const candidates: Element[] = [];
	for (const top of root.children) {
		candidates.push(top);
		for (const child of top.children) candidates.push(child);
		if (candidates.length > 30) break;
	}
	for (const el of candidates) {
		if (out.size >= limit) break;
		if (el.id) {
			out.add(`#${el.id}`);
			continue;
		}
		const cls = [...el.classList][0];
		if (cls) {
			out.add(`.${cls}`);
		}
	}
	return [...out];
}

/**
 *
 * @param doc
 */
function serializeDocument(doc: Document): string {
	const doctype = doc.doctype;
	let doctypeString = '';
	if (doctype) {
		// Per the HTML serialization spec:
		//   - "<!DOCTYPE " + name
		//   - if publicId is non-empty:   ' PUBLIC "<publicId>"' (and if systemId is
		//     also non-empty, append ' "<systemId>"' — no SYSTEM keyword needed
		//     because PUBLIC implies a systemId follows)
		//   - else if systemId is non-empty: ' SYSTEM "<systemId>"'
		//   - ">"
		// The old jsdom.serialize() emitted the SYSTEM keyword correctly for
		// SYSTEM-only DOCTYPEs (e.g. `<!DOCTYPE html SYSTEM "about:legacy-compat">`).
		doctypeString = `<!DOCTYPE ${doctype.name}`;
		if (doctype.publicId) {
			doctypeString += ` PUBLIC "${doctype.publicId}"`;
			if (doctype.systemId) {
				doctypeString += ` "${doctype.systemId}"`;
			}
		} else if (doctype.systemId) {
			doctypeString += ` SYSTEM "${doctype.systemId}"`;
		}
		doctypeString += '>\n';
	}
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
		throw new NoEditableAreaError(selector, collectCandidateSelectors(doc));
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
		throw new NoEditableAreaError(selector, collectCandidateSelectors(doc));
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
	const element = doc.querySelector(selector);
	// updateFragment throws on missing selector; do the same here so a typo in
	// editableArea fails loudly instead of silently rewriting the entire
	// <body> (which would destroy header / nav / scripts / etc.).
	if (!element) {
		throw new NoEditableAreaError(selector, collectCandidateSelectors(doc));
	}
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
		throw new NoEditableAreaError(selector, collectCandidateSelectors(doc));
	}
	element.innerHTML = newContent;
	return doc.body.innerHTML;
}
