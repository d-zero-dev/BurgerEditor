/**
 * Install a jsdom-backed DOM onto `globalThis` so that `@burger-editor/core`
 * (which calls `document.createElement`, `new DOMParser()`, uses `Range`,
 * `instanceof HTMLElement`, etc.) can run outside the browser.
 *
 * Imported for side-effects from `./index.ts`. Idempotent: skipped when a DOM
 * is already present (e.g. inside vitest's jsdom environment, or after the
 * shim has run once).
 *
 * Mirrors vitest's `jsdom` environment: copy every own property of
 * `dom.window` onto `globalThis` rather than maintaining a hand-curated list.
 */
import { JSDOM } from 'jsdom';

if ((globalThis as { document?: unknown }).document === undefined) {
	const dom = new JSDOM('', { pretendToBeVisual: true });
	const win = dom.window as unknown as Record<string | symbol, unknown>;
	const target = globalThis as unknown as Record<string | symbol, unknown>;

	for (const key of Object.getOwnPropertyNames(win)) {
		if (key in target) continue;
		const desc = Object.getOwnPropertyDescriptor(win, key);
		if (desc) {
			Object.defineProperty(target, key, desc);
		}
	}

	// jsdom's window is not iterable for symbols via getOwnPropertyNames; copy
	// Symbol-keyed properties (e.g. Symbol.toStringTag) too.
	for (const sym of Object.getOwnPropertySymbols(win)) {
		if (sym in target) continue;
		const desc = Object.getOwnPropertyDescriptor(win, sym);
		if (desc) {
			Object.defineProperty(target, sym, desc);
		}
	}

	// Some platforms (e.g. Node 24) expose a non-writable `window` accessor on
	// globalThis. Use defineProperty so we override it without crashing.
	if (
		!('window' in target) ||
		Object.getOwnPropertyDescriptor(target, 'window')?.writable
	) {
		Object.defineProperty(target, 'window', {
			value: win,
			writable: true,
			configurable: true,
		});
	}
}
