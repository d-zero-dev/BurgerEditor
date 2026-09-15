import type { AgentAuth } from '../agent/auth.js';
import type { AgentDeps } from '../agent/env.js';
import type { AgentHub, AgentHubOptions } from '../agent/hub.js';
import type { AppType } from '../app.js';
import type { LocalServerConfig } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { testClient } from 'hono/testing';
import { WebSocket } from 'ws';

import { createAgentAuth } from '../agent/auth.js';
import { createAgentHub } from '../agent/hub.js';
import { createApp } from '../app.js';
import { createLocalServer } from '../create-local-server.js';
import { loadResolverState } from '../model/virtual-path-resolver.js';

import { IDLE_UI_STATE } from './protocol-fixtures.js';

export interface LocalServerConfigOverrides extends Partial<
	Omit<LocalServerConfig, 'documentRoot' | 'virtualTree' | 'agent'>
> {
	readonly documentRoot: string;
	/** Defaults to `documentRoot`. */
	readonly assetsRoot?: string;
	readonly virtualTree?: Partial<LocalServerConfig['virtualTree']>;
	readonly agent?: Partial<LocalServerConfig['agent']>;
}

/**
 * Single canonical `LocalServerConfig` factory — replaces the four
 * near-identical hand-rolled `makeConfig` copies that used to live across
 * `route.spec.ts`, `agent/route.spec.ts`, `agent/auth-flow.spec.ts`, and
 * `agent/ws.spec.ts`.
 * @param overrides
 */
export function makeLocalServerConfig(
	overrides: LocalServerConfigOverrides,
): LocalServerConfig {
	const {
		documentRoot,
		assetsRoot = documentRoot,
		virtualTree,
		agent,
		...rest
	} = overrides;
	const dir = (serverPath: string) => ({ serverPath, clientPath: '/files' as const });
	return {
		version: '0.0.0-test',
		port: 0,
		host: 'localhost',
		documentRoot,
		assetsRoot,
		lang: 'en',
		stylesheets: [],
		classList: [],
		editableArea: '.content',
		indexFileName: 'index.html',
		filesDir: {
			image: dir(assetsRoot),
			pdf: dir(assetsRoot),
			video: dir(assetsRoot),
			audio: dir(assetsRoot),
			other: dir(assetsRoot),
		},
		sampleImagePath: '/files/sample.png',
		sampleFilePath: '/files/sample.pdf',
		googleMapsApiKey: null,
		open: false,
		newFileContent: '<!doctype html><html><body></body></html>',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		catalog: {} as any,
		enableImportBlock: false,
		healthCheck: { enabled: false, interval: 10_000, retryCount: 3 },
		virtualTree: { enabled: false, pathKey: 'path', ...virtualTree },
		agent: { enabled: true, ...agent },
		...rest,
	};
}

export interface TmpRoots extends AsyncDisposable {
	/** Parent of `documentRoot`/`assetsRoot`; also the `configDir` the agent token file is written under. */
	readonly path: string;
	readonly documentRoot: string;
	readonly assetsRoot: string;
}

/**
 * @param prefix
 * @param options
 * @param options.pages relative path → content, written under `documentRoot`
 */
export async function makeTmpRoots(
	prefix = 'bge-local-',
	options: { readonly pages?: Readonly<Record<string, string>> } = {},
): Promise<TmpRoots> {
	const tmp = await mkdtempDisposable(prefix);
	const documentRoot = path.join(tmp.path, 'docs');
	const assetsRoot = path.join(tmp.path, 'assets');
	await fs.mkdir(documentRoot);
	await fs.mkdir(assetsRoot);
	for (const [rel, content] of Object.entries(options.pages ?? {})) {
		await fs.writeFile(path.join(documentRoot, rel), content, 'utf8');
	}
	return {
		path: tmp.path,
		documentRoot,
		assetsRoot,
		[Symbol.asyncDispose]: () => tmp[Symbol.asyncDispose](),
	};
}

/**
 * @param host
 */
export function withHost(host: string): Record<string, string> {
	return { host };
}

/**
 * Set `Host` only if the caller did not already provide one — some tests deliberately send a foreign Host.
 * @param host
 * @param init
 */
function mergeHost(host: string, init: RequestInit): Headers {
	const headers = new Headers(init.headers);
	if (!headers.has('host')) {
		headers.set('host', host);
	}
	return headers;
}

export type TestClient = ReturnType<typeof testClient<AppType>>;

export interface TestAppOptions {
	readonly config: LocalServerConfig;
	/** Where `createAgentAuth` persists the token. Defaults to `path.dirname(config.documentRoot)` (the tmp root). */
	readonly configDir?: string;
	/** Forwarded to `createAgentHub` (e.g. `{ now }`), merged over `{ indexFileName }`. */
	readonly hub?: AgentHubOptions;
}

export interface TestApp extends AsyncDisposable {
	readonly app: AppType;
	/** `hono/testing` client with `Host: config.host` as a default header. */
	readonly client: TestClient;
	readonly config: LocalServerConfig;
	/** `null` when `config.agent.enabled` is `false`. */
	readonly hub: AgentHub | null;
	readonly auth: AgentAuth | null;
	/** `app.request` with `Host: config.host` injected unless the caller set one. */
	request(urlPath: string, init?: RequestInit): Promise<Response>;
	/** `POST /api/agent/invoke` — untyped on purpose (the route has no `zValidator`). */
	invoke(body: unknown, headers?: Record<string, string>): Promise<Response>;
}

/**
 * Build a `createApp()` instance the way production boots one — including
 * mirroring `bootLocalServer`'s strict-mode resolver load — minus the
 * `process.exit` on failure, so a documentRoot with malformed Front Matter
 * makes this REJECT instead.
 * @param options
 */
export async function createTestApp(options: TestAppOptions): Promise<TestApp> {
	const { config } = options;
	let resolverState = null;
	if (config.virtualTree.enabled) {
		const loaded = await loadResolverState(
			config.documentRoot,
			config.virtualTree.pathKey,
			{ strict: true },
		);
		resolverState = loaded.state;
	}

	let hub: AgentHub | null = null;
	let auth: AgentAuth | null = null;
	let agent: AgentDeps | null = null;
	if (config.agent.enabled) {
		hub = createAgentHub({ indexFileName: config.indexFileName, ...options.hub });
		auth = await createAgentAuth(
			config.host,
			options.configDir ?? path.dirname(config.documentRoot),
		);
		agent = { hub, auth };
	}
	const app = createApp({ config, resolverState, agent });
	const request = async (urlPath: string, init: RequestInit = {}) =>
		app.request(urlPath, { ...init, headers: mergeHost(config.host, init) });

	return {
		app,
		config,
		hub,
		auth,
		request,
		client: testClient(app, undefined, undefined, { headers: withHost(config.host) }),
		invoke: (body, headers = {}) =>
			request('/api/agent/invoke', {
				method: 'POST',
				headers: { 'content-type': 'application/json', ...headers },
				body: JSON.stringify(body),
			}),
		async [Symbol.asyncDispose]() {
			hub?.dispose();
			await auth?.[Symbol.asyncDispose]();
		},
	};
}

export interface TestServer extends TestApp {
	readonly port: number;
	/** `http://127.0.0.1:<port>` */
	readonly url: string;
	/** Real `fetch` against `url`, with `Host: config.host` injected unless overridden. */
	fetch(urlPath: string, init?: RequestInit): Promise<Response>;
	/** Opens `/ws/editor`; resolves on `open`, rejects with the `ws` error on handshake failure. */
	connectWs(headers?: Record<string, string>): Promise<WebSocket>;
	/** `connectWs` + `hello` for `page`; resolves with the `welcome` frame. */
	connectTab(
		page?: string,
		headers?: Record<string, string>,
	): Promise<{ ws: WebSocket; welcome: Record<string, unknown> }>;
	/** Attempts an upgrade and resolves with the HTTP status the handshake was rejected with. */
	upgradeStatus(headers?: Record<string, string>): Promise<number>;
}

/**
 * Boot the real Hono app on a random loopback port for the handful of specs
 * that genuinely need a socket (WebSocket handshake/frame behavior). Always
 * LISTENS on `127.0.0.1` — a TEST-NET address can't be bound, and
 * `'localhost'` may resolve differently for bind vs. connect on some CI
 * runners — while `config.host` is only what `hostGuard`/`createAgentAuth`
 * see, and clients send it as their `Host` header.
 * @param options
 */
export async function createTestServer(options: TestAppOptions): Promise<TestServer> {
	const testApp = await createTestApp(options);
	const server = await createLocalServer({
		app: testApp.app,
		hostname: '127.0.0.1',
		port: 0,
	});
	const sockets = new Set<WebSocket>();
	const host = testApp.config.host;

	const connectWs = (headers: Record<string, string> = {}) =>
		new Promise<WebSocket>((resolve, reject) => {
			const ws = new WebSocket(`${server.url.replace('http', 'ws')}/ws/editor`, {
				headers: { host, ...headers },
			});
			sockets.add(ws);
			ws.once('open', () => resolve(ws));
			ws.once('error', reject);
		});

	return {
		...testApp,
		port: server.port,
		url: server.url,
		fetch: (urlPath, init = {}) =>
			fetch(`${server.url}${urlPath}`, { ...init, headers: mergeHost(host, init) }),
		invoke: (body, headers = {}) =>
			fetch(`${server.url}/api/agent/invoke`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', host, ...headers },
				body: JSON.stringify(body),
			}),
		connectWs,
		async connectTab(page = '/a.html', headers) {
			const ws = await connectWs(headers);
			const welcomePromise = nextMessage(ws);
			ws.send(
				JSON.stringify({
					type: 'hello',
					page,
					revision: 1,
					serverSession: testApp.hub!.serverSession,
					uiState: IDLE_UI_STATE,
				}),
			);
			return { ws, welcome: await welcomePromise };
		},
		async upgradeStatus(headers) {
			const outcome = await connectWs(headers).then(
				(ws) => {
					ws.close();
					throw new Error('upgrade unexpectedly succeeded');
				},
				(error: Error) => error,
			);
			const match = /Unexpected server response: (\d{3})/.exec(outcome.message);
			if (!match) {
				throw outcome;
			}
			return Number(match[1]);
		},
		async [Symbol.asyncDispose]() {
			for (const ws of sockets) {
				ws.close();
			}
			await server[Symbol.asyncDispose]();
			await testApp[Symbol.asyncDispose]();
		},
	};
}

/**
 * @param ws
 */
export function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
	return new Promise((resolve) => {
		ws.once('message', (data: Buffer) => resolve(JSON.parse(data.toString('utf8'))));
	});
}

/**
 * @param ws
 */
export function nextClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
	return new Promise((resolve) => {
		ws.once('close', (code: number, reason: Buffer) =>
			resolve({ code, reason: reason.toString('utf8') }),
		);
	});
}

// Re-exported so specs that only need a raw `noServer` WebSocketServer (to
// observe its `connection` event alongside `createLocalServer`) don't need a
// second import from `ws`.

export { WebSocketServer } from 'ws';
