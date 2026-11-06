import type {
	BlockCatalog,
	BlockData,
	BlockDefinition,
	Config,
} from '@burger-editor/core';
import type { BurgerEditorConfig } from '@burger-editor/file-io';

import { items as defaultItems } from '@burger-editor/blocks';
import { render, withConfigDefaults } from '@burger-editor/core';

import { assertItemsValid } from './assert-items-valid.js';

export interface BlockSpec {
	readonly catalog?: string;
	readonly name?: string;
	readonly containerProps?: BlockData['containerProps'];
	readonly classList?: readonly string[];
	readonly style?: Record<string, string>;
	readonly items?: BlockData['items'];
}

/**
 *
 * @param catalog
 * @param name
 */
export function findCatalogDefinition(
	catalog: BlockCatalog,
	name: string,
): BlockDefinition | null {
	for (const category of Object.keys(catalog)) {
		for (const entry of catalog[category] ?? []) {
			if (entry.definition.name === name) {
				return entry.definition;
			}
		}
	}
	return null;
}

/**
 *
 * @param spec
 * @param catalog
 */
export function buildBlockData(spec: BlockSpec, catalog: BlockCatalog): BlockData {
	let template: BlockDefinition | null = null;
	if (spec.catalog) {
		template = findCatalogDefinition(catalog, spec.catalog);
		if (!template) {
			throw new Error(`Unknown catalog block name: "${spec.catalog}"`);
		}
	}
	const name = spec.name ?? template?.name ?? spec.catalog;
	if (!name) {
		throw new Error('Block spec must include "name" or "catalog".');
	}
	return {
		name,
		containerProps: spec.containerProps ?? template?.containerProps ?? {},
		classList: spec.classList ?? template?.classList,
		style: spec.style ?? template?.style,
		items: spec.items ?? template?.items ?? [],
	};
}

/**
 * The keys of the project config that `render()` and an item's
 * `normalizeItemData` read. Callers that only have a part of the config (the
 * pure-HTML block operations) can pass just these.
 * @example
 * ```ts
 * const source: CoreConfigSource = { mediaQueries: ['(max-width: 599px)'] };
 * const config = toCoreConfig(source);
 * ```
 */
export type CoreConfigSource = Partial<
	Pick<
		BurgerEditorConfig,
		| 'classList'
		| 'stylesheets'
		| 'sampleImagePath'
		| 'sampleFilePath'
		| 'googleMapsApiKey'
		| 'mediaQueries'
	>
>;

/**
 * Build the core `Config` that `render()` and an item's `normalizeItemData`
 * read, from the project config. Keys that are missing become empty values, so
 * the settings with a default (such as `mediaQueries`) fall back to it.
 * @param config - The project config, or just the keys the caller has
 * @example
 * ```ts
 * toCoreConfig({ mediaQueries: ['(max-width: 599px)'] }).mediaQueries;
 * // ['(max-width: 599px)']
 * ```
 */
export function toCoreConfig(config: CoreConfigSource | undefined): Config {
	// The empty defaults live in core's withConfigDefaults (the values render()
	// uses). Only stylesheets differ in shape here (paths → { path } objects).
	return withConfigDefaults({
		classList: config?.classList,
		stylesheets: config?.stylesheets?.map((path) => ({ path })),
		sampleImagePath: config?.sampleImagePath,
		sampleFilePath: config?.sampleFilePath,
		googleMapsApiKey: config?.googleMapsApiKey,
		mediaQueries: config?.mediaQueries,
	});
}

/**
 * Render a block spec to HTML, refusing a block whose items would be saved in a
 * state the editor's "OK" refuses (a link or popup image without an alt, a
 * carousel slide without a name). `block_insert` / `block_replace` / `page_create`
 * and the browser relay of the first two all go through this.
 * @param spec - The block an agent described
 * @param config - The project config
 * @throws {Error} When an item of the block must not be saved (see `assertItemsValid`)
 * @example
 * ```ts
 * const blockHtml = await renderBlockHtml({ catalog: 'carousel' }, ctx.config);
 * ```
 */
export async function renderBlockHtml(
	spec: BlockSpec,
	config: BurgerEditorConfig,
): Promise<string> {
	const data = buildBlockData(spec, config.catalog);
	const coreConfig = toCoreConfig(config);
	const el = await render(data, { items: defaultItems, config: coreConfig });
	// Checked on what was rendered (after `normalizeItemData`)
	assertItemsValid(el.querySelectorAll<HTMLElement>('[data-bgi]'), coreConfig);
	return el.outerHTML;
}
