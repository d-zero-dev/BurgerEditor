import type { AgentAuth } from '../agent/auth.js';
import type { MiddlewareHandler } from 'hono';

import { isAgentAuthed } from '../agent/auth.js';
import { HEALTH_CHECK_END_POINT } from '../constants.js';

/**
 * Paths the app-wide gate leaves to someone else. `/api/agent` and `/ws`
 * run their own cookie-or-bearer check (and `/api/agent/status` deliberately
 * answers a degraded body instead of a 401 for `mcp-server`'s reachability
 * probe); the health endpoint is what the startup health checker polls
 * before any browser has a cookie, and exposes nothing.
 */
const SELF_GUARDED_PREFIXES = ['/api/agent', '/ws'] as const;

/**
 * @param pathname
 * @param prefix
 */
function isUnder(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * App-wide gate for a non-loopback bind: every request — page, static asset,
 * `/config.json`, `/api/content`, `/api/file` — needs the `bge_session`
 * cookie (set by {@link import('./token-login.js').tokenLogin}) or an
 * `Authorization: Bearer` header, otherwise 401. Without it, the token the
 * startup banner prints would protect only the agent routes while anyone on
 * the LAN could still write pages and upload files.
 *
 * A no-op when `auth` is `null` or `auth.required` is `false` (loopback
 * bind), so it can be mounted unconditionally and `createApp`'s route shape
 * never depends on config. Must be registered AFTER `tokenLogin`, so a
 * `?token=` request is exchanged for a cookie instead of being rejected.
 * @param auth
 * @example
 * app.use('*', hostGuard(config.host)).use('*', tokenLogin(auth)).use('*', requireAuth(auth));
 */
export function requireAuth(auth: AgentAuth | null): MiddlewareHandler {
	return async (c, next) => {
		if (!auth?.required) {
			return await next();
		}
		const { pathname } = new URL(c.req.url);
		if (
			pathname === HEALTH_CHECK_END_POINT ||
			SELF_GUARDED_PREFIXES.some((prefix) => isUnder(pathname, prefix))
		) {
			return await next();
		}
		if (!isAgentAuthed(auth, c.req)) {
			return c.text('Unauthorized', 401);
		}
		return await next();
	};
}
