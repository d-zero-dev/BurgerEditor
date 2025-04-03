/**
 *
 * @param doc
 * @param url
 */
export function appendStylesheetTo(doc: Document, url: string) {
	const link = doc.createElement('link');
	link.rel = 'stylesheet';
	link.crossOrigin = 'anonymous';
	link.href = url;
	doc.head.append(link);
}
