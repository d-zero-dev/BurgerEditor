import type { AgentAuth } from './auth.js';
import type { AgentHub } from './hub.js';
import type { LocalServerConfig } from '../types.js';
import type { CliContext } from '@burger-editor/cli';
import type { BlockOp } from '@burger-editor/cli/block-op';
import type { BurgerEditorConfig, ResolverState } from '@burger-editor/file-io';
import type { Context, Hono } from 'hono';

import {
	agentInstructions,
	agentTools,
	AgentError,
	computeContentHash,
	issueReadToken,
	renderBlockHtml,
	toAgentError,
	verifyReadToken,
} from '@burger-editor/cli';
import { listBlocks, NoEditableAreaError } from '@burger-editor/core';
import {
	loadContent,
	loadResolverState,
	saveContent,
	resolvePathInput,
} from '@burger-editor/file-io';
import { z } from 'zod';

import { isAgentAuthed } from './auth.js';
import { BROWSER_APPLICABLE_TOOLS, buildBrowserOps } from './block-op-builder.js';
import { hostGuard } from './host-guard.js';
import { ApplyNackError, ApplyTimeoutError } from './tab-hub.js';

/**
 * `LocalServerConfig` is a `Pick` over `BurgerEditorConfig` for surface-area
 * reasons (`types.ts`) — the actual object `getUserConfig()` returns IS a
 * full `BurgerEditorConfig` (`resolveConfig()`'s return value; only the
 * static type is narrowed). Agent tool `run(ctx, args)` needs fields the
 * rest of `local` doesn't otherwise touch, so this recovers the full shape
 * instead of duplicating `CliContext` construction.
 * @param userConfig
 * @param resolverState
 */
function toCliContext(
	userConfig: LocalServerConfig,
	resolverState: ResolverState | null,
): CliContext {
	return {
		config: userConfig as unknown as BurgerEditorConfig,
		configPath: null,
		resolverState,
		invalidPages: [],
	};
}

const STATUS_BY_CODE: Record<string, number> = {
	'read-required': 400,
	invalid: 400,
	range: 400,
	'no-such-area': 400,
	stale: 409,
	exists: 409,
	'user-editing': 409,
	'not-found': 404,
	'local-unreachable': 504,
	'local-required': 504,
};

/**
 * @param code
 */
function statusForCode(code: string): 400 | 404 | 409 | 504 {
	const status = STATUS_BY_CODE[code];
	return (status ?? 400) as 400 | 404 | 409 | 504;
}

const invokeBodySchema = z.object({ tool: z.string(), args: z.unknown() });

/**
 * Wire `GET /api/agent/tools`, `GET /api/agent/status`, and
 * `POST /api/agent/invoke` onto `app`. Mounted from `route.tsx`'s `setRoute`
 * so this can share its `resolverState` (via `getResolverState`/
 * `setResolverState`) and `withStateLock` — every page-mutating agent tool
 * writes through the exact same serialization `/api/content` and
 * `/api/content/create` use, so an agent invoke and a human save can never
 * race each other onto the same file.
 * @param app
 * @param userConfig
 * @param hub
 * @param auth
 * @param deps
 * @param deps.withStateLock
 * @param deps.getResolverState
 * @param deps.setResolverState
 */
export function setAgentRoute(
	app: Hono,
	userConfig: LocalServerConfig,
	hub: AgentHub,
	auth: AgentAuth,
	deps: {
		readonly withStateLock: <T>(work: () => Promise<T>) => Promise<T>;
		getResolverState(): ResolverState | null;
		setResolverState(state: ResolverState | null): void;
	},
): void {
	const startedAt = Date.now();

	app.use('/api/agent/*', hostGuard(userConfig.host));

	app.get('/api/agent/tools', (c) => {
		if (!isAgentAuthed(auth, c.req)) {
			return c.text('Unauthorized', 401);
		}
		return c.json({
			protocolVersion: '1',
			instructions: agentInstructions,
			tools: agentTools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: z.toJSONSchema(tool.input),
				outputSchema: tool.output ? z.toJSONSchema(tool.output) : undefined,
				annotations: tool.annotations,
			})),
		});
	});

	app.get('/api/agent/status', (c) => {
		if (!isAgentAuthed(auth, c.req)) {
			return c.json({ protocolVersion: '1', version: userConfig.version });
		}
		const sessions = [...hub.tabHub.snapshotAll()]
			.filter((session) => session.page !== null)
			.map((session) => ({
				page: session.page,
				revision: session.revision,
				uiState: session.uiState,
				connectedAt: session.lastActiveAt,
			}));
		return c.json({
			protocolVersion: '1',
			version: userConfig.version,
			pid: process.pid,
			startedAt,
			documentRoot: userConfig.documentRoot,
			virtualTree: userConfig.virtualTree,
			sessions,
		});
	});

	app.post('/api/agent/invoke', async (c) => {
		if (!isAgentAuthed(auth, c.req)) {
			return c.text('Unauthorized', 401);
		}
		const json: unknown = await c.req.json().catch(() => null);
		const parsedBody = invokeBodySchema.safeParse(json);
		if (!parsedBody.success) {
			return c.json(
				{ error: 'invalid', message: 'Body must be { tool: string, args: unknown }.' },
				400,
			);
		}
		const { tool: toolName, args } = parsedBody.data;
		const tool = agentTools.find((t) => t.name === toolName);
		if (!tool) {
			return c.json({ error: 'not-found', message: `Unknown tool: ${toolName}` }, 404);
		}

		if (toolName === 'editor_state_get') {
			const sessions = [...hub.tabHub.snapshotAll()]
				.filter((session) => session.page !== null)
				.map((session) => ({
					page: session.page,
					revision: session.revision,
					uiState: session.uiState,
					connectedAt: session.lastActiveAt,
				}));
			return c.json({ ok: true, result: { mode: 'local', sessions }, appliedTo: 'disk' });
		}

		const pathInput = hasStringPath(args) ? args.path : undefined;
		const isDryRun = hasDryRun(args);
		const isBlockOpTool = !!pathInput && BROWSER_APPLICABLE_TOOLS.has(toolName);

		if (!isBlockOpTool || isDryRun) {
			return deps.withStateLock(() =>
				runOnDisk(c, tool, toolName, args, userConfig, deps, hub, pathInput),
			);
		}

		return deps.withStateLock(() =>
			runViaBrowserOrDisk(c, tool, toolName, args, pathInput, userConfig, deps, hub),
		);
	});
}

/**
 * @param value
 */
function hasStringPath(value: unknown): value is { path: string } {
	return (
		!!value &&
		typeof value === 'object' &&
		'path' in value &&
		typeof (value as { path: unknown }).path === 'string'
	);
}

/**
 * @param value
 */
function hasDryRun(value: unknown): boolean {
	return (
		!!value &&
		typeof value === 'object' &&
		(value as { dryRun?: unknown }).dryRun === true
	);
}

/**
 * Ordinary disk-applied path — every non-`BlockOp` tool (page create /
 * delete / rename / copy / concat, Front Matter, catalog reads, dryRun of
 * anything), plus a `BlockOp` tool when no tab has the page open. Runs the
 * tool's own `run()`, then notifies whichever tabs have the affected page
 * open so they reload instead of quietly drifting from disk.
 * @param c
 * @param tool
 * @param toolName
 * @param args
 * @param userConfig
 * @param deps
 * @param deps.getResolverState
 * @param deps.setResolverState
 * @param hub
 * @param pathInput
 */
async function runOnDisk(
	c: Context,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	tool: any,
	toolName: string,
	args: unknown,
	userConfig: LocalServerConfig,
	deps: {
		getResolverState(): ResolverState | null;
		setResolverState(state: ResolverState | null): void;
	},
	hub: AgentHub,
	pathInput: string | undefined,
) {
	const ctx = toCliContext(userConfig, deps.getResolverState());
	try {
		const result = await tool.run(ctx, args);
		if (userConfig.virtualTree.enabled) {
			// Page create/delete/rename/copy/concat mutate resolverState through
			// `ctx.resolverState`, but `ctx` is a fresh snapshot per call — reload
			// it from disk so /api/content's resolverState doesn't drift.
			const { state } = await loadResolverState(
				userConfig.documentRoot,
				userConfig.virtualTree.pathKey,
			);
			deps.setResolverState(state);
		}
		notifyAffectedTabs(hub, toolName, pathInput, result);
		return c.json({ ok: true, result, appliedTo: 'disk' });
	} catch (error) {
		return errorResponse(c, error);
	}
}

/**
 * @param hub
 * @param toolName
 * @param pathInput
 * @param result
 */
function notifyAffectedTabs(
	hub: AgentHub,
	toolName: string,
	pathInput: string | undefined,
	result: unknown,
): void {
	if (toolName === 'front_matter_set' && pathInput) {
		const entry = hub.revisions.ensure(pathInput);
		hub.tabHub.reloadOthers(pathInput, null, entry.revision, 'front-matter');
		return;
	}
	if (
		(toolName === 'page_create' ||
			toolName === 'page_delete' ||
			toolName === 'page_rename' ||
			toolName === 'page_copy' ||
			toolName === 'page_concat') &&
		result &&
		typeof result === 'object'
	) {
		const kind =
			toolName === 'page_create' || toolName === 'page_copy' || toolName === 'page_concat'
				? 'created'
				: toolName === 'page_delete'
					? 'deleted'
					: 'renamed';
		hub.tabHub.broadcast({ type: 'page-event', kind });
		if (pathInput) {
			const entry = hub.revisions.ensure(pathInput);
			hub.tabHub.reloadOthers(pathInput, null, entry.revision, 'other-tab');
		}
	}
}

/**
 * The BlockOp-authoritative path: `path` has a tab open, so relay the op to
 * the browser instead of writing the string mutation to disk directly. Runs
 * the two-way staleness check from the design doc before relaying — a
 * `readToken` that matches disk content isn't enough on its own if disk
 * itself has drifted from what `local` last wrote/read (`persistedHash`), or
 * if the primary tab hasn't caught up to that (`syncedHash`).
 * @param c
 * @param tool
 * @param toolName
 * @param args
 * @param pathInput
 * @param userConfig
 * @param deps
 * @param deps.getResolverState
 * @param deps.setResolverState
 * @param hub
 */
async function runViaBrowserOrDisk(
	c: Context,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	tool: any,
	toolName: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	args: any,
	pathInput: string,
	userConfig: LocalServerConfig,
	deps: {
		getResolverState(): ResolverState | null;
		setResolverState(state: ResolverState | null): void;
	},
	hub: AgentHub,
) {
	const ctx = toCliContext(userConfig, deps.getResolverState());
	const primary = hub.tabHub.primaryTabFor(pathInput);
	if (!primary) {
		return runOnDisk(c, tool, toolName, args, userConfig, deps, hub, pathInput);
	}

	try {
		const filePath = resolvePathInput(pathInput, ctx.config, ctx.resolverState);
		const verify = await verifyReadToken(
			args.readToken as string | undefined,
			pathInput,
			filePath,
		);
		if (!verify.ok) {
			throw await toReadTokenError(verify.reason, pathInput, filePath);
		}

		const currentHash = await computeContentHash(filePath);
		const entry = hub.revisions.ensure(pathInput);
		if (entry.persistedHash !== null && entry.persistedHash !== currentHash) {
			hub.tabHub.reloadOthers(pathInput, null, entry.revision, 'external-change');
			throw new AgentError(
				'stale',
				'The page on disk changed outside local (e.g. an external editor). ' +
					'Re-read with page_blocks and retry.',
			);
		}
		if (primary.syncedHash !== null && primary.syncedHash !== entry.persistedHash) {
			hub.tabHub.reloadOne(primary.id, entry.revision, 'behind');
			throw new AgentError(
				'stale',
				'The open tab has not caught up with the latest save yet and was told to reload. Retry shortly.',
			);
		}

		const loaded = await loadContent(
			filePath,
			ctx.config.editableArea,
			ctx.config.newFileContent,
		);
		if (loaded instanceof NoEditableAreaError) {
			throw loaded;
		}
		const blocks = listBlocks(loaded.editableContent, null);
		if (blocks instanceof NoEditableAreaError) {
			throw blocks;
		}

		let blockHtml: string | undefined;
		if (toolName === 'block_insert' || toolName === 'block_replace') {
			blockHtml = await renderBlockHtml(args.spec, ctx.config);
		}
		const ops = buildBrowserOps(toolName, args, blocks, pathInput, blockHtml);

		let lastHtml = loaded.editableContent;
		for (const op of ops) {
			const ack = await hub.tabHub.apply(pathInput, 'main', op, entry.revision, true);
			lastHtml = ack.html;
		}

		await saveContent(
			filePath,
			lastHtml,
			ctx.config.editableArea,
			loaded.frontMatter,
			loaded.originalFrontMatter,
		);
		const newHash = await computeContentHash(filePath);
		const bumped = hub.revisions.bump(pathInput, newHash);
		hub.tabHub.setSyncedHash(primary.id, newHash);
		hub.tabHub.reloadOthers(pathInput, primary.id, bumped.revision, 'other-tab');

		const readToken = await issueReadToken(pathInput, filePath);
		const result = buildBrowserResult(toolName, pathInput, ops, lastHtml);
		return c.json({
			ok: true,
			result: { ...result, readToken, appliedTo: 'browser' },
			appliedTo: 'browser',
		});
	} catch (error) {
		return errorResponse(c, error);
	}
}

/**
 * @param reason
 * @param pathInput
 * @param filePath
 */
async function toReadTokenError(
	reason: 'missing' | 'malformed' | 'wrong-path' | 'stale',
	pathInput: string,
	filePath: string,
): Promise<AgentError> {
	const readToken = await issueReadToken(pathInput, filePath);
	if (reason === 'missing') {
		return new AgentError(
			'read-required',
			`This mutation requires a readToken. Call page_blocks({ path: ${JSON.stringify(pathInput)} }) first.`,
			{ readToken },
		);
	}
	return new AgentError(
		'stale',
		'The page changed since this readToken was issued (or it was minted for a different path). Re-read and retry.',
		{ readToken },
	);
}

/**
 * Shape the successful `result` for a browser-applied `BlockOp` tool call —
 * mirrors each disk tool's own success shape (see `mutation-result.ts`)
 * closely enough that an agent sees the same fields regardless of
 * `appliedTo`, just sourced from the browser's post-apply HTML instead of a
 * re-read of disk.
 * @param toolName
 * @param pathInput
 * @param ops
 * @param html
 */
function buildBrowserResult(
	toolName: string,
	pathInput: string,
	ops: readonly BlockOp[],
	html: string,
) {
	if (toolName === 'page_update') {
		return { path: pathInput, applied: ops.length, dryRun: false };
	}
	const blocks = listBlocks(html, null);
	const block =
		blocks instanceof NoEditableAreaError
			? undefined
			: resultBlockFor(toolName, ops, blocks);
	return { path: pathInput, dryRun: false, block };
}

/**
 * @param toolName
 * @param ops
 * @param blocks
 */
function resultBlockFor(
	toolName: string,
	ops: readonly BlockOp[],
	blocks: readonly { readonly index: number; readonly html: string }[],
) {
	const firstOp = ops[0];
	if (!firstOp || toolName === 'block_delete') {
		return;
	}
	if (
		firstOp.op === 'insert' ||
		firstOp.op === 'replace' ||
		firstOp.op === 'update-item'
	) {
		return blocks[firstOp.index]?.html;
	}
	if (firstOp.op === 'duplicate') {
		return blocks[firstOp.index + 1]?.html;
	}
	if (firstOp.op === 'move') {
		return blocks[firstOp.to]?.html;
	}
	return;
}

/**
 * `TabHub.apply()`'s rejections are transport-layer failures with no
 * `AgentError` opinion of their own — map them here rather than teaching
 * `toAgentError` (cli, disk-only) about a browser-relay concept it has no
 * other reason to know about.
 * @param error
 */
function tabHubErrorToAgentError(error: unknown): AgentError | null {
	if (error instanceof ApplyNackError) {
		const detailMessage = typeof error.detail === 'string' ? `: ${error.detail}` : '';
		if (error.reason === 'user-editing' || error.reason === 'stale') {
			return new AgentError(error.reason, `${error.message}${detailMessage}`, {});
		}
		return new AgentError('invalid', `${error.message}${detailMessage}`);
	}
	if (error instanceof ApplyTimeoutError) {
		return new AgentError('local-unreachable', 'The open tab stopped responding.');
	}
	return null;
}

/**
 * @param c
 * @param error
 */
function errorResponse(c: Context, error: unknown) {
	const agentError = tabHubErrorToAgentError(error) ?? toAgentError(error);
	return c.json(agentError.toPayload(), statusForCode(agentError.code));
}
