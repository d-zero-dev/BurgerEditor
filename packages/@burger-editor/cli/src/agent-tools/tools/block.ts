import type { BlockSpec } from '../../block-builder.js';

import { NoEditableAreaError } from '@burger-editor/core';
import { loadContent, resolvePathInput, saveContent } from '@burger-editor/file-io';
import { z } from 'zod';

import * as h from '../../handlers.js';
import { applyBlockOpToHtml } from '../apply-block-op.js';
import { blockOpSchema } from '../block-op.js';
import { AgentError, toAgentError } from '../errors.js';
import { buildBlockDiff, finalizeMutation } from '../mutation-result.js';
import { issueReadToken, requireReadToken } from '../read-token.js';
import {
	blockSpecSchema,
	blockTargetSchema,
	dryRunArg,
	pathArg,
	readTokenArg,
} from '../schemas.js';
import { defineAgentTool } from '../types.js';

export const blockGetTool = defineAgentTool({
	name: 'block_get',
	description:
		"Get one block's structured data + HTML by target ({index} or {id}). Read-only — " +
		'call after page_blocks to inspect a specific block before mutating it.',
	input: z.object({ path: pathArg, target: blockTargetSchema, readToken: readTokenArg }),
	annotations: { readOnlyHint: true },
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		return await h.blockGet(ctx, args.path, args.target);
	},
});

export const blockInsertTool = defineAgentTool({
	name: 'block_insert',
	description:
		'Insert a new block at `index` (0 prepends, a value >= the block count appends). ' +
		'Requires readToken from page_blocks.',
	input: z.object({
		path: pathArg,
		index: z.number().int().nonnegative(),
		spec: blockSpecSchema,
		readToken: readTokenArg,
		dryRun: dryRunArg,
	}),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const write = await h.blockInsert(
			ctx,
			args.path,
			args.index,
			args.spec as BlockSpec,
			{
				dryRun: args.dryRun,
			},
		);
		if (write.dryRun) {
			const diff = await buildBlockDiff(
				ctx,
				args.path,
				null,
				args.index,
				write.previewContent!,
			);
			return { ...write, diff };
		}
		return await finalizeMutation(ctx, args.path, write, args.index);
	},
});

export const blockReplaceTool = defineAgentTool({
	name: 'block_replace',
	description:
		'Replace a block at target ({index} or {id}) with a new one. Requires readToken.',
	input: z.object({
		path: pathArg,
		target: blockTargetSchema,
		spec: blockSpecSchema,
		readToken: readTokenArg,
		dryRun: dryRunArg,
	}),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const blocks = await h.readBlocks(ctx, args.path);
		const index = h.resolveIndexInBlocks(blocks, args.target, args.path);
		const write = await h.blockReplace(
			ctx,
			args.path,
			args.target,
			args.spec as BlockSpec,
			{
				dryRun: args.dryRun,
			},
		);
		if (write.dryRun) {
			const diff = await buildBlockDiff(
				ctx,
				args.path,
				index,
				index,
				write.previewContent!,
			);
			return { ...write, diff };
		}
		return await finalizeMutation(ctx, args.path, write, index);
	},
});

export const blockDeleteTool = defineAgentTool({
	name: 'block_delete',
	description: 'Delete a block at target ({index} or {id}). Requires readToken.',
	input: z.object({
		path: pathArg,
		target: blockTargetSchema,
		readToken: readTokenArg,
		dryRun: dryRunArg,
	}),
	annotations: { destructiveHint: true },
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const blocks = await h.readBlocks(ctx, args.path);
		const index = h.resolveIndexInBlocks(blocks, args.target, args.path);
		const write = await h.blockDelete(ctx, args.path, args.target, {
			dryRun: args.dryRun,
		});
		if (write.dryRun) {
			// afterIndex is null — the deleted block no longer exists.
			const diff = await buildBlockDiff(
				ctx,
				args.path,
				index,
				null,
				write.previewContent!,
			);
			return { ...write, diff };
		}
		// afterIndex is null for the same reason — result.block is omitted.
		return await finalizeMutation(ctx, args.path, write, null);
	},
});

export const blockMoveTool = defineAgentTool({
	name: 'block_move',
	description:
		'Move a block from target ({index} or {id}) to `to` — the destination in the FINAL ' +
		'list (splice convention). Requires readToken.',
	input: z.object({
		path: pathArg,
		target: blockTargetSchema,
		to: z.number().int().nonnegative(),
		readToken: readTokenArg,
		dryRun: dryRunArg,
	}),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const blocks = await h.readBlocks(ctx, args.path);
		const fromIndex = h.resolveIndexInBlocks(blocks, args.target, args.path);
		const write = await h.blockMove(ctx, args.path, args.target, args.to, {
			dryRun: args.dryRun,
		});
		if (write.dryRun) {
			// A move doesn't change the block's content, only its position —
			// `before` is the block at its original index, `after` the same
			// content now at `to`. Passing `null` for beforeIndex (as if this
			// were an insert) would always report "nothing existed there
			// before", which is wrong for every move.
			const diff = await buildBlockDiff(
				ctx,
				args.path,
				fromIndex,
				args.to,
				write.previewContent!,
			);
			return { ...write, diff };
		}
		return await finalizeMutation(ctx, args.path, write, args.to);
	},
});

export const blockDuplicateTool = defineAgentTool({
	name: 'block_duplicate',
	description:
		'Duplicate a block right after itself (target: {index} or {id}). The copy has no id ' +
		'— call block_ensure_id on it if you need to address it stably. Requires readToken.',
	input: z.object({
		path: pathArg,
		target: blockTargetSchema,
		readToken: readTokenArg,
		dryRun: dryRunArg,
	}),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const blocks = await h.readBlocks(ctx, args.path);
		const index = h.resolveIndexInBlocks(blocks, args.target, args.path);
		const write = await h.blockDuplicate(ctx, args.path, args.target, {
			dryRun: args.dryRun,
		});
		if (write.dryRun) {
			const diff = await buildBlockDiff(
				ctx,
				args.path,
				null,
				index + 1,
				write.previewContent!,
			);
			return { ...write, diff };
		}
		return await finalizeMutation(ctx, args.path, write, index + 1);
	},
});

export const blockEnsureIdTool = defineAgentTool({
	name: 'block_ensure_id',
	description:
		"Assign a stable bge-<n> id to a block that doesn't have one yet, so you can address " +
		'it by id afterward instead of a shifting index. Idempotent — returns the existing id ' +
		'unchanged if the block already has one. Requires readToken.',
	input: z.object({ path: pathArg, target: blockTargetSchema, readToken: readTokenArg }),
	annotations: { idempotentHint: true },
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const result = await h.blockEnsureId(ctx, args.path, args.target);
		const filePath = resolvePathInput(args.path, ctx.config, ctx.resolverState);
		const readToken = await issueReadToken(args.path, filePath);
		return { ...result, readToken, appliedTo: 'disk' as const };
	},
});

export const itemUpdateTool = defineAgentTool({
	name: 'item_update',
	description:
		'Merge new data into one item within a block (target + itemIndex, DOM order). Shallow-' +
		"merges with the item's current data — omit fields you want unchanged. Requires readToken.",
	input: z.object({
		path: pathArg,
		target: blockTargetSchema,
		itemIndex: z.number().int().nonnegative(),
		data: z.record(z.string(), z.unknown()),
		readToken: readTokenArg,
		dryRun: dryRunArg,
	}),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const blocks = await h.readBlocks(ctx, args.path);
		const index = h.resolveIndexInBlocks(blocks, args.target, args.path);
		const write = await h.itemUpdate(
			ctx,
			args.path,
			args.target,
			args.itemIndex,
			args.data,
			{
				dryRun: args.dryRun,
			},
		);
		if (write.dryRun) {
			const diff = await buildBlockDiff(
				ctx,
				args.path,
				index,
				index,
				write.previewContent!,
			);
			return { ...write, diff };
		}
		return await finalizeMutation(ctx, args.path, write, index);
	},
});

export const pageUpdateTool = defineAgentTool({
	name: 'page_update',
	description:
		'Apply multiple pre-rendered block operations to a page in one call — NOT a batch of ' +
		'block_* spec objects: insert/replace ops need blockHtml (already-rendered HTML, e.g. ' +
		'from block_get or a prior dryRun), not `spec`. For spec-based edits, call block_insert ' +
		'/ block_replace individually instead. Ops run in order against the state left by the ' +
		'previous one — indexes shift as you insert/delete/move. All ops succeed and are ' +
		'written together, or none are: a failing op rejects the whole call and nothing is ' +
		'persisted. Requires readToken.',
	input: z.object({
		path: pathArg,
		ops: z.array(blockOpSchema).min(1),
		readToken: readTokenArg,
		dryRun: dryRunArg,
	}),
	annotations: {},
	async run(ctx, args) {
		await requireReadToken(ctx, args.path, args.readToken);
		const filePath = resolvePathInput(args.path, ctx.config, ctx.resolverState);
		const result = await loadContent(
			filePath,
			ctx.config.editableArea,
			ctx.config.newFileContent,
		);
		if (result instanceof NoEditableAreaError) {
			throw result;
		}
		const before = result.editableContent;
		let html = before;
		for (const [i, op] of args.ops.entries()) {
			// A failing op throws (via AgentError, like every other agent
			// tool — see register-agent-tools.ts) rather than returning a
			// success-shaped "partial failure" object. page_update never
			// calls saveContent until every op in the batch has applied
			// cleanly in memory, so a mid-batch failure genuinely persists
			// nothing; the thrown message says so explicitly since there is
			// no separate response field to carry that guarantee.
			let next: string | NoEditableAreaError;
			try {
				next = applyBlockOpToHtml(html, op);
			} catch (error) {
				throw new AgentError(
					toAgentError(error).code,
					`page_update op ${i} (${op.op}) failed: ${toAgentError(error).message} ` +
						'page_update is all-or-nothing — nothing from this call was persisted.',
				);
			}
			if (next instanceof NoEditableAreaError) {
				throw new AgentError(
					'no-such-area',
					`page_update op ${i} (${op.op}) failed: ${next.message} ` +
						'page_update is all-or-nothing — nothing from this call was persisted.',
				);
			}
			html = next;
		}
		if (args.dryRun) {
			return { path: args.path, dryRun: true, diff: { before, after: html } };
		}
		await saveContent(
			filePath,
			html,
			ctx.config.editableArea,
			result.frontMatter,
			result.originalFrontMatter,
		);
		const readToken = await issueReadToken(args.path, filePath);
		return {
			path: args.path,
			applied: args.ops.length,
			dryRun: false,
			readToken,
			appliedTo: 'disk' as const,
		};
	},
});
