import type { BlockSpec, CliContext } from '@burger-editor/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import * as h from '@burger-editor/cli';
import { z } from 'zod';

const pathArg = z
	.string()
	.describe('Page path — either a real file path or a virtual/logical path');

const blockSpecSchema = z
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
			'`items` is a [[BlockItem]] structure where each item is `{name, data}`.',
	);

/**
 *
 * @param value
 */
function asText(value: unknown) {
	return {
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(value, null, 2),
			},
		],
	};
}

/**
 * Cache the CliContext for the lifetime of this MCP server process. loadContext()
 * runs cosmiconfig + (when virtualTree is enabled) a full documentRoot scan —
 * expensive enough that paying it on every tool call adds O(files × calls) work
 * to an agent session. The cache is invalidated by `__resetV4ContextCache()` so
 * tests can swap fixtures.
 */
let cachedContextPromise: Promise<CliContext> | null = null;

/**
 *
 */
function getContext(): Promise<CliContext> {
	if (!cachedContextPromise) {
		cachedContextPromise = h.loadContext();
	}
	return cachedContextPromise;
}

/** Test-only: clear the per-process context cache. */
export function __resetV4ContextCache(): void {
	cachedContextPromise = null;
}

/**
 *
 * @param run
 */
async function withContext<T>(run: (ctx: CliContext) => Promise<T> | T): Promise<T> {
	const ctx = await getContext();
	return await run(ctx);
}

/**
 * Register v4 MCP tools — both the low-level 1:1 mapping of the CLI surface and
 * a small batch of high-level helpers (`update_page`, `duplicate_block`).
 * @param server
 */
export default function registerV4Tools(server: McpServer) {
	// ----- low-level page tools

	server.tool('page_list', 'List pages under documentRoot', {}, async () =>
		asText(await withContext((ctx) => h.pageList(ctx))),
	);

	server.tool(
		'page_get',
		'Get raw page content with front matter',
		{ path: pathArg },
		async ({ path }) => asText(await withContext((ctx) => h.pageGet(ctx, path))),
	);

	server.tool(
		'page_create',
		'Create a new page. Accepts optional frontMatter and initial blocks.',
		{
			path: pathArg,
			frontMatter: z.record(z.string(), z.any()).optional(),
			blocks: z.array(blockSpecSchema).optional(),
		},
		async ({ path, frontMatter, blocks }) =>
			asText(
				await withContext((ctx) =>
					h.pageCreate(ctx, path, {
						frontMatter,
						blocks: blocks as readonly BlockSpec[] | undefined,
					}),
				),
			),
	);

	server.tool('page_delete', 'Delete a page file', { path: pathArg }, async ({ path }) =>
		asText(await withContext((ctx) => h.pageDelete(ctx, path))),
	);

	server.tool(
		'page_rename',
		'Rename / move a page file',
		{ from: pathArg, to: pathArg },
		async ({ from, to }) =>
			asText(await withContext((ctx) => h.pageRename(ctx, from, to))),
	);

	server.tool(
		'page_copy',
		'Copy a page file',
		{ from: pathArg, to: pathArg },
		async ({ from, to }) => asText(await withContext((ctx) => h.pageCopy(ctx, from, to))),
	);

	server.tool(
		'page_concat',
		'Append editable content of source pages onto target page',
		{
			target: pathArg,
			sources: z.array(pathArg).min(1),
		},
		async ({ target, sources }) =>
			asText(await withContext((ctx) => h.pageConcat(ctx, target, sources))),
	);

	// ----- front matter

	server.tool(
		'front_matter_get',
		'Get a page front matter',
		{ path: pathArg },
		async ({ path }) => asText(await withContext((ctx) => h.frontMatterGet(ctx, path))),
	);

	server.tool(
		'front_matter_set',
		'Set a page front matter (merge by default; pass replace=true to overwrite)',
		{
			path: pathArg,
			patch: z.record(z.string(), z.any()),
			replace: z.boolean().optional(),
		},
		async ({ path, patch, replace }) =>
			asText(await withContext((ctx) => h.frontMatterSet(ctx, path, patch, !replace))),
	);

	// ----- blocks

	server.tool(
		'block_list',
		'List blocks in a page with metadata + structured item data',
		{ path: pathArg },
		async ({ path }) => asText(await withContext((ctx) => h.blockList(ctx, path))),
	);

	server.tool(
		'block_get',
		'Get a single block by index',
		{ path: pathArg, index: z.number().int().nonnegative() },
		async ({ path, index }) =>
			asText(await withContext((ctx) => h.blockGet(ctx, path, index))),
	);

	server.tool(
		'block_insert',
		'Insert a block at a given index (use 0 to prepend, large value to append)',
		{
			path: pathArg,
			atIndex: z.number().int().nonnegative(),
			spec: blockSpecSchema,
		},
		async ({ path, atIndex, spec }) =>
			asText(
				await withContext((ctx) => h.blockInsert(ctx, path, atIndex, spec as BlockSpec)),
			),
	);

	server.tool(
		'block_replace',
		'Replace a block at a given index',
		{
			path: pathArg,
			index: z.number().int().nonnegative(),
			spec: blockSpecSchema,
		},
		async ({ path, index, spec }) =>
			asText(
				await withContext((ctx) => h.blockReplace(ctx, path, index, spec as BlockSpec)),
			),
	);

	server.tool(
		'block_delete',
		'Delete a block at a given index',
		{ path: pathArg, index: z.number().int().nonnegative() },
		async ({ path, index }) =>
			asText(await withContext((ctx) => h.blockDelete(ctx, path, index))),
	);

	server.tool(
		'block_move',
		'Move a block from one index to another',
		{
			path: pathArg,
			from: z.number().int().nonnegative(),
			to: z.number().int().nonnegative(),
		},
		async ({ path, from, to }) =>
			asText(await withContext((ctx) => h.blockMove(ctx, path, from, to))),
	);

	// ----- catalog / item

	server.tool('catalog_list', 'List catalog block definitions', {}, async () =>
		asText(await withContext((ctx) => h.catalogList(ctx))),
	);

	server.tool(
		'catalog_get',
		'Get a single catalog block definition by name',
		{ name: z.string() },
		async ({ name }) => asText(await withContext((ctx) => h.catalogGet(ctx, name))),
	);

	server.tool('item_list', 'List item names', {}, () => asText(h.itemList()));

	server.tool(
		'item_schema',
		'Get item editor template (so the agent can infer required data keys)',
		{ name: z.string() },
		({ name }) => asText(h.itemSchema(name)),
	);

	// ----- style / container options

	server.tool(
		'style_options_list',
		'List CSS --bge-options-* axes and variants discoverable in project stylesheets',
		{},
		async () => asText(await withContext((ctx) => h.styleOptionsList(ctx))),
	);

	server.tool(
		'container_options_list',
		'List static container layout options (grid/inline/float)',
		{},
		() => asText(h.containerOptionsList()),
	);

	// ----- config

	server.tool(
		'config_resolve',
		'Resolve and print the active burgereditor config summary',
		{},
		async () => asText(await withContext((ctx) => h.configResolve(ctx))),
	);

	// ----- high-level helpers

	server.tool(
		'duplicate_block',
		'Duplicate a block (block-get followed by block-insert after the original)',
		{ path: pathArg, index: z.number().int().nonnegative() },
		async ({ path, index }) =>
			asText(
				await withContext(async (ctx) => {
					const got = await h.blockGet(ctx, path, index);
					// buildBlockData() in @burger-editor/cli does not propagate
					// `id` (BlockSpec has no `id` field), so id is dropped here
					// by the type system — the rendered insertion is id-free
					// and cannot collide with the original.
					const spec: BlockSpec = { ...got.block.data };
					return await h.blockInsert(ctx, path, index + 1, spec);
				}),
			),
	);

	server.tool(
		'update_page',
		'Apply multiple block operations to a page sequentially. Each operation runs against the latest state; downstream indexes shift as you insert/delete.',
		{
			path: pathArg,
			operations: z
				.array(
					z.discriminatedUnion('op', [
						z.object({
							op: z.literal('insert'),
							atIndex: z.number().int().nonnegative(),
							spec: blockSpecSchema,
						}),
						z.object({
							op: z.literal('replace'),
							index: z.number().int().nonnegative(),
							spec: blockSpecSchema,
						}),
						z.object({
							op: z.literal('delete'),
							index: z.number().int().nonnegative(),
						}),
						z.object({
							op: z.literal('move'),
							from: z.number().int().nonnegative(),
							to: z.number().int().nonnegative(),
						}),
					]),
				)
				.min(1),
		},
		async ({ path, operations }) =>
			asText(
				await withContext(async (ctx) => {
					const applied: Array<{ index: number; op: string }> = [];
					for (const [i, op] of operations.entries()) {
						switch (op.op) {
							case 'insert': {
								await h.blockInsert(ctx, path, op.atIndex, op.spec as BlockSpec);
								applied.push({ index: i, op: 'insert' });
								break;
							}
							case 'replace': {
								await h.blockReplace(ctx, path, op.index, op.spec as BlockSpec);
								applied.push({ index: i, op: 'replace' });
								break;
							}
							case 'delete': {
								await h.blockDelete(ctx, path, op.index);
								applied.push({ index: i, op: 'delete' });
								break;
							}
							case 'move': {
								await h.blockMove(ctx, path, op.from, op.to);
								applied.push({ index: i, op: 'move' });
								break;
							}
						}
					}
					return { path, applied };
				}),
			),
	);
}
