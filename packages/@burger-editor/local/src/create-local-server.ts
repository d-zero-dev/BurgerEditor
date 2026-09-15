import type { ServerType } from '@hono/node-server';
import type { Hono } from 'hono';

import { once } from 'node:events';

import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';

export interface LocalServer extends AsyncDisposable {
	readonly server: ServerType;
	/** Actual bound port — differs from the requested one when `port: 0`. */
	readonly port: number;
	/** `http://${hostname}:${port}` — what the banner prints and `open()` launches. */
	readonly url: string;
	readonly wss: WebSocketServer;
}

export interface CreateLocalServerOptions {
	readonly app: { readonly fetch: Hono['fetch'] };
	readonly hostname: string;
	readonly port: number;
	/**
	 * Provide a pre-built `WebSocketServer({ noServer: true })` to observe its
	 * `connection` event or otherwise inspect it; otherwise one is created.
	 */
	readonly wss?: WebSocketServer;
}

/**
 * Bind `app` with `@hono/node-server`'s `serve()` plus a `noServer` `ws`
 * `WebSocketServer` for `/ws/editor`, and resolve once the socket is
 * listening. The returned handle is `AsyncDisposable`: disposing terminates
 * open WebSocket clients, drops keep-alive HTTP connections, and awaits
 * `server.close()` — this is the shutdown path `runServerCommand` used to
 * discard entirely (issue #869).
 * @param options
 * @example
 * await using local = await createLocalServer({ app, hostname: '127.0.0.1', port: 0 });
 * const res = await fetch(`${local.url}/api/health`);
 */
export async function createLocalServer(
	options: CreateLocalServerOptions,
): Promise<LocalServer> {
	const wss = options.wss ?? new WebSocketServer({ noServer: true });
	const server = serve({
		fetch: options.app.fetch,
		hostname: options.hostname,
		port: options.port,
		websocket: { server: wss },
	});
	await once(server, 'listening');
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : options.port;

	return {
		server,
		wss,
		port,
		url: `http://${options.hostname}:${port}`,
		async [Symbol.asyncDispose]() {
			// node-server registers `server.on('close', () => wss.close())` for
			// us, but `wss.close()` (ws@8) only stops accepting NEW connections —
			// it does not close already-open clients, so disposal would otherwise
			// wait on them forever.
			for (const client of wss.clients) {
				client.terminate();
			}
			// Likewise, an idle keep-alive HTTP connection blocks `server.close()`
			// from firing its callback unless dropped explicitly. Only `http.Server`
			// (not the Http2 variants) has this method.
			if ('closeAllConnections' in server) {
				server.closeAllConnections();
			}
			await new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()));
			});
		},
	};
}
