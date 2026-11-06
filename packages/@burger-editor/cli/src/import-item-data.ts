import type { CoreConfigSource } from './block-builder.js';
import type { Config, ItemData, normalizeItemData } from '@burger-editor/core';

import { items as defaultItems } from '@burger-editor/blocks';
import { importItemHtml, normalizeItemHtml } from '@burger-editor/core';

import { toCoreConfig } from './block-builder.js';

/**
 * The item definition for a `[data-bgi]` wrapper, or `undefined` for an item
 * the standard items (`@burger-editor/blocks`) do not define.
 *
 * Why not the project's own items: the cli has no way to load a project's item
 * definitions, so a project-specific item is written without normalization.
 * @param wrapper
 */
function seedOf(wrapper: HTMLElement): Parameters<typeof normalizeItemData>[0] {
	const name = wrapper.dataset.bgi ?? '';
	// Only the items' own keys: `data-bgi="constructor"` must not reach Object.prototype
	return Object.hasOwn(defaultItems, name)
		? ((defaultItems as Record<string, unknown>)[name] as Parameters<
				typeof normalizeItemData
			>[0])
		: undefined;
}

let normalizedItemNames: readonly string[] | undefined;

/**
 * Whether `html` may hold an item whose definition has `normalizeItemData`.
 * A cheap text check that lets a writer skip parsing a block whose items need
 * no normalization (a text-only block, for example). It errs on the side of
 * "may": a name written with character references (`&#105;mage`) also counts.
 * @param html - Block HTML an agent wrote
 * @example
 * ```ts
 * if (mayHoldNormalizedItem(blockHtml)) {
 * 	// parse the block and normalize its items
 * }
 * ```
 */
export function mayHoldNormalizedItem(html: string): boolean {
	normalizedItemNames ??= Object.entries(defaultItems as Record<string, unknown>)
		.filter(
			([, seed]) =>
				typeof (seed as { normalizeItemData?: unknown })?.normalizeItemData ===
				'function',
		)
		.map(([name]) => name.toLowerCase());
	const lower = html.toLowerCase();
	if (!lower.includes('data-bgi')) {
		return false;
	}
	return lower.includes('&#') || normalizedItemNames.some((name) => lower.includes(name));
}

/**
 * Update one item wrapper in place — the disk-side equivalent of the browser's
 * `Item.import(data)`, through the same core `importItemHtml`: the current data
 * is read back from the wrapper's HTML, shallow-merged with `data`, passed
 * through the item's `normalizeItemData` (for example filling the empty
 * `media` of an image's second `<source>`), and re-rendered.
 * @param wrapper - The `[data-bgi]` element whose `innerHTML` holds the item
 * @param data - Arbitrary JSON from an agent call. It is not narrowed to
 * `ItemData` at this boundary: merged over the item's real current data (parsed
 * from its own template), which is what actually gets rendered.
 * @param config - The project config, for settings such as `mediaQueries`
 * @example
 * ```ts
 * importItemData(wrapper, { path: ['/a.png', '/b.png'] }, ctx.config);
 * ```
 */
export function importItemData(
	wrapper: HTMLElement,
	data: Record<string, unknown>,
	config: CoreConfigSource | undefined,
): void {
	wrapper.innerHTML = importItemHtml(
		wrapper.innerHTML,
		data as Partial<ItemData>,
		seedOf(wrapper),
		toCoreConfig(config),
	);
}

/**
 * Normalize an item wrapper that already holds HTML an agent wrote (a block
 * given to `page_update`'s `insert` / `replace`): read the item's data back,
 * pass it through the item's `normalizeItemData`, and re-render only when that
 * changed something. An item without `normalizeItemData` is not even read back,
 * and an item that needs no change keeps the HTML the agent wrote.
 * @param wrapper - The `[data-bgi]` element whose `innerHTML` holds the item
 * @param config - The core config (`toCoreConfig`). Build it once per block, not
 * once per item
 * @returns Whether the wrapper was rewritten
 * @example
 * ```ts
 * const coreConfig = toCoreConfig(ctx.config);
 * if (normalizeItemWrapper(wrapper, coreConfig)) {
 * 	// wrapper.innerHTML now has the normalized data
 * }
 * ```
 */
export function normalizeItemWrapper(wrapper: HTMLElement, config: Config): boolean {
	const html = normalizeItemHtml(wrapper.innerHTML, seedOf(wrapper), config);
	if (html === null) {
		return false;
	}
	wrapper.innerHTML = html;
	return true;
}
