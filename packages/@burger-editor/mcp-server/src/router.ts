import type { AgentTool } from '@burger-editor/cli';

import fs from 'node:fs';
import path from 'node:path';

import { AgentError } from '@burger-editor/cli';

import { getContext } from './context.js';

export type McpMode = 'auto' | 'local' | 'disk';

export interface RouterOptions {
	readonly mode: McpMode;
	readonly localUrl: string;
}

export interface RouteResult {
	readonly result: unknown;
	readonly appliedTo: 'browser' | 'disk';
}

const REACHABILITY_TTL_MS = 5000;
const STATUS_TIMEOUT_MS = 500;
// Must stay comfortably above what `local`'s `GET /api/agent/events` /
// `editor_wait_for_event` handler promises to respond within (its own
// `timeoutMs`, clamped to 30s) — this is a safety net against a hung
// connection, not the mechanism that ends the wait. Normal operation always
// resolves via `local`'s own 200 response first.
const WAIT_FOR_EVENT_TIMEOUT_MARGIN_MS = 5000;
const WAIT_FOR_EVENT_DEFAULT_TIMEOUT_MS = 10_000;
const WAIT_FOR_EVENT_MAX_TIMEOUT_MS = 30_000;

interface ReachabilityCache {
	readonly reachable: boolean;
	readonly expiresAt: number;
}

let reachabilityCache: ReachabilityCache | null = null;

/**
 * Probe `local`'s `GET /api/agent/status` and cache the answer for
 * `REACHABILITY_TTL_MS`. A short TTL rather than "check once per process"
 * lets `auto` mode follow `local` starting up or shutting down mid-session
 * without a restart; a failed probe drops the cache immediately (rather
 * than caching the negative result for the full TTL) so the very next call
 * re-checks instead of waiting out a stale "unreachable" verdict.
 * @param localUrl
 */
async function checkReachable(localUrl: string): Promise<boolean> {
	const now = Date.now();
	if (reachabilityCache && reachabilityCache.expiresAt > now) {
		return reachabilityCache.reachable;
	}
	let reachable = false;
	try {
		const res = await fetch(new URL('/api/agent/status', localUrl), {
			signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
		});
		reachable = res.ok;
	} catch {
		reachable = false;
	}
	reachabilityCache = reachable
		? { reachable, expiresAt: now + REACHABILITY_TTL_MS }
		: null;
	return reachable;
}

/** Test-only: clear the reachability cache between cases. */
export function __resetReachabilityCache(): void {
	reachabilityCache = null;
}

/**
 * The client-side abort deadline for an `editor_wait_for_event` forward:
 * `local`'s own clamped `timeoutMs` plus a fixed margin. Exported (pure, no
 * `AbortSignal` construction) so its clamping/margin math has fast unit
 * tests without actually waiting the computed duration out.
 * @param args
 */
export function computeWaitForEventTimeoutMs(args: unknown): number {
	const requested = hasTimeoutMs(args) ? args.timeoutMs : undefined;
	const timeoutMs = Math.min(
		Math.max(requested ?? WAIT_FOR_EVENT_DEFAULT_TIMEOUT_MS, 0),
		WAIT_FOR_EVENT_MAX_TIMEOUT_MS,
	);
	return timeoutMs + WAIT_FOR_EVENT_TIMEOUT_MARGIN_MS;
}

/**
 * `editor_wait_for_event` is the one tool whose forwarded request is
 * expected to sit open for seconds — every other tool's fetch is left
 * without a client-side timeout on purpose (a network failure, not a slow
 * response, is what should end it). Bounding just this one request guards
 * against `local` hanging without ever emitting its own `timedOut` response.
 * @param toolName
 * @param args
 */
function abortSignalForInvoke(toolName: string, args: unknown): AbortSignal | undefined {
	if (toolName !== 'editor_wait_for_event') {
		return undefined;
	}
	return AbortSignal.timeout(computeWaitForEventTimeoutMs(args));
}

/**
 * @param value
 */
function hasTimeoutMs(value: unknown): value is { timeoutMs: number } {
	return (
		!!value &&
		typeof value === 'object' &&
		typeof (value as { timeoutMs?: unknown }).timeoutMs === 'number'
	);
}

/**
 * @param value
 */
function hasSince(value: unknown): value is { since: number } {
	return (
		!!value &&
		typeof value === 'object' &&
		typeof (value as { since?: unknown }).since === 'number'
	);
}

/**
 * Bearer token for `local`'s non-loopback-bind auth. Precedence:
 *
 * 1. `BGE_AGENT_TOKEN` — an explicit override (a token copied from the
 *    startup banner, or a server on another machine whose file this process
 *    cannot see).
 * 2. `<configDir>/.burgereditor/agent-token` — the per-launch token `local`
 *    persists (`local/src/agent/auth.ts`, mode 0600) precisely so an MCP
 *    process on the same machine authenticates without the user pasting
 *    anything. `configDir` is the directory of the resolved
 *    `burgereditor.config.*`, matching where `local` writes it; with no
 *    config file (or when the context cannot be loaded at all) `cwd` is the
 *    best remaining guess.
 *
 * Returns `null` when neither source yields a token — a loopback-bound
 * `local` needs none, so the absence is the normal case, not an error.
 */
async function resolveAgentToken(): Promise<string | null> {
	const fromEnv = process.env.BGE_AGENT_TOKEN;
	if (fromEnv) {
		return fromEnv;
	}
	let configDir = process.cwd();
	try {
		const ctx = await getContext();
		if (ctx.configPath) {
			configDir = path.dirname(ctx.configPath);
		}
	} catch {
		// No resolvable config: `local` mode must still be able to forward
		// calls, so fall through with cwd rather than failing the call here.
	}
	try {
		const token = fs
			.readFileSync(path.join(configDir, '.burgereditor', 'agent-token'), 'utf8')
			.trim();
		return token || null;
	} catch {
		return null;
	}
}

interface RemoteInvokeResponse {
	readonly ok: true;
	readonly result: unknown;
	readonly appliedTo: 'browser' | 'disk';
}

interface RemoteErrorResponse {
	readonly error: string;
	readonly message: string;
}

/**
 * @param localUrl
 * @param toolName
 * @param args
 */
async function invokeRemote(
	localUrl: string,
	toolName: string,
	args: unknown,
): Promise<RouteResult> {
	const token = await resolveAgentToken();
	// Only the fetch itself may throw a non-AgentError from here: a network
	// failure genuinely means `local` is gone and `routeToolCall` may fall
	// back to disk. Once ANY HTTP response arrives, `local` answered, and
	// that answer is authoritative — it must surface as an AgentError even
	// when the body isn't JSON (401/403 are `c.text()` responses). Letting a
	// JSON SyntaxError escape here would masquerade an auth failure as a
	// crash and, in auto mode, silently re-run a mutation on disk, bypassing
	// the open tab the user is looking at.
	let res: Response;
	try {
		res = await fetch(new URL('/api/agent/invoke', localUrl), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(token && { authorization: `Bearer ${token}` }),
			},
			body: JSON.stringify({ tool: toolName, args }),
			signal: abortSignalForInvoke(toolName, args),
		});
	} catch (error) {
		if (
			toolName === 'editor_wait_for_event' &&
			error instanceof Error &&
			error.name === 'TimeoutError'
		) {
			// Our own client-side safety-net abort fired (see
			// `abortSignalForInvoke`) — `local` is presumably still alive,
			// just slower than the margin allows, NOT gone. Answer exactly
			// like `local`'s own graceful long-poll timeout instead of
			// letting this masquerade as "local died", which would make
			// `routeToolCall` drop the reachability cache and, in auto mode,
			// fall back to disk — whose `editor_wait_for_event` always throws
			// `local-required`, a much more confusing error than a timeout.
			return {
				result: {
					events: [],
					// A caller who omitted `since` means "only events from
					// now on" — falling back to `0` here would turn their
					// next poll into a full replay of the ring buffer, the
					// opposite of what omitting `since` asked for. Leave it
					// unset instead: this synthetic response has no way to
					// know `local`'s current tail seq (that's the very call
					// that just failed to answer), so the honest answer is
					// "no cursor progress happened", not a fabricated number.
					nextSince: hasSince(args) ? args.since : undefined,
					timedOut: true,
					overflowed: false,
				},
				appliedTo: 'disk',
			};
		}
		throw error;
	}
	if (res.status === 401 || res.status === 403) {
		throw new AgentError(
			'unauthorized',
			`The local dev server at ${localUrl} rejected the call (${res.status}). ` +
				'It is bound to a non-loopback address and requires its per-launch token: set ' +
				'BGE_AGENT_TOKEN to the value shown in its startup banner (or found in ' +
				'<configDir>/.burgereditor/agent-token), then retry.',
		);
	}
	const text = await res.text();
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		throw new AgentError(
			'invalid',
			`The local dev server returned a non-JSON ${res.status} response: ${text.slice(0, 200)}`,
		);
	}
	if (!res.ok || !(body as { ok?: boolean }).ok) {
		const payload = body as Partial<RemoteErrorResponse>;
		throw new AgentError(
			payload.error ?? 'invalid',
			payload.message ?? 'local invoke failed',
		);
	}
	const success = body as RemoteInvokeResponse;
	return { result: success.result, appliedTo: success.appliedTo };
}

/**
 * @param tool
 * @param args
 */
async function runDisk(
	tool: AgentTool<unknown, unknown>,
	args: unknown,
): Promise<RouteResult> {
	const ctx = await getContext();
	const result = await tool.run(ctx, args);
	return { result, appliedTo: 'disk' };
}

/**
 * Resolve a tool call to either a disk-side `run()` or a forwarded
 * `POST /api/agent/invoke` on `local`, keeping the tool's contract
 * (input/output/errors) identical either way — see `AgentTool`'s JSDoc.
 * `disk` mode never probes `local`; `local` mode never falls back to disk;
 * `auto` (the default) probes and falls back, so an agent session survives
 * `local` starting or stopping mid-session without reconfiguring anything.
 * @param tool
 * @param args
 * @param options
 */
export async function routeToolCall(
	tool: AgentTool<unknown, unknown>,
	args: unknown,
	options: RouterOptions,
): Promise<RouteResult> {
	if (options.mode === 'disk') {
		return await runDisk(tool, args);
	}

	const reachable = await checkReachable(options.localUrl);
	if (reachable) {
		try {
			return await invokeRemote(options.localUrl, tool.name, args);
		} catch (error) {
			// An AgentError means `local` answered and rejected the call on its
			// own terms (bad readToken, user-editing, …) — that's an authoritative
			// response, not a reachability problem, and must propagate as-is
			// (falling back to disk here could silently diverge from what local
			// just told the agent). `invokeRemote` turns EVERY received response
			// — 401/403, non-JSON, error bodies — into an AgentError for that
			// reason, so anything else reaching here is fetch's own connection
			// error: `local` most likely died between the reachability probe
			// above and this call — drop the cached
			// "reachable" verdict so the NEXT call re-probes instead of trusting
			// the rest of the TTL window, and in `auto` mode fall back to disk
			// for THIS call so a mid-session crash doesn't fail outright.
			if (error instanceof AgentError) {
				throw error;
			}
			__resetReachabilityCache();
			if (options.mode === 'local') {
				throw new AgentError(
					'local-unreachable',
					`Lost connection to the local dev server (\`bge\`, the bin of ` +
						`@burger-editor/local) at ${options.localUrl} mid-call. ` +
						'It may have crashed — restart it, or retry with --mode disk / auto.',
				);
			}
			return await runDisk(tool, args);
		}
	}

	if (options.mode === 'local') {
		throw new AgentError(
			'local-unreachable',
			`Could not reach the local dev server at ${options.localUrl}. ` +
				'Start it (`bge`, the bin of `@burger-editor/local`), or retry with --mode disk / auto.',
		);
	}

	return await runDisk(tool, args);
}
