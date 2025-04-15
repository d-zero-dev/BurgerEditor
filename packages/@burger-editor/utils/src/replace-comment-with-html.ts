import { kebabCase } from './kebab-case.js';

/**
 *
 * @param html
 * @param templateSeed
 * @param dataConverter
 */
export function replaceCommentWithHTML<T extends string>(
	html: string,
	templateSeed: { [key in T]: string },
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	dataConverter?: (key: string, html: string, data: any) => string,
) {
	for (const [key, value] of Object.entries(templateSeed)) {
		const _key = kebabCase(key);
		const placeholder = new RegExp(`<!-- ${_key}({[^}]*})? -->`, 'g');
		html = html.replaceAll(placeholder, (_, attr) => {
			let html = value as string;
			if (dataConverter) {
				const data = attr ? JSON.parse(`${attr}`) : {};
				html = dataConverter ? dataConverter(key, html, data) : JSON.stringify(data);
			}
			return html;
		});
	}
	return html;
}
