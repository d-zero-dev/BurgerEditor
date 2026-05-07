import path from 'node:path';

import { serve } from '@hono/node-server';
import c from 'ansi-colors';
import { Hono } from 'hono';
import open from 'open';

import { log } from '../helpers/debug.js';
import { getUserConfig } from '../model/get-user-config.js';
import { loadResolverState } from '../model/virtual-path-resolver.js';
import { setRoute } from '../route.js';

/**
 * Boot the local BurgerEditor server. Reads the user config via cosmiconfig,
 * pre-loads the virtualTree resolver state if enabled, mounts the Hono routes,
 * and prints a banner.
 *
 * If `virtualTree.enabled` is true and the documentRoot contains files that
 * violate the virtualTree contract (missing `pathKey`, non-string value, or
 * conflicting logical paths), this throws synchronously before the HTTP server
 * binds, so process startup fails loudly instead of serving a broken state.
 * @returns A promise that resolves once the banner has been printed. The HTTP
 *          server keeps running afterwards and is not awaited here.
 */
export async function runServerCommand(): Promise<void> {
	const app = new Hono();
	const userConfig = await getUserConfig();

	const isWatchMode = process.env.DEV_MODE === 'true';

	const resolverState = userConfig.virtualTree.enabled
		? await loadResolverState(userConfig.documentRoot, userConfig.virtualTree.pathKey)
		: null;

	setRoute(app, userConfig, resolverState);

	serve({
		fetch: app.fetch,
		hostname: userConfig.host,
		port: userConfig.port,
	});

	const location = `http://${userConfig.host}:${userConfig.port}`;
	const relDocumentRoot =
		'.' + path.sep + path.relative(process.cwd(), userConfig.documentRoot);

	if (userConfig.open && !isWatchMode) {
		await open(location);
	}

	process.stdout.write(`
🍔 ${c.bold.greenBright('BurgerEditor Local App')} 🍔

   ${c.blue('Location')}: ${c.bold(location)}
   ${c.blue('DocumentRoot')}: ${c.bold.gray(relDocumentRoot)}

   ${c.yellow('Enjoy Developing! 🎉')}
`);

	log('Config: %O', userConfig);
}
