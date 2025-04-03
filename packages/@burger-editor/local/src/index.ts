#!/usr/bin/env node

import path from 'node:path';

import { serve } from '@hono/node-server';
import c from 'ansi-colors';
import { Hono } from 'hono';
import open from 'open';

import { log } from './helpers/debug.js';
import { getUserConfig } from './model/get-user-config.js';
import { setRoute } from './route.js';

const app = new Hono();
const userConfig = await getUserConfig();

const isWatchMode = process.env.DEV_MODE === 'true';

setRoute(app, userConfig);

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
