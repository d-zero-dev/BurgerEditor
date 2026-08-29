import type { AgentAuth } from './auth.js';
import type { AgentEvent, AgentEventType } from './event-log.js';
import type { AgentHub } from './hub.js';
import type { LocalServerConfig } from '../types.js';
import type { AgentTool, CliContext } from '@burger-editor/cli';
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

import { log } from '../helpers/debug.js';
import { normalizeLogicalPath } from '../helpers/normalize-logical-path.js';

import { isAgentAuthed } from './auth.js';
import { BROWSER_APPLICABLE_TOOLS, buildBrowserOps } from './block-op-builder.js';
import { AGENT_EVENT_TYPES } from './event-log.js';
import { isExternallyChanged } from './hash-check.js';
import { hostGuard } from './host-guard.js';
import { ApplyNackError, ApplyTimeoutError, TabDisconnectedError } from './tab-hub.js';

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

/**
 * Version of the `/api/agent/*` request/response contract. Bump when a
 * response shape or error code changes incompatibly; `mcp-server` reads it
 * from `GET /api/agent/status`.
 */
const AGENT_PROTOCOL_VERSION = '1';

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
			protocolVersion: AGENT_PROTOCOL_VERSION,
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
			return c.json({
				protocolVersion: AGENT_PROTOCOL_VERSION,
				version: userConfig.version,
			});
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
			protocolVersion: AGENT_PROTOCOL_VERSION,
			version: userConfig.version,
			pid: process.pid,
			startedAt,
			documentRoot: userConfig.documentRoot,
			virtualTree: userConfig.virtualTree,
			sessions,
		});
	});

	app.get('/api/agent/events', async (c) => {
		if (!isAgentAuthed(auth, c.req)) {
			return c.text('Unauthorized', 401);
		}
		const since = Number.parseInt(c.req.query('since') ?? '', 10);
		if (Number.isFinite(since) && since < 0) {
			return c.json(
				{
					error: 'invalid',
					message: 'since must be a non-negative integer.',
					timestamp: nowIso(),
				},
				400,
			);
		}
		const timeoutMsRaw = Number.parseInt(c.req.query('timeoutMs') ?? '', 10);
		const typesRaw = c.req.query('types');
		const result = await waitForAgentEvents(hub, c.req.raw.signal, {
			since: Number.isFinite(since) ? since : undefined,
			timeoutMs: Number.isFinite(timeoutMsRaw) ? timeoutMsRaw : undefined,
			// Trim each entry — "types=a, b" (comma-space, a common
			// convention) must not fail with an "unknown event type" for
			// " b" just because of the leading space.
			types: typesRaw ? typesRaw.split(',').map((t) => t.trim()) : undefined,
		});
		if (!result.ok) {
			return c.json(invalidEventTypePayload(result.invalidType), 400);
		}
		return c.json({
			events: result.events,
			nextSince: result.nextSince,
			timedOut: result.timedOut,
			overflowed: result.overflowed,
			timestamp: nowIso(),
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
				{
					error: 'invalid',
					message: 'Body must be { tool: string, args: unknown }.',
					timestamp: nowIso(),
				},
				400,
			);
		}
		const { tool: toolName, args: rawArgs } = parsedBody.data;
		const tool = agentTools.find((t) => t.name === toolName);
		if (!tool) {
			return c.json(
				{ error: 'not-found', message: `Unknown tool: ${toolName}`, timestamp: nowIso() },
				404,
			);
		}
		// Validate against the tool's own input schema here, the way the MCP
		// SDK does before `registerTool`'s handler runs. Without it a direct
		// HTTP client's malformed args reach `buildBrowserOps`, get serialized
		// into an `apply` the tab's zod parse silently drops, and the caller
		// only learns about it as a 5 s ApplyTimeout → 504 "tab stopped
		// responding" — for what is a 400.
		const parsedArgs = tool.input.safeParse(rawArgs);
		if (!parsedArgs.success) {
			return c.json(
				{
					error: 'invalid',
					message:
						`Invalid arguments for ${toolName}: ` +
						parsedArgs.error.issues
							.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
							.join('; '),
					timestamp: nowIso(),
				},
				400,
			);
		}
		const args = parsedArgs.data;

		if (toolName === 'editor_state_get') {
			const sessions = [...hub.tabHub.snapshotAll()]
				.filter((session) => session.page !== null)
				.map((session) => ({
					page: session.page,
					revision: session.revision,
					uiState: session.uiState,
					connectedAt: session.lastActiveAt,
				}));
			return c.json({
				ok: true,
				result: { mode: 'local', sessions },
				appliedTo: 'disk',
				timestamp: nowIso(),
			});
		}

		if (toolName === 'editor_wait_for_event') {
			// `tool.run()` (the disk implementation) always throws
			// `local-required` — running inside local itself, serve the real
			// long-poll instead of routing through it.
			const waitArgs = args as { since?: number; types?: string[]; timeoutMs?: number };
			const result = await waitForAgentEvents(hub, c.req.raw.signal, waitArgs);
			if (!result.ok) {
				return c.json(invalidEventTypePayload(result.invalidType), 400);
			}
			return c.json({
				ok: true,
				result: {
					events: result.events,
					nextSince: result.nextSince,
					timedOut: result.timedOut,
					overflowed: result.overflowed,
				},
				appliedTo: 'disk',
				timestamp: nowIso(),
			});
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

const DEFAULT_WAIT_TIMEOUT_MS = 10_000;
const MAX_WAIT_TIMEOUT_MS = 30_000;

/**
 * @param value
 */
function isAgentEventType(value: string): value is AgentEventType {
	return (AGENT_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * The one place that builds the "unknown event type" 400 body — shared by
 * `GET /api/agent/events` and the `editor_wait_for_event` invoke branch via
 * {@link waitForAgentEvents}'s `ok: false` result, so the two can't drift on
 * the error shape or message wording.
 * @param invalidType
 */
function invalidEventTypePayload(invalidType: string) {
	return {
		error: 'invalid',
		message: `Unknown event type: ${invalidType}`,
		timestamp: nowIso(),
	};
}

type WaitForAgentEventsResult =
	| {
			readonly ok: true;
			readonly events: readonly AgentEvent[];
			readonly nextSince: number;
			readonly timedOut: boolean;
			readonly overflowed: boolean;
	  }
	| { readonly ok: false; readonly invalidType: string };

/**
 * Shared backing for `GET /api/agent/events` and the `editor_wait_for_event`
 * tool's `invoke` branch — both long-poll the same {@link AgentHub.events},
 * and both need the same `types` validation, so it lives here once rather
 * than being checked twice by its callers. `since` omitted means "only
 * events from now on", matching a fresh subscriber that has no cursor yet
 * rather than replaying the whole buffer.
 * @param hub
 * @param signal Aborted when the HTTP request disconnects, so a caller that
 *   gives up doesn't leave the wait dangling.
 * @param options
 * @param options.since
 * @param options.types
 * @param options.timeoutMs
 */
async function waitForAgentEvents(
	hub: AgentHub,
	signal: AbortSignal,
	options: { since?: number; types?: readonly string[]; timeoutMs?: number },
): Promise<WaitForAgentEventsResult> {
	const invalidType = options.types?.find((t) => !isAgentEventType(t));
	if (invalidType) {
		return { ok: false, invalidType };
	}
	const cursor = options.since ?? hub.events.since(0).events.at(-1)?.seq ?? 0;
	const timeoutMs = Math.min(
		Math.max(options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS, 0),
		MAX_WAIT_TIMEOUT_MS,
	);
	const result = await hub.events.waitFor(cursor, {
		types: options.types as readonly AgentEventType[],
		timeoutMs,
		signal,
	});
	return {
		ok: true,
		events: result.events,
		nextSince: result.nextCursor,
		timedOut: result.timedOut,
		overflowed: result.overflowed,
	};
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
	tool: AgentTool<unknown, unknown>,
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
		if (userConfig.virtualTree.enabled && !tool.annotations?.readOnlyHint) {
			// Page create/delete/rename/copy/concat mutate resolverState through
			// `ctx.resolverState`, but `ctx` is a fresh snapshot per call — reload
			// it from disk so /api/content's resolverState doesn't drift.
			const { state } = await loadResolverState(
				userConfig.documentRoot,
				userConfig.virtualTree.pathKey,
			);
			deps.setResolverState(state);
		}
		await syncRegistryAfterDiskApply(hub, tool, toolName, pathInput, userConfig, ctx);
		notifyPageEvent(hub, toolName, result);
		if (
			!tool.annotations?.readOnlyHint &&
			!(toolName in PAGE_STRUCTURAL_TOOL_KIND) &&
			!hasDryRun(args)
		) {
			// `page`, normalized, matches every other event's key
			// (`content-changed`, `session-*`, the browser-relayed
			// `content-saved`) — `pathInput` is whatever raw string the agent
			// passed, not necessarily the same key a subscriber comparing
			// pages across events would expect.
			const normalizedPage = pathInput
				? normalizeLogicalPath(pathInput, userConfig.indexFileName)
				: undefined;
			hub.events.append(
				toolName === 'front_matter_set' ? 'front-matter-changed' : 'content-saved',
				{ page: normalizedPage, appliedTo: 'disk' },
			);
		}
		return c.json({ ok: true, result, appliedTo: 'disk', timestamp: nowIso() });
	} catch (error) {
		return errorResponse(c, error);
	}
}

/**
 * Bring the `RevisionRegistry` back in line with disk after a tool wrote
 * (or read) a page directly. The browser-relay path bumps the registry
 * itself, but a disk-applied mutation (`front_matter_set`,
 * `block_ensure_id`, a `block_*` with no tab open, …) changes the file
 * without going through it — leaving `persistedHash` pointing at the
 * pre-write content. The very next relayed op would then trip the
 * "external-change" check against a change WE made and reject as
 * `stale` with no way out. So: re-hash, bump when the content moved, and
 * tell every tab on that page to reload (they're now behind disk). A
 * read-only tool only seeds `persistedHash` when the page has never been
 * seen, so the external-change check has a baseline from the first read.
 * @param hub
 * @param tool
 * @param toolName
 * @param pathInput
 * @param userConfig
 * @param ctx
 */
async function syncRegistryAfterDiskApply(
	hub: AgentHub,
	tool: AgentTool<unknown, unknown>,
	toolName: string,
	pathInput: string | undefined,
	userConfig: LocalServerConfig,
	ctx: CliContext,
): Promise<void> {
	if (!pathInput) {
		return;
	}
	const normalizedPage = normalizeLogicalPath(pathInput, userConfig.indexFileName);
	let currentHash: string;
	try {
		const filePath = resolvePathInput(pathInput, ctx.config, ctx.resolverState);
		currentHash = await computeContentHash(filePath);
	} catch (error) {
		// page_delete / page_rename leave nothing to hash at `pathInput`.
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return;
		}
		throw error;
	}
	const entry = hub.revisions.ensure(normalizedPage);
	if (tool.annotations?.readOnlyHint) {
		// A read is the agent's acknowledgement of the current disk state:
		// re-seed persistedHash so an external edit that already happened is
		// not re-reported as `stale` on the next browser-relayed op after the
		// agent has re-read the page (the tabs were told to reload when the
		// drift was first detected).
		hub.revisions.setPersistedHash(normalizedPage, currentHash);
		return;
	}
	if (entry.persistedHash === currentHash) {
		return;
	}
	const bumped = hub.revisions.bump(normalizedPage, currentHash);
	hub.tabHub.reloadOthers(
		normalizedPage,
		null,
		bumped.revision,
		toolName === 'front_matter_set' ? 'front-matter' : 'other-tab',
	);
}

/**
 * The single source of truth for which tools are page-structural and which
 * `page-*` kind each produces — `runOnDisk` uses membership alone (skipping
 * its generic `content-saved` for these so a structural change isn't
 * double-reported under two different event types) while `notifyPageEvent`
 * uses the kind to broadcast/log the right one. `pageEventTarget` still
 * switches per exact tool name below it, since tools sharing a `kind` (e.g.
 * `page_create` vs `page_copy` "created") name their result fields
 * differently (`path` vs `to`).
 */
const PAGE_STRUCTURAL_TOOL_KIND: Record<string, 'created' | 'deleted' | 'renamed'> = {
	page_create: 'created',
	page_copy: 'created',
	page_concat: 'created',
	page_delete: 'deleted',
	page_rename: 'renamed',
};

/**
 * The page path(s) a structural tool's own result names, in the same
 * agent-facing form the tool was called with (not the resolved disk path) —
 * each tool's own result shape differs (`page.ts`'s `pageCreate`/
 * `pageDelete`/`pageRename`/`pageCopy`/`pageConcat`), so this is the one
 * place that knows how to read "which page(s)" back out of each.
 * @param toolName
 * @param result
 */
function pageEventTarget(
	toolName: string,
	result: Record<string, unknown>,
): { from?: string; to?: string } {
	switch (toolName) {
		case 'page_create': {
			return { to: typeof result.path === 'string' ? result.path : undefined };
		}
		case 'page_delete': {
			return { from: typeof result.path === 'string' ? result.path : undefined };
		}
		case 'page_rename': {
			return {
				from: typeof result.from === 'string' ? result.from : undefined,
				to: typeof result.to === 'string' ? result.to : undefined,
			};
		}
		case 'page_copy': {
			return { to: typeof result.to === 'string' ? result.to : undefined };
		}
		case 'page_concat': {
			return { to: typeof result.target === 'string' ? result.target : undefined };
		}
		default: {
			return {};
		}
	}
}

/**
 * @param hub
 * @param toolName
 * @param result
 */
function notifyPageEvent(hub: AgentHub, toolName: string, result: unknown): void {
	const kind = PAGE_STRUCTURAL_TOOL_KIND[toolName];
	if (kind && result && typeof result === 'object') {
		const target = pageEventTarget(toolName, result as Record<string, unknown>);
		hub.tabHub.broadcast({ type: 'page-event', kind, ...target });
		const eventType =
			kind === 'created'
				? 'page-created'
				: kind === 'deleted'
					? 'page-deleted'
					: 'page-renamed';
		// The same `{from?, to?}` shape already broadcast to tabs above —
		// not the raw `{toolName, result}`, whose shape varies per tool
		// (`result.path`, `result.to`, `result.target`, …) and would force
		// an `editor_wait_for_event`/`GET /api/agent/events` consumer to
		// know each page tool's individual result shape just to read which
		// page changed.
		hub.events.append(eventType, target);
	}
}

/**
 * The BlockOp-authoritative path: `path` has a tab open, so relay the op to
 * the browser instead of writing the string mutation to disk directly. Runs
 * a two-way staleness check before relaying — a
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
	tool: AgentTool<unknown, unknown>,
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
	// `pathInput` is whatever string the agent read via page_list/page_blocks
	// (often the full file name, e.g. "/index.html") and is what readToken /
	// resolvePathInput key off of. A browser tab's `page` is its own
	// `location.pathname` (e.g. "/" for the site root) — normalize BOTH the
	// same way (`/` -> `/<indexFileName>`) before using either as a TabHub /
	// RevisionRegistry key, or a root-page tab never matches an agent's
	// fully-qualified path (see create-editor.ts's matching normalization).
	const normalizedPage = normalizeLogicalPath(pathInput, userConfig.indexFileName);
	const primary = hub.tabHub.primaryTabFor(normalizedPage);
	log(
		'invoke %s for %s (normalized: %s): primary tab = %o',
		toolName,
		pathInput,
		normalizedPage,
		primary,
	);
	if (!primary) {
		log('no tab has %s open, falling back to disk', normalizedPage);
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
			log('readToken rejected for %s: %s', pathInput, verify.reason);
			throw await toReadTokenError(verify.reason, pathInput, filePath);
		}

		const currentHash = await computeContentHash(filePath);
		const entry = hub.revisions.ensure(normalizedPage);
		if (isExternallyChanged(entry, currentHash)) {
			log(
				'disk hash for %s drifted from persistedHash (external-change): %s vs %s',
				normalizedPage,
				currentHash,
				entry.persistedHash,
			);
			// Bump persistedHash to currentHash here, same as
			// `fs-watcher.ts`'s `handleChange` does for the same condition —
			// whichever of the two independent detectors (this invoke-time
			// check, or fs.watch) observes the drift first must claim it by
			// advancing persistedHash. Otherwise the other detector later
			// compares against the same stale persistedHash, also concludes
			// "changed", and double-reports: two `content-changed` events and
			// two tab reloads for one external edit.
			const bumped = hub.revisions.bump(normalizedPage, currentHash);
			hub.tabHub.reloadOthers(normalizedPage, null, bumped.revision, 'external-change');
			hub.events.append('content-changed', { page: normalizedPage });
			throw new AgentError(
				'stale',
				'The page on disk changed outside local (e.g. an external editor). ' +
					'Re-read with page_blocks and retry.',
			);
		}
		if (primary.syncedHash !== null && primary.syncedHash !== entry.persistedHash) {
			log(
				'primary tab for %s is behind (syncedHash %s vs persistedHash %s)',
				normalizedPage,
				primary.syncedHash,
				entry.persistedHash,
			);
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
		let applied = 0;
		try {
			for (const [i, op] of ops.entries()) {
				log('sending op to tab %s for %s: %o', primary.id, normalizedPage, op);
				// Highlight only the first op of a batch — page_update's later ops
				// would otherwise each pay the scroll + blink latency.
				// Pin the target to the tab whose syncedHash was just checked —
				// re-selecting inside apply() could pick a different tab if one
				// connected or went idle in between.
				const ack = await hub.tabHub.apply(
					normalizedPage,
					'main',
					op,
					entry.revision,
					i === 0,
					primary.id,
				);
				log('tab %s acked, new revision=%s', primary.id, ack.revision);
				lastHtml = ack.html;
				applied++;
			}
		} catch (error) {
			if (applied > 0) {
				// A later op in a page_update batch failed after earlier ones
				// already mutated the tab's DOM. Nothing was written to disk (the
				// tool is all-or-nothing), so the tab is now AHEAD of disk with
				// changes that will never be persisted — force it back to the
				// on-disk state instead of leaving the two silently diverged.
				log(
					'op %d/%d failed after %d applied on tab %s — reloading it to discard the partial batch',
					applied + 1,
					ops.length,
					applied,
					primary.id,
				);
				hub.tabHub.reloadOne(primary.id, entry.revision, 'behind');
			}
			throw error;
		}

		await saveContent(
			filePath,
			lastHtml,
			ctx.config.editableArea,
			loaded.frontMatter,
			loaded.originalFrontMatter,
		);
		const newHash = await computeContentHash(filePath);
		const bumped = hub.revisions.bump(normalizedPage, newHash);
		hub.tabHub.setSyncedHash(primary.id, newHash);
		hub.tabHub.reloadOthers(normalizedPage, primary.id, bumped.revision, 'other-tab');
		hub.events.append('content-saved', { page: normalizedPage, appliedTo: 'browser' });

		const readToken = await issueReadToken(pathInput, filePath);
		const result = buildBrowserResult(toolName, pathInput, ops, lastHtml);
		return c.json({
			ok: true,
			result: { ...result, readToken, appliedTo: 'browser' },
			appliedTo: 'browser',
			timestamp: nowIso(),
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
	if (error instanceof TabDisconnectedError) {
		return new AgentError(
			'local-unreachable',
			'The open tab disconnected before it could apply the change. Retry; if no tab is open the change will be written to disk.',
		);
	}
	return null;
}

/**
 * @param c
 * @param error
 */
function errorResponse(c: Context, error: unknown) {
	const agentError = tabHubErrorToAgentError(error) ?? toAgentError(error);
	log('invoke failed: %s — %s', agentError.code, agentError.message);
	return c.json(
		{ ...agentError.toPayload(), timestamp: nowIso() },
		statusForCode(agentError.code),
	);
}

/**
 * ISO timestamp attached to every `/api/agent/*` JSON response — lets a
 * caller correlate a tool's result against `DEBUG=@bge:local` server logs
 * and the browser console's `[bge-agent-ws]`/`[bge-agent-link]` logs
 * (which are stamped with the same `Date`-based format), instead of
 * guessing from wall-clock proximity alone.
 */
function nowIso(): string {
	return new Date().toISOString();
}
