import type { AgentAuth } from '../agent/auth.js';
import type { AgentDeps } from '../agent/env.js';
import type { LocalServerConfig } from '../types.js';
import type { ResolveConfigOptions } from '@burger-editor/file-io';

import path from 'node:path';
import { inspect } from 'node:util';

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
	/** Always present; `required` is `false` on a loopback bind. Gates the whole app, not only the agent. */
	readonly auth: AgentAuth;
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
 *
 * On a successful boot it installs a process-global SIGINT/SIGTERM handler
 * that disposes every boot resource (HTTP/WS server, fs watcher, Agent Hub,
 * token file) and then exits — `0` when that disposal succeeds, `1` with the
 * cause on stderr when it fails. The handler detaches itself from both
 * signals before disposing, so a second signal of either kind during a stuck
 * disposal falls back to Node's default immediate exit. Disposing the
 * returned handle removes that handler, so a test must dispose it
 * (`await using`) to avoid leaving the handler installed in the test worker.
 *
 * When boot fails after resources were acquired (e.g. the port is in use),
 * those resources are disposed before the error propagates.
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

	// Disposed automatically if anything below throws (e.g. EADDRINUSE from
	// the bind), so a failed boot doesn't leave the token file on disk or the
	// watcher/hub timer holding the event loop open. Ownership moves to the
	// returned handle only once the server is listening.
	await using stack = new AsyncDisposableStack();
	// Created regardless of `agent.enabled`: on a non-loopback bind the token
	// gates the pages and `/api/content` / `/api/file` too, not only the agent.
	const auth = stack.use(await createAgentAuth(config.host, configDir));
	let agent: AgentDeps | null = null;
	if (config.agent.enabled) {
		const hub = stack.use(createAgentHub({ indexFileName: config.indexFileName }));
		agent = { hub, auth };
		// Only meaningful when a page's disk path IS its logical path — see
		// `fs-watcher.ts`'s doc comment for why virtualTree-enabled sites stay
		// on the existing per-invoke passive detection instead.
		if (!config.virtualTree.enabled) {
			stack.use(
				createFsWatcher(config.documentRoot, {
					hub,
					indexFileName: config.indexFileName,
				}),
			);
		}
	}

	const app = createApp({ config, resolverState, agent, auth });
	const local = stack.use(
		await createLocalServer({ app, hostname: config.host, port: config.port }),
	);
	const resources = stack.move();

	// LIFO on dispose: the HTTP/WS server stops accepting traffic first, then
	// the fs watcher, then the hub's ping timer/tabHub, then the token file is
	// deleted — the reverse of the `stack.use()` calls above. A failed dispose
	// exits 1 with the cause on stderr rather than reporting a clean shutdown.
	const shutdown = () => {
		// Detach both up front: a second signal of either kind during a stuck
		// disposal then hits Node's default immediate exit instead of
		// re-entering here, where the already-disposing stack would resolve at
		// once and exit 0 mid-teardown.
		process.off('SIGINT', shutdown);
		process.off('SIGTERM', shutdown);
		resources.disposeAsync().then(
			() => process.exit(0),
			(error: unknown) => {
				// `inspect` rather than `.stack`: when several disposers fail, the
				// SuppressedError's own stack hides the real causes it carries.
				// Exit from the write callback so a piped (async) stderr isn't cut off.
				process.stderr.write(
					`BurgerEditor: failed to shut down cleanly\n${inspect(error)}\n`,
					() => process.exit(1),
				);
			},
		);
	};
	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);

	return {
		port: local.port,
		url: local.url,
		agent,
		auth,
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
 * banner. If a step after boot fails (e.g. opening the browser), the booted
 * server is disposed before the error propagates.
 * @param configOptions Which config file to boot with (`--config`)
 */
export async function runServerCommand(
	configOptions: ResolveConfigOptions = {},
): Promise<void> {
	const { config, configDir, configPath } = await getUserConfig(configOptions);
	const isWatchMode = process.env.DEV_MODE === 'true';

	const handle = await bootLocalServer(config, configDir);
	try {
		await announce(handle, config, configPath, isWatchMode);
	} catch (error) {
		// e.g. `open()` failing: without this the server, its signal handlers
		// and the token file would outlive a command that already failed.
		await handle[Symbol.asyncDispose]();
		throw error;
	}
	log('Config: %O', config);
}

/**
 * Open the browser (unless disabled) and print the startup banner.
 * @param handle
 * @param config
 * @param configPath
 * @param isWatchMode
 */
async function announce(
	handle: LocalServerHandle,
	config: LocalServerConfig,
	configPath: string | null,
	isWatchMode: boolean,
): Promise<void> {
	// With several configs in one repository (`--config` / `BGE_CONFIG`), the
	// banner is where the operator confirms which one this server is using.
	const configLabel = configPath
		? c.bold.gray(toDisplayPath(configPath))
		: c.yellow('not found — using defaults');

	if (config.open && !isWatchMode) {
		await open(handle.url);
	}

	const agentLoginUrl = loginUrl(handle.url, handle.auth);
	const tokenFilePath = handle.auth.tokenFilePath;

	process.stdout.write(`
🍔 ${c.bold.greenBright('BurgerEditor Local App')} 🍔

   ${c.blue('Location')}: ${c.bold(handle.url)}
   ${c.blue('Config')}: ${configLabel}
   ${c.blue('DocumentRoot')}: ${c.bold.gray(toDisplayPath(config.documentRoot))}
${
	agentLoginUrl && tokenFilePath
		? `
   ${c.yellow('Access requires a token')} — open this URL once to authorize this browser:
   ${c.bold(agentLoginUrl)}
   The token is also written to ${c.bold(toDisplayPath(tokenFilePath))} — add ${c.bold('.burgereditor/')} to .gitignore.
`
		: ''
}
   ${c.yellow('Enjoy Developing! 🎉')}
`);
}

/**
 * `./`-prefixed path relative to the working directory, for the banner. A
 * path outside the working directory (reachable via `--config`) stays
 * absolute rather than turning into a `./../../..` chain.
 * @param absolutePath
 */
function toDisplayPath(absolutePath: string): string {
	const relative = path.relative(process.cwd(), absolutePath);
	if (
		relative === '..' ||
		relative.startsWith('..' + path.sep) ||
		path.isAbsolute(relative)
	) {
		return absolutePath;
	}
	return '.' + path.sep + relative;
}
