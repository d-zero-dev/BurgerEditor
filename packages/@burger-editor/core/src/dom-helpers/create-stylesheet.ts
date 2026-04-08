/**
 *
 * @param cssContents
 * @param layer
 */
export function createStylesheet(cssContents: string, layer?: string): string {
	const css = layer ? `@layer ${layer} {${cssContents}}` : cssContents;
	const blob = new Blob([css], { type: 'text/css' });
	const url = URL.createObjectURL(blob);
	return url;
}
