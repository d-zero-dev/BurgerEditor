import type { AgentDeps } from '../agent/env.js';
import type { LocalServerConfig } from '../types.js';

import path from 'node:path';

import c from 'ansi-colors';
import open from 'open';

import { createAgentAuth, loginUrl } from '../agent/auth.js';
import { createFsWatcher } from '../agent/fs-watcher.js';
import { createAgentHub } from '../agent/hub.js';
import { createApp } from '../app.js';
import { createLocalServer } from '../create-local-server.js';
import { log } from '../helpers/debug.js';
import { getUserConfig } from '../model/get-user-config.js';

import { loadResolverStateOrExit } from './load-resolver-state-or-exit.js';

export interface LocalServerHandle extends AsyncDisposable {
	readonly port: number;
	readonly url: string;
	/** `null` when `config.agent.enabled` is `false`. */
	readonly agent: AgentDeps | null;
}

/**
 * Boot the local BurgerEditor server: pre-loads the virtualTree resolver
 * state if enabled (exiting the process first if the documentRoot violates
 * the virtualTree contract — see {@link loadResolverStateOrExit}), wires the
 * Agent Hub, builds the Hono app, and binds it.
 *
 * Deliberately prints nothing and never opens a browser — `runServerCommand`
 * owns those side effects — so this is the seam a test drives directly to
 * exercise the boot sequence (including the exit-before-bind failure path)
 * without spawning a subprocess.
 * @param config
 * @param configDir Directory the agent token file is persisted under (`getUserConfig()`'s `configDir`).
 * @example
 * const { config, configDir } = await getUserConfig();
 * await using handle = await bootLocalServer(config, configDir);
 * console.log(handle.url);
 */
export async function bootLocalServer(
	config: LocalServerConfig,
	configDir: string,
): Promise<LocalServerHandle> {
	const resolverState = config.virtualTree.enabled
		? await loadResolverStateOrExit(config.documentRoot, config.virtualTree.pathKey)
		: null;

	const resources = new AsyncDisposableStack();
	let agent: AgentDeps | null = null;
	if (config.agent.enabled) {
		const hub = resources.use(createAgentHub({ indexFileName: config.indexFileName }));
		const auth = resources.use(await createAgentAuth(config.host, configDir));
		agent = { hub, auth };
		// Only meaningful when a page's disk path IS its logical path — see
		// `fs-watcher.ts`'s doc comment for why virtualTree-enabled sites stay
		// on the existing per-invoke passive detection instead.
		if (!config.virtualTree.enabled) {
			resources.use(
				createFsWatcher(config.documentRoot, {
					hub,
					indexFileName: config.indexFileName,
				}),
			);
		}
	}

	const app = createApp({ config, resolverState, agent });
	const local = resources.use(
		await createLocalServer({ app, hostname: config.host, port: config.port }),
	);

	// LIFO on dispose: the HTTP/WS server stops accepting traffic first, then
	// the fs watcher, then the token file is deleted, then the hub's ping
	// timer/tabHub — the reverse of the `resources.use()` calls above.
	const shutdown = () => {
		void resources.disposeAsync().finally(() => process.exit(0));
	};
	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);

	return {
		port: local.port,
		url: local.url,
		agent,
		async [Symbol.asyncDispose]() {
			process.off('SIGINT', shutdown);
			process.off('SIGTERM', shutdown);
			await resources.disposeAsync();
		},
	};
}

/**
 * CLI entry point for `bge` (no subcommand). Resolves the user's config,
 * boots the server, optionally opens a browser, and prints the startup
 * banner.
 */
export async function runServerCommand(): Promise<void> {
	const { config, configDir } = await getUserConfig();
	const isWatchMode = process.env.DEV_MODE === 'true';

	const handle = await bootLocalServer(config, configDir);

	const relDocumentRoot =
		'.' + path.sep + path.relative(process.cwd(), config.documentRoot);

	if (config.open && !isWatchMode) {
		await open(handle.url);
	}

	const agentLoginUrl = handle.agent ? loginUrl(handle.url, handle.agent.auth) : null;

	process.stdout.write(`
🍔 ${c.bold.greenBright('BurgerEditor Local App')} 🍔

   ${c.blue('Location')}: ${c.bold(handle.url)}
   ${c.blue('DocumentRoot')}: ${c.bold.gray(relDocumentRoot)}
${
	agentLoginUrl
		? `
   ${c.yellow('Agent access requires a token')} — open this URL once to authorize this browser:
   ${c.bold(agentLoginUrl)}
   The token is also written to ${c.bold('.burgereditor/agent-token')} — add ${c.bold('.burgereditor/')} to .gitignore.
`
		: ''
}
   ${c.yellow('Enjoy Developing! 🎉')}
`);

	log('Config: %O', config);
}
