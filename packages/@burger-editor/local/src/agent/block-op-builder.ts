import type { BlockOp, BlockTarget } from '@burger-editor/cli';
import type { ListedBlock } from '@burger-editor/core';

import { resolveIndexInBlocks } from '@burger-editor/cli';

/** Agent tool names whose disk implementation this hub can also relay to a live browser tab as `BlockOp`s. */
export const BROWSER_APPLICABLE_TOOLS = new Set([
	'block_insert',
	'block_replace',
	'block_delete',
	'block_move',
	'block_duplicate',
	'item_update',
	'page_update',
]);

/**
 * Translate one `block_*` / `item_update` / `page_update` tool call into the
 * `BlockOp`(s) `applyLiveBlockOp` (core, running in the browser) understands.
 * Index-addressed ops are resolved against `blocks` — the CURRENT disk-read
 * block list, which `agent/route.ts` re-reads under `readToken` before
 * calling this — so an `{ id }` target always maps to the right index even
 * if earlier ops in the same `page_update` batch shifted things.
 *
 * `block_insert` / `block_replace` need `blockHtml` pre-rendered by the
 * caller (`renderBlockHtml`) — this function has no catalog access, mirroring
 * `cli/src/agent-tools/block-op.ts`'s design note that `BlockOp` itself never
 * carries a `BlockSpec` for a browser to resolve.
 * @param toolName
 * @param args
 * @param blocks
 * @param pathInput
 * @param blockHtml
 */
export function buildBrowserOps(
	toolName: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	args: any,
	blocks: readonly ListedBlock[],
	pathInput: string,
	blockHtml?: string,
): readonly BlockOp[] {
	switch (toolName) {
		case 'block_insert': {
			return [{ op: 'insert', index: args.index as number, blockHtml: blockHtml! }];
		}
		case 'block_replace': {
			const index = resolveIndexInBlocks(blocks, args.target as BlockTarget, pathInput);
			return [{ op: 'replace', index, blockHtml: blockHtml! }];
		}
		case 'block_delete': {
			const index = resolveIndexInBlocks(blocks, args.target as BlockTarget, pathInput);
			return [{ op: 'delete', index }];
		}
		case 'block_move': {
			const index = resolveIndexInBlocks(blocks, args.target as BlockTarget, pathInput);
			return [{ op: 'move', from: index, to: args.to as number }];
		}
		case 'block_duplicate': {
			const index = resolveIndexInBlocks(blocks, args.target as BlockTarget, pathInput);
			return [{ op: 'duplicate', index }];
		}
		case 'item_update': {
			const index = resolveIndexInBlocks(blocks, args.target as BlockTarget, pathInput);
			return [
				{
					op: 'update-item',
					index,
					itemIndex: args.itemIndex as number,
					data: args.data as Record<string, unknown>,
				},
			];
		}
		case 'page_update': {
			return args.ops as readonly BlockOp[];
		}
		default: {
			return [];
		}
	}
}
