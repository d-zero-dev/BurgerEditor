import { z } from 'zod';

/**
 * Mirrors `local`'s `isSafeLogicalPath` (route.tsx) so a traversing path is a
 * 400 schema error at the edge, before it ever reaches a handler. This is
 * defense in depth: `resolvePathInput` (`@burger-editor/file-io`) is the
 * actual containment check and rejects the RESOLVED path, which also catches
 * spellings this string test can't see (a virtual-tree entry registered with
 * a traversing disk path, an absolute path outside documentRoot, …).
 * @param input
 */
function hasNoTraversalSegments(input: string): boolean {
	if (input.includes('\0')) {
		return false;
	}
	return !input.split(/[/\\]/).some((segment) => segment === '.' || segment === '..');
}

export const pathArg = z
	.string()
	.refine(hasNoTraversalSegments, {
		message:
			'path must not contain "." or ".." segments or NUL bytes — only pages under documentRoot can be addressed',
	})
	.describe('Page path — either a real file path or a virtual/logical path');

/**
 * Every block-scoped tool addresses its target this way. `index` is the
 * block's position (unstable across insert/delete/move); `id` is stable —
 * see `block_ensure_id` for blocks that don't have one yet. `id` wins when
 * both are given.
 */
export const blockTargetSchema = z
	.object({
		index: z.number().int().nonnegative().optional(),
		id: z.string().optional(),
	})
	.refine((t) => t.index !== undefined || t.id !== undefined, {
		message: 'Block target must specify either "index" or "id".',
	});

export type BlockTargetInput = z.infer<typeof blockTargetSchema>;

export const blockSpecSchema = z
	.object({
		catalog: z.string().optional(),
		name: z.string().optional(),
		containerProps: z.record(z.string(), z.any()).optional(),
		classList: z.array(z.string()).optional(),
		style: z.record(z.string(), z.string()).optional(),
		items: z.array(z.array(z.any())).optional(),
	})
	.describe(
		'Block spec — `catalog` selects a catalog block template by name; ' +
			'`items` is a [[BlockItem]] structure where each item is `{name, data}`. ' +
			'Do not guess `name` or `data` fields — call catalog_list / catalog_get or ' +
			'item_schema first to see what exists in this project and what data it expects.',
	);

export const dryRunArg = z
	.boolean()
	.optional()
	.describe("Compute a diff without writing — see the result's `diff` field.");

/**
 * Deliberately optional at the schema level, even on tools where a token is
 * effectively required — the MCP SDK rejects a call missing a non-optional
 * field before `run()` ever sees it, as a generic "Invalid arguments"
 * protocol error. Omitting it here lets `requireReadToken` (in `run()`)
 * produce the richer `read-required` / `stale` response instead — complete
 * with a fresh `readToken` and a `currentBlocks` peek — for the one failure
 * mode every mutation-on-an-existing-page tool shares.
 */
export const readTokenArg = z
	.string()
	.optional()
	.describe('Token from the last page_blocks (or mutation) read of this exact page.');
