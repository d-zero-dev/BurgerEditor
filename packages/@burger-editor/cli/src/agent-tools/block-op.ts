import { z } from 'zod';

const index = z.number().int().nonnegative();

/**
 * The closed vocabulary of block-scoped mutations `page_update` applies to
 * a page in one batch (`apply-block-op.ts`'s `applyBlockOpToHtml`). This
 * same vocabulary is designed to double as the wire format for relaying a
 * mutation to a connected browser tab once that transport exists — which
 * is why it is deliberately NOT a generic `{ method, args }` envelope. A
 * generic envelope would let anything able to reach that transport invoke
 * arbitrary methods on the page's live editor; naming one closed set of
 * effects, each carrying only the data that effect needs, closes that off.
 * `blockHtml` is pre-rendered by the disk-side tool (`renderBlockHtml`)
 * before an op is constructed — neither this schema nor a future
 * browser-side consumer resolves a catalog entry itself.
 */
export const blockOpSchema = z.discriminatedUnion('op', [
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

export type BlockOp = z.infer<typeof blockOpSchema>;
