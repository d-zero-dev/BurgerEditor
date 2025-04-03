import { marked } from 'marked';
import TurndownService from 'turndown';

/**
 *
 * @param markdown
 */
export function markdownToHtml(markdown: string) {
	return marked(markdown, {
		async: false,
	});
}

/**
 *
 * @param html
 */
export function htmlToMarkdown(html: string) {
	const turndownService = new TurndownService({
		headingStyle: 'atx',
		bulletListMarker: '-',
		codeBlockStyle: 'fenced',
	});
	return turndownService.turndown(html);
}
