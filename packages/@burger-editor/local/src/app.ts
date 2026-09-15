import type { AgentDeps } from './agent/env.js';
import type { AppContext } from './app-context.js';
import type { ResolverState } from './model/virtual-path-resolver.js';
import type { LocalServerConfig } from './types.js';

import path from 'node:path';

import { Hono } from 'hono';

import { createAgentRoutes } from './agent/route.js';
import { HEALTH_CHECK_END_POINT } from './constants.js';
import { defaultConfig } from './model/default-config.js';
import { createResolverStateStore } from './resolver-state-store.js';
import { createContentApi } from './routes/content-api.js';
import { createFileApi } from './routes/file-api.js';
import { createPageRoutes } from './routes/pages.js';
import { assetsFallback, mountAppAssets, mountMediaDirs } from './routes/static.js';
import { tokenLogin } from './routes/token-login.js';
import { createWsRoutes } from './routes/ws.js';

const defaultClientDir = path.resolve(import.meta.dirname, '..', 'dist');
const defaultStyleDir = path.resolve(import.meta.dirname, '..', 'style');

export interface CreateAppOptions {
	readonly config: LocalServerConfig;
	/** Pre-loaded resolver state. `null`/omitted when `virtualTree.enabled` is `false`. */
	readonly resolverState?: ResolverState | null;
	/** `null`/omitted (agent.enabled: false) mounts the agent/WS sub-apps in a 404-everything state. */
	readonly agent?: AgentDeps | null;
	/**
	 * Where the built client assets are read from. Defaults to the package's
	 * own `dist`/`style` directories; overridable so a spec can point at a
	 * fixture directory instead of requiring a `vite build` first.
	 */
	readonly assetDirs?: { readonly clientDir?: string; readonly styleDir?: string };
}

/**
 * Build the complete local-CMS Hono app without binding a socket. Pass it to
 * {@link import('./create-local-server.js').createLocalServer} for
 * production, or drive it directly with `app.request()` / `testClient(app)`
 * in specs — nothing here starts a server or opens a port.
 *
 * Route registration order matters: media directories are mounted before the
 * page routes (an uploaded `/files/x.html` must be served as a static file,
 * not fall through to the page renderer), `/api/agent` and `/ws` are
 * `.route()`d before the trailing asset catch-all (whose `/:file{.+$}}`-style
 * fallthrough would otherwise shadow them), and the catch-all itself is the
 * very last thing registered.
 * @param options
 * @example
 * const app = createApp({ config, resolverState: null });
 * const res = await app.request('/api/health');
 */
export function createApp(options: CreateAppOptions) {
	const { config } = options;
	const store = createResolverStateStore(options.resolverState ?? null);
	const agent = options.agent ?? null;
	const ctx: AppContext = { config, store, agent };
	const assetDirs = {
		clientDir: defaultClientDir,
		styleDir: defaultStyleDir,
		...options.assetDirs,
	};

	const app = new Hono().use('*', tokenLogin(agent?.auth ?? null));
	mountMediaDirs(app, config);
	mountAppAssets(app, assetDirs);

	const routes = app
		.get('/config.json', (c) => c.json({ ...defaultConfig, ...config }))
		.get(HEALTH_CHECK_END_POINT, (c) => c.json({ status: 'ok', timestamp: Date.now() }))
		.route('/api', createContentApi(ctx))
		.route('/api/file', createFileApi(config))
		.route('/api/agent', createAgentRoutes(config, store, agent))
		.route('/ws', createWsRoutes(config, agent))
		.route('/', createPageRoutes(ctx));

	// Statement, not a chain link — GET-only like the handlers it replaces,
	// and keeping it off the chain keeps its string-typed catch-all path out
	// of AppType (nothing calls it through `hc`).
	routes.get('*', assetsFallback(config.assetsRoot));
	routes.notFound((c) => c.text('Not Found', 404));

	return routes;
}

export type AppType = ReturnType<typeof createApp>;
