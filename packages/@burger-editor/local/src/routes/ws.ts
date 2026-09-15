import type { AgentDeps, AgentEnv } from '../agent/env.js';
import type { LocalServerConfig } from '../types.js';
import type { Context } from 'hono';

import { upgradeWebSocket } from '@hono/node-server';
import { Hono } from 'hono';

import { agentEnabled, requireAgentAuth } from '../agent/env.js';
import { hostGuard } from '../agent/host-guard.js';
import { log } from '../helpers/debug.js';

/**
 * `GET /editor` — mounted at `/ws`. `hostGuard` and `requireAgentAuth` run
 * BEFORE `upgradeWebSocket`, so an untrusted `Host` or missing/invalid
 * credentials are rejected with a plain HTTP 403/401 at the handshake,
 * never by accepting the upgrade and closing the socket afterwards. That is
 * what makes the rejection observable through `app.request()` — an
 * authenticated upgrade still requires a real Node socket to complete and
 * is only observable via `createLocalServer`.
 * @param config
 * @param deps
 * @example
 * app.route('/ws', createWsRoutes(config, agentDeps));
 */
export function createWsRoutes(config: LocalServerConfig, deps: AgentDeps | null) {
	return new Hono<AgentEnv>()
		.use(agentEnabled(deps))
		.use(hostGuard(config.host))
		.use(requireAgentAuth())
		.get(
			'/editor',
			upgradeWebSocket(
				(c: Context<AgentEnv>) => {
					const { hub } = c.get('agent');
					let sessionId: string | null = null;
					return {
						onOpen(_evt, ws) {
							sessionId = hub.tabHub.register({
								send: (data) => ws.send(data),
								close: () => ws.close(),
							});
						},
						onMessage(evt) {
							if (sessionId) {
								hub.handleSocketMessage(sessionId, String(evt.data));
							}
						},
						onClose() {
							if (sessionId) {
								hub.closeSession(sessionId);
							}
						},
					};
				},
				{ onError: (error) => log('ws handler threw: %o', error) },
			),
		);
}
