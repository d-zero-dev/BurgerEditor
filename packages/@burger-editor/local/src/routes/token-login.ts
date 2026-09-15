import type { AgentAuth } from '../agent/auth.js';
import type { MiddlewareHandler } from 'hono';

import { setCookie } from 'hono/cookie';

import { AGENT_SESSION_COOKIE } from '../agent/auth.js';

/**
 * The one-time login the startup banner points at: `?token=<token>` on any
 * page URL exchanges the per-launch token for the HttpOnly `bge_session`
 * cookie the WS upgrade and `/api/agent/*` then check, and redirects to the
 * same URL without the query so the token doesn't linger in the address bar
 * or history.
 *
 * A no-op when `auth` is `null` (agent disabled) or `auth.required` is
 * `false` (loopback bind) — so this can be mounted unconditionally and
 * `createApp`'s route shape never depends on config.
 * @param auth
 */
export function tokenLogin(auth: AgentAuth | null): MiddlewareHandler {
	return async (c, next) => {
		if (!auth?.required) {
			return await next();
		}
		const token = c.req.query('token');
		if (token === undefined) {
			return await next();
		}
		if (!auth.verify(undefined, token)) {
			return c.text('Unauthorized: invalid token', 401);
		}
		setCookie(c, AGENT_SESSION_COOKIE, token, {
			httpOnly: true,
			sameSite: 'Strict',
			path: '/',
		});
		const url = new URL(c.req.url);
		url.searchParams.delete('token');
		return c.redirect(url.pathname + url.search);
	};
}
