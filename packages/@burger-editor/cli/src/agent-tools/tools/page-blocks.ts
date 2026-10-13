/**
 * `page_blocks` — the one tool through which an agent reads a page's block
 * structure. It is a single two-call tool rather than a `block_list` /
 * `block_search` pair because choosing between listing and searching by
 * page size is a judgment call a small model gets wrong often enough to
 * matter; here the first call's `next` tells the agent exactly what to do,
 * and a typical page (a few dozen blocks) is small enough to read whole,
 * so a search tool would rarely beat the model reading the full list.
 */

import { resolvePathInput } from '@burger-editor/file-io';
import { z } from 'zod';

import { readBlocks } from '../../handlers.js';
import { type BlockSummary, summarizeBlock } from '../block-summary.js';
import { AgentError } from '../errors.js';
import { issueReadToken, requireReadToken } from '../read-token.js';
import { pathArg } from '../schemas.js';
import { defineAgentTool } from '../types.js';

const filterSchema = z
	.object({
		text: z.string().optional(),
		regex: z.string().optional(),
		blockName: z.string().optional(),
		itemName: z.string().optional(),
		headingLevel: z.number().int().min(1).max(6).optional(),
	})
	.describe('Regex-level narrowing — semantic judgement stays with the agent.');

const rangeSchema = z
	.object({
		from: z.number().int().nonnegative(),
		to: z.number().int().nonnegative(),
	})
	.describe('Paginate a very long page: half-open [from, to).');

const inputSchema = z.object({
	path: pathArg,
	readToken: z
		.string()
		.optional()
		.describe(
			'Omit for the first call; pass the token you got back to receive all blocks.',
		),
	filter: filterSchema.optional(),
	range: rangeSchema.optional(),
});

/**
 * Blocks per response above which `page_blocks`' first call recommends
 * `filter-first` instead of `fetch-all`. Not a hard limit — the second call
 * still returns everything when asked; this only shapes the `next` hint so
 * a small model doesn't reflexively dump a huge page into context.
 */
const BLOCK_COUNT_HINT_THRESHOLD = 300;

/**
 * @param summary
 * @param filter
 */
function matchesFilter(
	summary: BlockSummary,
	filter: z.infer<typeof filterSchema>,
): boolean {
	if (filter.text && !summary.text.includes(filter.text)) {
		return false;
	}
	if (filter.regex) {
		let re: RegExp;
		try {
			re = new RegExp(filter.regex, 'u');
		} catch {
			throw new AgentError('invalid', `Invalid regex in filter.regex: ${filter.regex}`);
		}
		if (!re.test(summary.text)) {
			return false;
		}
	}
	if (filter.blockName && summary.name !== filter.blockName) {
		return false;
	}
	if (filter.itemName && !summary.itemNames.includes(filter.itemName)) {
		return false;
	}
	if (
		filter.headingLevel &&
		!summary.headings.some((h) => h.level === filter.headingLevel)
	) {
		return false;
	}
	return true;
}

/**
 * @param summaries
 */
function estimateTokens(summaries: readonly BlockSummary[]): number {
	// JSON length / 3 is a crude but sufficient proxy — this only feeds a
	// `fetch-all` vs `filter-first` hint, not a billing calculation.
	return Math.ceil(JSON.stringify(summaries).length / 3);
}

/**
 * A two-call protocol with a mandatory `readToken` round trip is a contract
 * every model follows identically (see the file-level JSDoc for why one
 * tool instead of list/search). The first call never inlines blocks (even
 * for a two-block page) so the response SHAPE never depends on page size —
 * a model that has only ever seen small pages must still know to pass
 * `readToken` back, which it will not reliably infer from a response that
 * looks complete already.
 *
 * Semantic narrowing (picking a target block by meaning) is left to the
 * model reading the full list — no embedding search. A typical page is a
 * few dozen blocks, comfortably inside context; an LLM judging relevance
 * directly is both simpler to implement and more accurate than maintaining
 * an embedding index for content that changes on every mutation.
 */
export const pageBlocksTool = defineAgentTool({
	name: 'page_blocks',
	description:
		"Read a page's blocks in two steps: call once with just `path` to get a block " +
		'count + readToken, then call again with that readToken to get the full block list ' +
		'(text/headings/item names, not full HTML). Call this before any block_* mutation.',
	input: inputSchema,
	annotations: { readOnlyHint: true },
	async run(ctx, args) {
		const filePath = resolvePathInput(args.path, ctx.config, ctx.resolverState);

		if (!args.readToken) {
			const blocks = await readBlocks(ctx, args.path);
			const summaries = blocks.map((b) => summarizeBlock(b));
			const readToken = await issueReadToken(args.path, filePath);
			const recommendation =
				blocks.length > BLOCK_COUNT_HINT_THRESHOLD ? 'filter-first' : 'fetch-all';
			return {
				blockCount: blocks.length,
				approxTokens: estimateTokens(summaries),
				recommendation,
				readToken,
				next:
					`Call page_blocks again with readToken to receive all ${blocks.length} blocks. ` +
					'Pass the same readToken to any block_* mutation.',
			};
		}

		await requireReadToken(ctx, args.path, args.readToken);
		const blocks = await readBlocks(ctx, args.path);
		let summaries = blocks.map((b) => summarizeBlock(b));
		if (args.filter) {
			summaries = summaries.filter((s) => matchesFilter(s, args.filter!));
		}
		if (args.range) {
			const { from, to } = args.range;
			summaries = summaries.filter((s) => s.index >= from && s.index < to);
		}
		const readToken = await issueReadToken(args.path, filePath);
		return { readToken, blocks: summaries };
	},
});
