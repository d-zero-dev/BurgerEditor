import type { AgentAuth } from '../agent/auth.js';
import type { AgentHub } from '../agent/hub.js';
import type { AgentRouteDeps } from '../route.js';
import type { ServerType } from '@hono/node-server';

import fs from 'node:fs/promises';
import path from 'node:path';

import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import c from 'ansi-colors';
import { Hono } from 'hono';
import open from 'open';

import { createAgentAuth, loginUrl } from '../agent/auth.js';
import { createAgentHub } from '../agent/hub.js';
import { log } from '../helpers/debug.js';
import { getUserConfig } from '../model/get-user-config.js';
import { setRoute } from '../route.js';

import { loadResolverStateOrExit } from './load-resolver-state-or-exit.js';

/**
 * Boot the local BurgerEditor server. Reads the user config via cosmiconfig,
 * pre-loads the virtualTree resolver state if enabled, mounts the Hono routes
 * (including the Agent Hub's `/api/agent/*` + `/ws/editor` when
 * `agent.enabled`), and prints a banner.
 *
 * If `virtualTree.enabled` is true and the documentRoot contains files that
 * violate the virtualTree contract (missing `pathKey`, non-string value, or
 * conflicting logical paths), {@link loadResolverStateOrExit} prints a
 * formatted message to stderr and exits the process with status 1 before the
 * HTTP server binds, so startup fails loudly instead of serving a broken
 * state.
 * @returns A promise that resolves once the banner has been printed. The HTTP
 *          server keeps running afterwards and is not awaited here.
 */
export async function runServerCommand(): Promise<void> {
	const app = new Hono();
	const { config: userConfig, configDir } = await getUserConfig();

	const isWatchMode = process.env.DEV_MODE === 'true';

	const resolverState = userConfig.virtualTree.enabled
		? await loadResolverStateOrExit(
				userConfig.documentRoot,
				userConfig.virtualTree.pathKey,
			)
		: null;

	let agentDeps: AgentRouteDeps | undefined;
	let hub: AgentHub | undefined;
	let auth: AgentAuth | undefined;
	let injectWebSocket: ((server: ServerType) => void) | undefined;
	if (userConfig.agent.enabled) {
		hub = createAgentHub({ indexFileName: userConfig.indexFileName });
		auth = await createAgentAuth(userConfig.host, configDir);
		const ws = createNodeWebSocket({ app });
		agentDeps = { hub, auth, upgradeWebSocket: ws.upgradeWebSocket };
		injectWebSocket = ws.injectWebSocket;
	}

	setRoute(app, userConfig, resolverState, agentDeps);

	const server = serve({
		fetch: app.fetch,
		hostname: userConfig.host,
		port: userConfig.port,
	});
	injectWebSocket?.(server);

	const shutdown = async () => {
		hub?.dispose();
		if (auth?.tokenFilePath) {
			await fs.unlink(auth.tokenFilePath).catch(() => {});
		}
		process.exit(0);
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	const location = `http://${userConfig.host}:${userConfig.port}`;
	const relDocumentRoot =
		'.' + path.sep + path.relative(process.cwd(), userConfig.documentRoot);

	if (userConfig.open && !isWatchMode) {
		await open(location);
	}

	const agentLoginUrl = auth ? loginUrl(location, auth) : null;

	process.stdout.write(`
🍔 ${c.bold.greenBright('BurgerEditor Local App')} 🍔

   ${c.blue('Location')}: ${c.bold(location)}
   ${c.blue('DocumentRoot')}: ${c.bold.gray(relDocumentRoot)}
${
	agentLoginUrl
		? `
   ${c.yellow('Agent access requires a token')} — open this URL once to authorize this browser:
   ${c.bold(agentLoginUrl)}
`
		: ''
}
   ${c.yellow('Enjoy Developing! 🎉')}
`);

	log('Config: %O', userConfig);
}
