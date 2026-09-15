import type { AgentDeps } from './agent/env.js';
import type { ResolverStateStore } from './resolver-state-store.js';
import type { LocalServerConfig } from './types.js';

/**
 * App-scoped values the content/page routes need (as opposed to the
 * request-scoped {@link AgentDeps}, which only the agent/WS sub-apps read
 * via `c.get('agent')`). Passed explicitly to each sub-app factory instead
 * of being threaded through Hono's `Variables` — nothing here is
 * request-scoped, so there is no reason to route it through the context.
 */
export interface AppContext {
	readonly config: LocalServerConfig;
	readonly store: ResolverStateStore;
	/** `null` when `config.agent.enabled` is `false`. */
	readonly agent: AgentDeps | null;
}
