import type {
	BlockCatalog,
	BlockData,
	BlockDefinition,
	Config,
} from '@burger-editor/core';
import type { BurgerEditorConfig } from '@burger-editor/file-io';

import { items as defaultItems } from '@burger-editor/blocks';
import { render } from '@burger-editor/core';

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
 *
 * @param spec
 * @param config
 */
export async function renderBlockHtml(
	spec: BlockSpec,
	config: BurgerEditorConfig,
): Promise<string> {
	const data = buildBlockData(spec, config.catalog);
	const renderConfig: Partial<Config> = {
		classList: config.classList,
		stylesheets: config.stylesheets.map((path) => ({ path })),
		sampleImagePath: config.sampleImagePath,
		sampleFilePath: config.sampleFilePath,
		googleMapsApiKey: config.googleMapsApiKey,
	};
	const el = await render(data, { items: defaultItems, config: renderConfig as Config });
	return el.outerHTML;
}
