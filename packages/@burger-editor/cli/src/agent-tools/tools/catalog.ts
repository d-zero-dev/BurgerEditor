import { z } from 'zod';

import * as h from '../../handlers.js';
import { defineAgentTool } from '../types.js';

export const catalogListTool = defineAgentTool({
	name: 'catalog_list',
	description: 'List catalog block definitions available in this project. Read-only.',
	input: z.object({}),
	annotations: { readOnlyHint: true },
	run(ctx) {
		return Promise.resolve(h.catalogList(ctx));
	},
});

export const catalogGetTool = defineAgentTool({
	name: 'catalog_get',
	description:
		'Get a single catalog block definition by name, with a ready-to-insert `template` for ' +
		'block_insert / block_replace `spec`. Read-only.',
	input: z.object({ name: z.string() }),
	annotations: { readOnlyHint: true },
	run(ctx, args) {
		return Promise.resolve(h.catalogGet(ctx, args.name));
	},
});

export const itemListTool = defineAgentTool({
	name: 'item_list',
	description: 'List item names available in this project. Read-only.',
	input: z.object({}),
	annotations: { readOnlyHint: true },
	run() {
		return Promise.resolve(h.itemList());
	},
});

export const itemSchemaTool = defineAgentTool({
	name: 'item_schema',
	description:
		"Get an item's editor template + camelCase dataKeys, so you know which fields " +
		'item_update / block spec `data` expects. Read-only.',
	input: z.object({ name: z.string() }),
	annotations: { readOnlyHint: true },
	run(_ctx, args) {
		return Promise.resolve(h.itemSchema(args.name));
	},
});

export const styleOptionsListTool = defineAgentTool({
	name: 'style_options_list',
	description:
		'List the style option axes (`--bge-options-<axis>--<variant>`) that the block options ' +
		'dialog offers for the project stylesheets, detected by the same rules as the editor. ' +
		'Pass `containerType` to get only the axes usable in that container type; axes prefixed ' +
		'`_<type>_` (e.g. `_grid_subgrid-gap`) keep the prefix in `spec.style`. Read-only.',
	input: z.object({ containerType: z.enum(h.CONTAINER_TYPES).optional() }),
	annotations: { readOnlyHint: true },
	async run(ctx, args) {
		return await h.styleOptionsList(ctx, args.containerType);
	},
});

export const containerOptionsListTool = defineAgentTool({
	name: 'container_options_list',
	description:
		'List container layout options (grid/inline/float). `gridOptions.repeatMinInlineSizeVariants` ' +
		'comes from the project stylesheets and is the value for ' +
		'`containerProps.repeatMinInlineSize`. Read-only.',
	input: z.object({}),
	annotations: { readOnlyHint: true },
	async run(ctx) {
		return await h.containerOptionsList(ctx);
	},
});
