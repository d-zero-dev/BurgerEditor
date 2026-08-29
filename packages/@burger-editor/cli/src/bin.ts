#!/usr/bin/env node

// User configs may `import { config } from 'dotenv'; config()` which prints a
// tip banner to stdout — that corrupts our JSON-only stdout contract. Silence
// dotenv before any user code (including cosmiconfig-loaded configs) runs.
process.env.DOTENV_CONFIG_QUIET = 'true';

import type { BlockSpec } from './block-builder.js';

import { parseCli } from '@d-zero/roar';

import { pageBlocksTool } from './agent-tools/tools/page-blocks.js';
import { loadContext } from './context.js';
import * as h from './handlers.js';
import { writeErrorJson } from './output.js';
import { silenceStdout } from './silence-stdout.js';
import { resolveSpec, type SpecResolution } from './spec-input.js';

// Capture the original stdout writer once. We swap process.stdout.write only
// during loadContext() (when user config files may print banners) and restore
// immediately after so library consumers — and any post-config legitimate
// stdout — see a normal channel. The cached reference is what we always use
// to emit the final JSON payload, immune to whatever the swap left behind.
const realStdoutWrite = process.stdout.write.bind(process.stdout);

/**
 *
 */
async function loadContextWithSilencedStdout(): ReturnType<typeof loadContext> {
	using _ = silenceStdout();
	return await loadContext();
}

// IMPORTANT — flag keys MUST be camelCase. roar derives the user-facing
// `--kebab-case` form automatically; if you define `'spec-file'` literally
// here, roar silently drops the flag entirely. (See @d-zero/roar's
// camelCase→kebab-case conversion contract.)
//
// Positional argument hints live in the `desc` string (roar's help generator
// doesn't carry positional info separately). Keep the `<usage>` suffix
// consistent so `<package-cli> <cmd> --help` reads like the project README.
const commands = {
	'page-list': {
		desc: 'List pages under documentRoot, plus invalidPages (resolver-skipped files)',
	},
	'page-get': {
		desc: 'Get raw page content + front matter — usage: page-get <path>',
	},
	'page-create': {
		desc: 'Create a new page (optional initial blocks via --spec*) — usage: page-create <path>',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON spec' },
			specFile: { type: 'string', desc: 'Path to a JSON spec file' },
		},
	},
	'page-delete': { desc: 'Delete a page file — usage: page-delete <path>' },
	'page-rename': { desc: 'Rename / move a page file — usage: page-rename <from> <to>' },
	'page-copy': { desc: 'Copy a page file — usage: page-copy <from> <to>' },
	'page-concat': {
		desc: 'Append editable content of sources onto target — usage: page-concat <target> <source...>',
	},
	'front-matter-get': {
		desc: 'Get a page front matter — usage: front-matter-get <path>',
	},
	'front-matter-set': {
		desc: 'Set a page front matter (merge by default; --replace to overwrite) — usage: front-matter-set <path>',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON object' },
			specFile: { type: 'string', desc: 'Path to JSON file' },
			replace: {
				type: 'boolean',
				desc: 'Replace front matter entirely instead of merging',
			},
		},
	},
	'page-blocks': {
		desc: 'List every block in a page (id/text/headings summary) — usage: page-blocks <path>',
	},
	'block-get': { desc: 'Get a single block by index — usage: block-get <path> <index>' },
	'block-insert': {
		desc: 'Insert a block at index — usage: block-insert <path> <atIndex>',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON block spec' },
			specFile: { type: 'string', desc: 'Path to JSON block spec' },
			dryRun: {
				type: 'boolean',
				desc: 'Compute the would-be HTML but do not write — returns previewContent',
			},
		},
	},
	'block-replace': {
		desc: 'Replace a block at index — usage: block-replace <path> <index>',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON block spec' },
			specFile: { type: 'string', desc: 'Path to JSON block spec' },
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-delete': {
		desc: 'Delete a block at index — usage: block-delete <path> <index>',
		flags: {
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-move': {
		desc: 'Move a block — usage: block-move <path> <from> <to> (to = destination in FINAL list, splice convention)',
		flags: {
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-duplicate': {
		desc: 'Duplicate a block right after itself — usage: block-duplicate <path> <index>',
		flags: {
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-ensure-id': {
		desc: 'Assign a stable bge-<n> id to a block that has none (idempotent) — usage: block-ensure-id <path> <index>',
	},
	'item-update': {
		desc: 'Merge new data into one item within a block — usage: item-update <path> <blockIndex> <itemIndex>',
		flags: {
			spec: { type: 'string', desc: 'Inline JSON data patch' },
			specFile: { type: 'string', desc: 'Path to JSON data patch' },
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'catalog-list': {
		desc: 'List catalog block definitions available in this project',
	},
	'catalog-get': {
		desc: 'Get a single catalog block definition (with ready-to-insert template) — usage: catalog-get <name>',
	},
	'item-list': { desc: 'List item names' },
	'item-schema': {
		desc: 'Get item editor template + camelCase dataKeys — usage: item-schema <name>',
	},
	'style-options-list': {
		desc: 'List CSS bge-options custom property axes found in project stylesheets',
	},
	'container-options-list': { desc: 'List container layout option values (static)' },
	'config-resolve': { desc: 'Resolve and print the active burgereditor config summary' },
} as const;

/**
 * Validate that a resolved spec is shaped like a BlockSpec — i.e. an object,
 * not null, not an array. Lifts the cast out of the case arms so e.g.
 * `--spec '[1,2,3]'` or `--spec '0'` rejects with a clear top-level message
 * instead of crashing deep inside renderBlockHtml.
 * @param raw
 */
function expectBlockSpec(raw: unknown): BlockSpec {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(
			`spec must be a JSON object describing a block (got ${Array.isArray(raw) ? 'array' : raw === null ? 'null' : typeof raw}).`,
		);
	}
	return raw as BlockSpec;
}

/**
 * Convenience around resolveSpec that emits a richer diagnostic when nothing
 * was found. Branches on SpecResolution.source rather than value — a
 * deliberate `--spec null` resolves to `value=null, source='inline'` and
 * should pass through to the handler's own type check, not trigger this
 * "no source" diagnostic.
 * @param command
 * @param flags
 * @param flags.spec
 * @param flags.specFile
 */
async function resolveSpecForCommand(
	command: string,
	flags: { spec?: string; specFile?: string },
): Promise<unknown> {
	const resolution: SpecResolution = await resolveSpec(flags.spec, flags.specFile);
	// Branch on `source` (not `value`): a deliberate `--spec null` resolves to
	// `value=null, source='inline'` and should pass through to the handler's
	// own type check, not trigger the "missing source" diagnostic. Conversely,
	// a falsy non-null value (0, '', false) from a real source is also the
	// handler's call — it knows what shape it needs.
	if (resolution.source === 'none') {
		const reasons: string[] = [
			flags.spec ? '--spec provided (empty?)' : '--spec absent',
			flags.specFile ? `--spec-file=${flags.specFile}` : '--spec-file absent',
			process.stdin.isTTY ? 'stdin is a TTY (not piped)' : 'stdin piped but empty',
		];
		throw new Error(
			`${command} requires a JSON spec via --spec, --spec-file, or piped stdin. Checked: ${reasons.join('; ')}`,
		);
	}
	return resolution.value;
}

/**
 *
 */
async function main() {
	const result = parseCli({
		name: '@burger-editor/cli',
		commands,
		onError: () => true,
	});
	const ctx = await loadContextWithSilencedStdout();

	switch (result.command) {
		case 'page-list': {
			return await h.pageList(ctx);
		}
		case 'page-get': {
			return await h.pageGet(ctx, result.args[0]!);
		}
		case 'page-create': {
			const flags = result.flags as { spec?: string; specFile?: string };
			const resolution = await resolveSpec(flags.spec, flags.specFile);
			const spec = resolution.value as h.PageCreateOptions | null;
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
			const flags = result.flags as {
				spec?: string;
				specFile?: string;
				replace?: boolean;
			};
			const raw = await resolveSpecForCommand('front-matter-set', flags);
			// typeof check alone misses arrays (typeof [] === 'object') and
			// would happily merge numeric-index keys into Front Matter.
			if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
				throw new Error(
					`front-matter-set spec must be a JSON object (got ${Array.isArray(raw) ? 'array' : raw === null ? 'null' : typeof raw}).`,
				);
			}
			const patch = raw as Record<string, unknown>;
			return await h.frontMatterSet(ctx, result.args[0]!, patch, !flags.replace);
		}
		case 'page-blocks': {
			// page_blocks is a two-call protocol (see its JSDoc) — the CLI's
			// interactive/scripting use case wants "just give me the blocks",
			// so drive both calls here rather than surfacing the readToken
			// round trip to a human at the terminal.
			const first = (await pageBlocksTool.run(ctx, { path: result.args[0]! })) as {
				readToken: string;
			};
			return await pageBlocksTool.run(ctx, {
				path: result.args[0]!,
				readToken: first.readToken,
			});
		}
		case 'block-get': {
			return await h.blockGet(ctx, result.args[0]!, { index: Number(result.args[1]) });
		}
		case 'block-insert': {
			const flags = result.flags as {
				spec?: string;
				specFile?: string;
				dryRun?: boolean;
			};
			const spec = expectBlockSpec(await resolveSpecForCommand('block-insert', flags));
			return await h.blockInsert(ctx, result.args[0]!, Number(result.args[1]), spec, {
				dryRun: Boolean(flags.dryRun),
			});
		}
		case 'block-replace': {
			const flags = result.flags as {
				spec?: string;
				specFile?: string;
				dryRun?: boolean;
			};
			const spec = expectBlockSpec(await resolveSpecForCommand('block-replace', flags));
			return await h.blockReplace(
				ctx,
				result.args[0]!,
				{ index: Number(result.args[1]) },
				spec,
				{ dryRun: Boolean(flags.dryRun) },
			);
		}
		case 'block-delete': {
			const flags = result.flags as { dryRun?: boolean };
			return await h.blockDelete(
				ctx,
				result.args[0]!,
				{ index: Number(result.args[1]) },
				{ dryRun: Boolean(flags.dryRun) },
			);
		}
		case 'block-move': {
			const flags = result.flags as { dryRun?: boolean };
			return await h.blockMove(
				ctx,
				result.args[0]!,
				{ index: Number(result.args[1]) },
				Number(result.args[2]),
				{ dryRun: Boolean(flags.dryRun) },
			);
		}
		case 'block-duplicate': {
			const flags = result.flags as { dryRun?: boolean };
			return await h.blockDuplicate(
				ctx,
				result.args[0]!,
				{ index: Number(result.args[1]) },
				{ dryRun: Boolean(flags.dryRun) },
			);
		}
		case 'block-ensure-id': {
			return await h.blockEnsureId(ctx, result.args[0]!, {
				index: Number(result.args[1]),
			});
		}
		case 'item-update': {
			const flags = result.flags as {
				spec?: string;
				specFile?: string;
				dryRun?: boolean;
			};
			const raw = await resolveSpecForCommand('item-update', flags);
			if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
				throw new Error(
					`item-update spec must be a JSON object (got ${Array.isArray(raw) ? 'array' : raw === null ? 'null' : typeof raw}).`,
				);
			}
			return await h.itemUpdate(
				ctx,
				result.args[0]!,
				{ index: Number(result.args[1]) },
				Number(result.args[2]),
				raw as Record<string, unknown>,
				{ dryRun: Boolean(flags.dryRun) },
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
