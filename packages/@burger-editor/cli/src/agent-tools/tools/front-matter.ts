import { resolvePathInput } from '@burger-editor/file-io';
import { z } from 'zod';

import * as h from '../../handlers.js';
import { issueReadToken, requireReadToken } from '../read-token.js';
import { pathArg, readTokenArg } from '../schemas.js';
import { defineAgentTool } from '../types.js';

export const frontMatterGetTool = defineAgentTool({
	name: 'front_matter_get',
	description: 'Get a page Front Matter. Read-only.',
	input: z.object({ path: pathArg }),
	annotations: { readOnlyHint: true },
	async run(ctx, args) {
		return await h.frontMatterGet(ctx, args.path);
	},
});

export const frontMatterSetTool = defineAgentTool({
	name: 'front_matter_set',
	description:
		'Set a page Front Matter — merges by default, pass replace=true to overwrite entirely. ' +
		'Requires readToken.',
	input: z.object({
		path: pathArg,
		patch: z.record(z.string(), z.any()),
		replace: z.boolean().optional(),
		readToken: readTokenArg,
	}),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const result = await h.frontMatterSet(ctx, args.path, args.patch, !args.replace);
		const filePath = resolvePathInput(args.path, ctx.config, ctx.resolverState);
		const readToken = await issueReadToken(args.path, filePath);
		return { ...result, readToken, appliedTo: 'disk' as const };
	},
});
