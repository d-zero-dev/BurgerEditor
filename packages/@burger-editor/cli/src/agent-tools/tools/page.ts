import fs from 'node:fs/promises';

import { resolvePathInput } from '@burger-editor/file-io';
import { z } from 'zod';

import * as h from '../../handlers.js';
import { issueReadToken, requireReadToken } from '../read-token.js';
import { blockSpecSchema, pathArg, readTokenArg } from '../schemas.js';
import { defineAgentTool } from '../types.js';

export const pageListTool = defineAgentTool({
	name: 'page_list',
	description:
		'List pages under documentRoot, plus invalidPages (files the resolver skipped).',
	input: z.object({}),
	annotations: { readOnlyHint: true },
	async run(ctx) {
		return await h.pageList(ctx);
	},
});

export const pageGetTool = defineAgentTool({
	name: 'page_get',
	description:
		"Get a page's raw file content (Front Matter included, as written on disk) and its " +
		'parsed Front Matter. Read-only — prefer page_blocks for structured block data.',
	input: z.object({ path: pathArg }),
	annotations: { readOnlyHint: true },
	async run(ctx, args) {
		return await h.pageGet(ctx, args.path);
	},
});

export const pageCreateTool = defineAgentTool({
	name: 'page_create',
	description:
		'Create a new page with optional Front Matter and initial blocks. Fails with `exists` ' +
		'if the path is already taken — no readToken needed since there is nothing to read yet.',
	input: z.object({
		path: pathArg,
		frontMatter: z.record(z.string(), z.any()).optional(),
		blocks: z.array(blockSpecSchema).optional(),
	}),
	annotations: {},
	async run(ctx, args) {
		const result = await h.pageCreate(ctx, args.path, {
			frontMatter: args.frontMatter,
			blocks: args.blocks,
		});
		const readToken = await issueReadToken(args.path, result.realPath);
		return { ...result, readToken, appliedTo: 'disk' as const };
	},
});

export const pageDeleteTool = defineAgentTool({
	name: 'page_delete',
	description: 'Delete a page file. Requires readToken from a prior read of this page.',
	input: z.object({ path: pathArg, readToken: readTokenArg }),
	annotations: { destructiveHint: true },
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const result = await h.pageDelete(ctx, args.path);
		// No readToken on the result — the page (and the token's target) no
		// longer exists.
		return { ...result, appliedTo: 'disk' as const };
	},
});

export const pageRenameTool = defineAgentTool({
	name: 'page_rename',
	description:
		'Rename / move a page file. Fails with `exists` if `to` is already taken — page_delete ' +
		'it first if you mean to overwrite. Requires readToken for `from`.',
	input: z.object({ from: pathArg, to: pathArg, readToken: readTokenArg }),
	annotations: { destructiveHint: true },
	async run(ctx, args) {
		await requireReadToken(ctx, args.from, args.readToken);
		const result = await h.pageRename(ctx, args.from, args.to);
		const toFilePath = resolvePathInput(args.to, ctx.config, ctx.resolverState);
		const readToken = await issueReadToken(args.to, toFilePath);
		return { ...result, readToken, appliedTo: 'disk' as const };
	},
});

export const pageCopyTool = defineAgentTool({
	name: 'page_copy',
	description:
		'Copy a page file. Fails with `exists` if `to` is already taken. Requires readToken for `from`.',
	input: z.object({ from: pathArg, to: pathArg, readToken: readTokenArg }),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.from, args.readToken);
		const result = await h.pageCopy(ctx, args.from, args.to);
		const toFilePath = resolvePathInput(args.to, ctx.config, ctx.resolverState);
		const readToken = await issueReadToken(args.to, toFilePath);
		return { ...result, readToken, appliedTo: 'disk' as const };
	},
});

const pageRefSchema = z.object({ path: pathArg, readToken: readTokenArg });

export const pageConcatTool = defineAgentTool({
	name: 'page_concat',
	description:
		"Append each source page's editable content onto `to`, in order. `to` is created from " +
		'the project template if absent, or updated in place if present (its readToken is then ' +
		'required). Requires readToken on every source.',
	input: z.object({
		sources: z.array(pageRefSchema).min(1),
		to: z.object({ path: pathArg, readToken: readTokenArg.optional() }),
	}),
	annotations: {},
	async run(ctx, args) {
		for (const source of args.sources) {
			await requireReadToken(ctx, source.path, source.readToken);
		}
		const toFilePath = resolvePathInput(args.to.path, ctx.config, ctx.resolverState);
		const toExists = await fs
			.access(toFilePath)
			.then(() => true)
			.catch(() => false);
		if (toExists) {
			await requireReadToken(ctx, args.to.path, args.to.readToken);
		}
		const result = await h.pageConcat(
			ctx,
			args.to.path,
			args.sources.map((s) => s.path),
		);
		const readToken = await issueReadToken(args.to.path, toFilePath);
		return { ...result, readToken, appliedTo: 'disk' as const };
	},
});
