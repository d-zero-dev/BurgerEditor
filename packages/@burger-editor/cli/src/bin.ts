#!/usr/bin/env node

// User configs may `import { config } from 'dotenv'; config()` which prints a
// tip banner to stdout — that corrupts our JSON-only stdout contract. Silence
// dotenv before any user code (including cosmiconfig-loaded configs) runs.
process.env.DOTENV_CONFIG_QUIET = 'true';

// Likewise, any leaked stdout writes during config load must not contaminate
// the JSON payload we produce. Redirect them to stderr.
const realStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
	return process.stderr.write(chunk as never, ...(rest as []));
}) as typeof process.stdout.write;

import type { BlockSpec } from './block-builder.js';

import { parseCli } from '@d-zero/roar';

import { loadContext } from './context.js';
import * as h from './handlers.js';
import { writeErrorJson } from './output.js';
import { resolveSpec } from './spec-input.js';

const commands = {
	'page-list': { desc: 'List pages under documentRoot' },
	'page-get': { desc: 'Get raw page content with front matter' },
	'page-create': {
		desc: 'Create a new page (optionally with initial blocks via --spec*)',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON spec' },
			'spec-file': { type: 'string', desc: 'Path to a JSON spec file' },
		},
	},
	'page-delete': { desc: 'Delete a page file' },
	'page-rename': { desc: 'Rename / move a page file' },
	'page-copy': { desc: 'Copy a page file' },
	'page-concat': {
		desc: 'Append the editable content of source pages onto the target',
	},
	'front-matter-get': { desc: 'Get a page front matter' },
	'front-matter-set': {
		desc: 'Set a page front matter via --spec* (defaults to merge)',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON object' },
			'spec-file': { type: 'string', desc: 'Path to JSON file' },
			replace: {
				type: 'boolean',
				desc: 'Replace front matter entirely instead of merging',
			},
		},
	},
	'block-list': { desc: 'List blocks in a page' },
	'block-get': { desc: 'Get a single block by index' },
	'block-insert': {
		desc: 'Insert a block at a given index',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON block spec' },
			'spec-file': { type: 'string', desc: 'Path to JSON block spec' },
		},
	},
	'block-replace': {
		desc: 'Replace a block at a given index',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON block spec' },
			'spec-file': { type: 'string', desc: 'Path to JSON block spec' },
		},
	},
	'block-delete': { desc: 'Delete a block at a given index' },
	'block-move': { desc: 'Move a block from one index to another' },
	'catalog-list': { desc: 'List catalog block definitions available in this project' },
	'catalog-get': { desc: 'Get a single catalog block definition' },
	'item-list': { desc: 'List item names' },
	'item-schema': { desc: 'Get item editor template (so the agent can infer data keys)' },
	'style-options-list': {
		desc: 'List CSS bge-options custom property axes found in project stylesheets',
	},
	'container-options-list': { desc: 'List container layout option values (static)' },
	'config-resolve': { desc: 'Resolve and print the active burgereditor config summary' },
} as const;

/**
 *
 */
async function main() {
	const result = parseCli({
		name: '@burger-editor/cli',
		commands,
		onError: () => true,
	});
	const ctx = await loadContext();

	switch (result.command) {
		case 'page-list': {
			return await h.pageList(ctx);
		}
		case 'page-get': {
			return await h.pageGet(ctx, result.args[0]!);
		}
		case 'page-create': {
			const spec = (await resolveSpec(
				result.flags.spec,
				result.flags['spec-file'],
			)) as h.PageCreateOptions | null;
			return await h.pageCreate(ctx, result.args[0]!, spec ?? {});
		}
		case 'page-delete': {
			return await h.pageDelete(ctx, result.args[0]!);
		}
		case 'page-rename': {
			return await h.pageRename(ctx, result.args[0]!, result.args[1]!);
		}
		case 'page-copy': {
			return await h.pageCopy(ctx, result.args[0]!, result.args[1]!);
		}
		case 'page-concat': {
			return await h.pageConcat(ctx, result.args[0]!, result.args.slice(1));
		}
		case 'front-matter-get': {
			return await h.frontMatterGet(ctx, result.args[0]!);
		}
		case 'front-matter-set': {
			const patch = (await resolveSpec(
				result.flags.spec,
				result.flags['spec-file'],
			)) as Record<string, unknown> | null;
			if (!patch || typeof patch !== 'object') {
				throw new Error('front-matter-set requires a JSON object spec.');
			}
			return await h.frontMatterSet(ctx, result.args[0]!, patch, !result.flags.replace);
		}
		case 'block-list': {
			return await h.blockList(ctx, result.args[0]!);
		}
		case 'block-get': {
			return await h.blockGet(ctx, result.args[0]!, Number(result.args[1]));
		}
		case 'block-insert': {
			const spec = await resolveSpec(result.flags.spec, result.flags['spec-file']);
			if (!spec) throw new Error('block-insert requires a JSON block spec.');
			return await h.blockInsert(
				ctx,
				result.args[0]!,
				Number(result.args[1]),
				spec as BlockSpec,
			);
		}
		case 'block-replace': {
			const spec = await resolveSpec(result.flags.spec, result.flags['spec-file']);
			if (!spec) throw new Error('block-replace requires a JSON block spec.');
			return await h.blockReplace(
				ctx,
				result.args[0]!,
				Number(result.args[1]),
				spec as BlockSpec,
			);
		}
		case 'block-delete': {
			return await h.blockDelete(ctx, result.args[0]!, Number(result.args[1]));
		}
		case 'block-move': {
			return await h.blockMove(
				ctx,
				result.args[0]!,
				Number(result.args[1]),
				Number(result.args[2]),
			);
		}
		case 'catalog-list': {
			return h.catalogList(ctx);
		}
		case 'catalog-get': {
			return h.catalogGet(ctx, result.args[0]!);
		}
		case 'item-list': {
			return h.itemList();
		}
		case 'item-schema': {
			return h.itemSchema(result.args[0]!);
		}
		case 'style-options-list': {
			return await h.styleOptionsList(ctx);
		}
		case 'container-options-list': {
			return h.containerOptionsList();
		}
		case 'config-resolve': {
			return h.configResolve(ctx);
		}
		default: {
			throw new Error(`Unknown command`);
		}
	}
}

/**
 * `process.stdout.write` is non-blocking when stdout is a pipe; large payloads
 * (e.g. block-list with many blocks) get truncated at the 64 KiB OS pipe
 * buffer when we call `process.exit()` straight after. Await drain explicitly.
 * @param code
 * @param value
 */
async function emitAndExit(code: number, value?: unknown) {
	if (value !== undefined) {
		await new Promise<void>((resolve) => {
			const ok = realStdoutWrite(JSON.stringify(value) + '\n', () => resolve());
			if (ok) resolve();
		});
	}
	process.exit(code);
}

main()
	.then((value) => emitAndExit(0, value))
	.catch((error: unknown) => {
		writeErrorJson(error);
		process.exit(1);
	});
