/**
 *
 * @param url
 * @param layer
 */
export async function createStylesheetFromUrl(
	url: string,
	layer: string,
): Promise<string> {
	const response = await fetch(url);
	const cssContents = await response.text();
	const css = layer ? `@layer ${layer} {${cssContents}}` : cssContents;
	const blob = new Blob([css], { type: 'text/css' });
	const blobUrl = URL.createObjectURL(blob);
	return blobUrl;
}
