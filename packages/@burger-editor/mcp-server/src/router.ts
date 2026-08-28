import type { AgentTool } from '@burger-editor/cli';

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
 * Bearer token for `local`'s non-loopback-bind auth. Only the environment
 * variable is supported today — reading a token file from `local`'s config
 * directory requires `local` to actually issue and persist one first,
 * which depends on `local` having a token-issuing auth layer at all.
 */
function resolveAgentToken(): string | null {
	return process.env.BGE_AGENT_TOKEN || null;
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
	const token = resolveAgentToken();
	const res = await fetch(new URL('/api/agent/invoke', localUrl), {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(token && { authorization: `Bearer ${token}` }),
		},
		body: JSON.stringify({ tool: toolName, args }),
	});
	const body: unknown = await res.json();
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
			// just told the agent). Anything else (fetch's own connection error,
			// a JSON parse failure) means `local` most likely died between the
			// reachability probe above and this call — drop the cached
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
					`Lost connection to the local dev server at ${options.localUrl} mid-call. ` +
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
				'Start it with `npx bge`, or retry with --mode disk / auto.',
		);
	}

	return await runDisk(tool, args);
}
