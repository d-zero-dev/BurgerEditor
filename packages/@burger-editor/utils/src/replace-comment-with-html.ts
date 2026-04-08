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
	let iteration = 0;
	const replacements = new Map<
		string,
		[key: string, itemTemplate: string, attrData: string]
	>();
	for (const [key, itemTemplate] of Object.entries(templateSeed)) {
		const _key = kebabCase(key);
		const placeholder = new RegExp(`<!-- ${_key}({[^}]*})? -->`, 'g');

		html = html.replaceAll(placeholder, (_, attr) => {
			const marker = `<!-- __MARKER__${iteration} -->`;
			replacements.set(marker, [key, itemTemplate as string, attr]);
			iteration++;
			return marker;
		});
	}

	html = html.replaceAll(/<!-- __MARKER__(\d+) -->/g, (_, iteration) => {
		const replacement = replacements.get(`<!-- __MARKER__${iteration} -->`);
		if (!replacement) {
			return '';
		}
		const [key, itemTemplate, attr] = replacement;
		let itemHtml = itemTemplate;
		if (dataConverter) {
			const data = attr ? JSON.parse(`${attr}`) : {};
			itemHtml = dataConverter(key, itemTemplate, data);
		}
		return itemHtml;
	});
	return html;
}
