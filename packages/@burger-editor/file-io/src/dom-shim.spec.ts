import { describe, expect, test } from 'vitest';

// Within the vitest `default` project we run under jsdom, so `document` is
// already present in globalThis. Importing dom-shim must NOT replace those
// pre-existing globals — vitest's environment owns them and overwriting
// would corrupt cross-test DOM state.
//
// Snapshot the pre-existing identities first, then trigger the side-effect
// import, then assert nothing visible changed.
const docBefore = globalThis.document;
const winBefore = (globalThis as { window?: unknown }).window;
const HTMLElementBefore = globalThis.HTMLElement;
const DOMParserBefore = globalThis.DOMParser;

await import('./dom-shim.js');

describe('dom-shim — idempotent under a pre-existing DOM', () => {
	test('does not replace the pre-existing document', () => {
		expect(globalThis.document).toBe(docBefore);
	});

	test('does not replace the pre-existing window', () => {
		expect((globalThis as { window?: unknown }).window).toBe(winBefore);
	});

	test('does not replace the pre-existing HTMLElement constructor', () => {
		expect(globalThis.HTMLElement).toBe(HTMLElementBefore);
	});

	test('does not replace the pre-existing DOMParser constructor', () => {
		expect(globalThis.DOMParser).toBe(DOMParserBefore);
	});

	test('a re-imported shim is still a no-op (second-call idempotency)', async () => {
		await import('./dom-shim.js');
		expect(globalThis.document).toBe(docBefore);
		expect(globalThis.HTMLElement).toBe(HTMLElementBefore);
	});

	test('DOMParser produced documents have the standard query API', () => {
		const doc = new DOMParser().parseFromString(
			'<html><body><p class="x">hi</p></body></html>',
			'text/html',
		);
		expect(doc.querySelector('.x')?.textContent).toBe('hi');
	});
});
