import type { BlockOp } from '@burger-editor/core';

import { z } from 'zod';

const index = z.number().int().nonnegative();

/**
 * Validates the same `BlockOp` shape `@burger-editor/core`'s
 * `applyLiveBlockOp` accepts — the type itself is defined in `core`, not
 * here, because `core` needs it without depending on `cli`'s zod schema
 * (`cli` already depends on `core`, not the other way around). `page_update`
 * applies these to a page in one batch on disk (`apply-block-op.ts`'s
 * `applyBlockOpToHtml`); `local`'s WebSocket `apply` message relays the
 * same shape to a connected browser tab, which runs it through
 * `applyLiveBlockOp` on the live DOM instead.
 *
 * Deliberately NOT a generic `{ method, args }` envelope — that shape would
 * let anything able to reach the WebSocket invoke arbitrary methods on the
 * page's live editor. Naming one closed set of effects, each carrying only
 * the data that effect needs, closes that off. `blockHtml` is pre-rendered
 * by the disk-side tool (`renderBlockHtml`) before an op is constructed —
 * neither this schema nor the browser-side consumer resolves a catalog
 * entry itself.
 */
export const blockOpSchema: z.ZodType<BlockOp> = z.discriminatedUnion('op', [
	z.object({ op: z.literal('insert'), index, blockHtml: z.string() }),
	z.object({ op: z.literal('replace'), index, blockHtml: z.string() }),
	z.object({ op: z.literal('delete'), index }),
	z.object({ op: z.literal('move'), from: index, to: index }),
	z.object({ op: z.literal('duplicate'), index }),
	z.object({
		op: z.literal('update-item'),
		index,
		itemIndex: index,
		data: z.record(z.string(), z.unknown()),
	}),
	z.object({ op: z.literal('set-id'), index, id: z.string() }),
]);

export type { BlockOp } from '@burger-editor/core';
