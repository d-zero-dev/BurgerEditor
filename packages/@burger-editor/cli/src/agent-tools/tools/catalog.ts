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
		'List CSS `--bge-options-<axis>--<variant>` axes discoverable in project stylesheets. Read-only.',
	input: z.object({}),
	annotations: { readOnlyHint: true },
	async run(ctx) {
		return await h.styleOptionsList(ctx);
	},
});

export const containerOptionsListTool = defineAgentTool({
	name: 'container_options_list',
	description: 'List static container layout options (grid/inline/float). Read-only.',
	input: z.object({}),
	annotations: { readOnlyHint: true },
	run() {
		return Promise.resolve(h.containerOptionsList());
	},
});
