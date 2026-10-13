import { z } from 'zod';

import * as h from '../../handlers.js';
import { defineAgentTool } from '../types.js';

const outputSchema = z.object({
	configPath: z.string().nullable(),
	documentRoot: z.string(),
	assetsRoot: z.string(),
	editableArea: z.string().nullable(),
	indexFileName: z.string(),
	virtualTree: z.object({ enabled: z.boolean(), pathKey: z.string() }),
	newFileContent: z.string(),
});

export const configResolveTool = defineAgentTool({
	name: 'config_resolve',
	description: 'Resolve and summarize the active burgereditor config. Read-only.',
	input: z.object({}),
	output: outputSchema,
	annotations: { readOnlyHint: true },
	run(ctx) {
		return Promise.resolve(h.configResolve(ctx));
	},
});
