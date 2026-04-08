/**
 *
 * @param doc
 * @param url
 * @param id
 */
export function appendStylesheetTo(doc: Document, url: string, id: string) {
	const link = doc.createElement('link');
	link.rel = 'stylesheet';
	link.crossOrigin = 'anonymous';
	link.href = `${url}#${id}`;
	doc.head.append(link);
}
