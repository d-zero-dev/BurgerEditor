/**
 * Append a `<link rel="stylesheet">` to a document's `<head>`.
 * @param doc - The target document
 * @param url - The stylesheet URL (often a blob URL)
 * @param id - A cache-busting fragment identifier appended to `url`
 * @example
 * ```ts
 * appendStylesheetTo(iframeDoc, blobUrl, 'block-menu-ui');
 * ```
 */
export function appendStylesheetTo(doc: Document, url: string, id: string) {
	const link = doc.createElement('link');
	link.rel = 'stylesheet';
	link.crossOrigin = 'anonymous';
	link.href = `${url}#${id}`;
	doc.head.append(link);
}
