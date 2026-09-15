import type { AgentAuth } from './auth.js';
import type { AgentHub } from './hub.js';

import { createMiddleware } from 'hono/factory';

import { isAgentAuthed } from './auth.js';

/** The `hub` + `auth` pair every agent-facing route needs. */
export interface AgentDeps {
	readonly hub: AgentHub;
	readonly auth: AgentAuth;
}

/** Env of the `/api/agent` and `/ws` sub-apps: `agentEnabled()` injects `deps` as a request variable. */
export type AgentEnv = { Variables: { agent: AgentDeps } };

/**
 * Gate for the agent-facing sub-apps (`/api/agent/*`, `/ws/*`). When
 * `deps` is `null` (`agent.enabled: false`), every request under the
 * sub-app answers 404 via `app.notFound()` — the same response a client
 * saw when these routes were not mounted at all — so `AppType` stays one
 * static shape regardless of runtime config. Otherwise exposes `deps` to
 * downstream handlers as `c.get('agent')`.
 *
 * Registered as the FIRST middleware on each sub-app, before
 * {@link import('./host-guard.js').hostGuard} — a disabled server must
 * answer 404 to every `Host`, not 403 to a foreign one.
 * @param deps
 * @example
 * new Hono<AgentEnv>().use(agentEnabled(deps)).use(hostGuard(host))
 */
export function agentEnabled(deps: AgentDeps | null) {
	return createMiddleware<AgentEnv>(async (c, next) => {
		if (!deps) {
			return c.notFound();
		}
		c.set('agent', deps);
		return await next();
	});
}

/**
 * Cookie-or-bearer check shared by `/api/agent/{tools,events,invoke}` and
 * the `/ws/editor` upgrade. Rejecting here — as an ordinary HTTP 401
 * returned BEFORE `upgradeWebSocket` runs — is what makes the rejection
 * observable through `app.request()` instead of only over a real socket.
 *
 * `/api/agent/status` deliberately does NOT use this: it answers a
 * degraded body to an unauthenticated caller (`mcp-server`'s reachability
 * probe), never a 401.
 * @example
 * new Hono<AgentEnv>().use(agentEnabled(deps)).use(hostGuard(host)).use(requireAgentAuth())
 */
export function requireAgentAuth() {
	return createMiddleware<AgentEnv>(async (c, next) => {
		if (!isAgentAuthed(c.get('agent').auth, c.req)) {
			return c.text('Unauthorized', 401);
		}
		return await next();
	});
}
