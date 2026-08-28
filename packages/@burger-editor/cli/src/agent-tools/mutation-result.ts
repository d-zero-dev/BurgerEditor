import type { CliContext } from '../context.js';
import type { ListedBlock } from '@burger-editor/core';

import { NoEditableAreaError, listBlocks } from '@burger-editor/core';
import { resolvePathInput } from '@burger-editor/file-io';

import { readBlocks } from '../handlers.js';

import { issueReadToken } from './read-token.js';

interface DryRunLike {
	readonly dryRun: boolean;
	readonly previewContent?: string;
}

/**
 * Attach a fresh `readToken` (every mutation on a still-existing page
 * returns one, so the very next call needs no extra read) and, when
 * `afterIndex` names a still-existing block, that block's post-mutation
 * data under `result.block`. `afterIndex` is `null` for a mutation whose
 * target no longer exists afterward (`block_delete`). `result.block` is
 * block-mutation-only rather than a universal field on every tool's
 * response because page-level and Front-Matter mutations (`page_create`,
 * `page_delete`, `front_matter_set`, …) don't resolve to one block at all
 * — a universal field would be `undefined` on most of them, which is not
 * more informative than simply not having the field.
 * @param ctx
 * @param pathInput
 * @param write
 * @param afterIndex
 */
export async function finalizeMutation<T extends DryRunLike>(
	ctx: CliContext,
	pathInput: string,
	write: T,
	afterIndex: number | null,
): Promise<T & { readToken: string; appliedTo: 'disk'; block?: ListedBlock }> {
	const filePath = resolvePathInput(pathInput, ctx.config, ctx.resolverState);
	const readToken = await issueReadToken(pathInput, filePath);
	if (afterIndex === null) {
		return { ...write, readToken, appliedTo: 'disk' };
	}
	const blocks = await readBlocks(ctx, pathInput);
	const block = blocks[afterIndex];
	return { ...write, readToken, appliedTo: 'disk', ...(block && { block }) };
}

export interface BlockDiff {
	readonly before: string | null;
	readonly after: string | null;
}

/**
 * Compute the before/after HTML of a `dryRun: true` mutation's target block.
 * `beforeIndex` is `null` for a pure insert (nothing existed there yet);
 * `afterIndex` is `null` for a delete (nothing exists there anymore).
 * @param ctx
 * @param pathInput
 * @param beforeIndex
 * @param afterIndex
 * @param previewContent
 */
export async function buildBlockDiff(
	ctx: CliContext,
	pathInput: string,
	beforeIndex: number | null,
	afterIndex: number | null,
	previewContent: string,
): Promise<BlockDiff> {
	let before: string | null = null;
	if (beforeIndex !== null) {
		const blocks = await readBlocks(ctx, pathInput);
		before = blocks[beforeIndex]?.html ?? null;
	}
	let after: string | null = null;
	if (afterIndex !== null) {
		const previewBlocks = listBlocks(previewContent, null);
		if (!(previewBlocks instanceof NoEditableAreaError)) {
			after = previewBlocks[afterIndex]?.html ?? null;
		}
	}
	return { before, after };
}
