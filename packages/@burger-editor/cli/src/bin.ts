#!/usr/bin/env node

// User configs may `import { config } from 'dotenv'; config()` which prints a
// tip banner to stdout — that corrupts our JSON-only stdout contract. Silence
// dotenv before any user code (including cosmiconfig-loaded configs) runs.
process.env.DOTENV_CONFIG_QUIET = 'true';

import type { BlockSpec } from './block-builder.js';

import { parseCli } from '@d-zero/roar';

import { pageBlocksTool } from './agent-tools/tools/page-blocks.js';
import { commands } from './commands.js';
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
 * @param configPath the `--config` value; `undefined` falls back to `BGE_CONFIG`, then the search
 */
async function loadContextWithSilencedStdout(
	configPath: string | undefined,
): ReturnType<typeof loadContext> {
	using _ = silenceStdout();
	return await loadContext(undefined, { configPath });
}

/**
 * Validate the parsed `--config` flag. yargs-parser reads a bare `--config`
 * (or `--config=`) as `''`, which `resolveConfig` would treat as "not named"
 * and silently fall back to the search; a repeated `--config` arrives as an
 * array despite the `string` type. Both are rejected with one message.
 * @param value the parsed `--config` flag
 */
function toConfigPath(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== 'string' || value === '') {
		throw new Error('--config requires a single path to a config file.');
	}
	return value;
}

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
	const ctx = await loadContextWithSilencedStdout(toConfigPath(result.flags.config));

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
