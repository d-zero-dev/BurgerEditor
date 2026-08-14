import { JSDOM } from 'jsdom';

/**
 * Parses HTML with jsdom and returns a `Disposable` scope that closes the
 * jsdom window on dispose. Without this, scanning many files (each creating
 * its own `JSDOM` instance) accumulates jsdom windows — and their timers —
 * for the lifetime of the process.
 * @param html - The HTML string to parse
 * @returns The parsed `dom`/`window`, plus `[Symbol.dispose]` to close it
 * @example
 * ```ts
 * using scope = openDom(html);
 * const elements = scope.dom.window.document.querySelectorAll('div');
 * // scope.window is closed automatically here
 * ```
 */
export function openDom(
	html: string,
): { readonly dom: JSDOM; readonly window: JSDOM['window'] } & Disposable {
	const dom = new JSDOM(html);
	return {
		dom,
		window: dom.window,
		[Symbol.dispose]() {
			dom.window.close();
		},
	};
}
