import type * as JsdomModule from 'jsdom';

import { createRequire } from 'node:module';

import { EMPTY_CUSTOM_PROPERTY_VALUE } from '@burger-editor/core';

// Loaded on first call, like dom-shim.ts: commands that never read
// stylesheets should not pay jsdom's require cost.
const requireJsdom = createRequire(import.meta.url);

// Comments and strings are matched first and kept as they are, so only a
// real `--name: ;` declaration is rewritten. `--x:;` (no whitespace) is a
// parse error in browsers too, so it is left alone.
const EMPTY_CUSTOM_PROPERTY =
	/\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'|(--[^\s"'/:;{}]+\s*:)\s+(?=[;}])/g;

/**
 * Build a standalone jsdom document whose `styleSheets` are the given CSS
 * texts, in order, so that `@burger-editor/core`'s stylesheet scanners
 * (`getCustomProperties()` / `getRepeatMinInlineSizeVariants()`) can run on
 * Node against a project's CSS files.
 *
 * Each call returns a new document; the global DOM installed for `core` is
 * left untouched. Close its window (`doc.defaultView?.close()`) once the
 * scan is done. CSS parse errors are not reported (jsdom drops the
 * offending declarations, as browsers do). A custom property declared with
 * an empty value, which jsdom would drop, gets core's
 * `EMPTY_CUSTOM_PROPERTY_VALUE` instead, so `getCustomProperties` still
 * hides the option it overrides.
 * @param cssTexts - Stylesheet contents, earliest first
 * @returns A document holding one `<style>` element per text
 * @example
 * ```ts
 * import { getCustomProperties } from '@burger-editor/core';
 * import { createStylesheetDocument } from '@burger-editor/file-io';
 *
 * const doc = createStylesheetDocument([await fs.readFile('style.css', 'utf8')]);
 * try {
 * 	const categories = getCustomProperties(doc);
 * } finally {
 * 	doc.defaultView?.close();
 * }
 * ```
 */
export function createStylesheetDocument(cssTexts: readonly string[]): Document {
	const { JSDOM, VirtualConsole } = requireJsdom('jsdom') as typeof JsdomModule;
	const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
		virtualConsole: new VirtualConsole(),
	});
	const doc = dom.window.document;
	for (const css of cssTexts) {
		const style = doc.createElement('style');
		style.textContent = css.replaceAll(
			EMPTY_CUSTOM_PROPERTY,
			(match, declaration: string | undefined) =>
				declaration === undefined
					? match
					: `${declaration} ${EMPTY_CUSTOM_PROPERTY_VALUE}`,
		);
		doc.head.append(style);
	}
	return doc;
}
