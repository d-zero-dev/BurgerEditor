/**
 * Install a jsdom-backed DOM onto `globalThis` LAZILY so that
 * `@burger-editor/core` (which calls `document.createElement`, `new DOMParser()`,
 * uses `Range`, `instanceof HTMLElement`, etc.) can run outside the browser
 * WITHOUT paying the JSDOM startup cost on every CLI invocation.
 *
 * Strategy:
 *   - At module load: install accessor (getter) descriptors on globalThis for
 *     the well-known names core uses (document, DOMParser, HTMLElement, …).
 *   - On first access to ANY of those names: build JSDOM once, then replace
 *     every accessor with the resolved value (and copy every other own
 *     property + symbol of `window` onto globalThis).
 *
 * This means lightweight CLI commands (catalog-list, item-list,
 * container-options-list, config-resolve) pay zero JSDOM cost; heavyweight
 * commands (block-list, block-insert, page-create with initial blocks, …)
 * pay it once on the first DOM touch.
 *
 * Idempotent: skipped when a DOM is already present (e.g. inside vitest's
 * jsdom environment, or after this module already materialized).
 */
import type * as JsdomModule from 'jsdom';
import type { JSDOM } from 'jsdom';

import { createRequire } from 'node:module';

// createRequire lets us defer loading jsdom (its require chain itself is
// non-trivial) until first DOM access. Lazy import() would be async and can't
// be used inside a synchronous property getter.
const requireJsdom = createRequire(import.meta.url);

/**
 * Names installed as lazy getters at module load. Any access to one of these
 * triggers full DOM materialization (which then exposes the rest of jsdom's
 * window via the bulk copy in `materialize()`). Keep the list to the bare
 * minimum core actually touches — everything else gets pulled in on demand by
 * the bulk copy once any trigger fires.
 */
const TRIGGER_NAMES = [
	'document',
	'window',
	'DOMParser',
	'XMLSerializer',
	'HTMLElement',
	'Element',
	'Node',
	'Range',
	'CSSStyleDeclaration',
	'Event',
	'CustomEvent',
] as const;

let materialized = false;
let cachedWindow: Record<string | symbol, unknown> | null = null;

/**
 *
 */
function materialize(): Record<string | symbol, unknown> {
	if (cachedWindow) return cachedWindow;
	const { JSDOM: JSDOMCtor } = requireJsdom('jsdom') as typeof JsdomModule;
	const dom: JSDOM = new JSDOMCtor('', { pretendToBeVisual: true });
	cachedWindow = dom.window as unknown as Record<string | symbol, unknown>;
	return cachedWindow;
}

/**
 *
 * @param target
 */
function bulkCopyOnto(target: Record<string | symbol, unknown>): void {
	if (materialized) return;
	materialized = true;
	const win = materialize();

	for (const key of Object.getOwnPropertyNames(win)) {
		// Skip trigger names that are still accessor stubs — we'll overwrite
		// them with the real (data) descriptor below.
		if (key in target && !TRIGGER_NAMES.includes(key as (typeof TRIGGER_NAMES)[number])) {
			continue;
		}
		const desc = Object.getOwnPropertyDescriptor(win, key);
		if (desc) {
			Object.defineProperty(target, key, desc);
		}
	}

	for (const sym of Object.getOwnPropertySymbols(win)) {
		if (sym in target) continue;
		const desc = Object.getOwnPropertyDescriptor(win, sym);
		if (desc) {
			Object.defineProperty(target, sym, desc);
		}
	}

	// Node 24 may expose a non-writable `window` accessor; force-replace.
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

if ((globalThis as { document?: unknown }).document === undefined) {
	const target = globalThis as unknown as Record<string | symbol, unknown>;

	// Install a lazy accessor for each trigger name. The first access on any
	// of them materializes JSDOM, bulk-copies all of window's own properties
	// onto globalThis (overwriting these very accessors), and returns the
	// just-resolved value. No setter — direct assignment to these names
	// before materialization is not a supported pattern (and not used today).
	for (const name of TRIGGER_NAMES) {
		if (name in target) continue;
		Object.defineProperty(target, name, {
			configurable: true,
			get() {
				bulkCopyOnto(target);
				return target[name];
			},
		});
	}
}

/**
 * Force the lazy DOM to materialize now. Callers that batch many DOM-touching
 * operations can warm the cache up-front to avoid a perceptible pause on the
 * first access. Today nothing calls this; it exists for future hot paths.
 */
export function ensureDom(): void {
	if ((globalThis as { document?: unknown }).document !== undefined) {
		bulkCopyOnto(globalThis as unknown as Record<string | symbol, unknown>);
	}
}
