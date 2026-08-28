import type { LocalServerConfig } from '../types.js';
import type { ServerType } from '@hono/node-server';

import fs from 'node:fs/promises';
import path from 'node:path';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { WebSocket } from 'ws';

import { setRoute } from '../route.js';

import { createAgentAuth, type AgentAuth } from './auth.js';
import { createAgentHub, type AgentHub } from './hub.js';

const PAGE_HTML =
	'<html><body><div class="content"><div data-bge-name="text" data-bge-container="grid:1" id="bge-1">' +
	'<div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item="">' +
	'<div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>hello</p></div></div>' +
	'</div></div></div></div></div></body></html>';

/**
 * What a real tab acks with: the editable area's INNER content (what
 * `engine.content.getContentsAsString()` returns), never a full document.
 */
const PAGE_INNER = PAGE_HTML.replace('<html><body><div class="content">', '').replace(
	'</div></body></html>',
	'',
);

const IDLE_UI_STATE = {
	openDialog: null,
	sourceMode: false,
	processing: false,
	editingBlockIndex: null,
};

/** A TEST-NET-3 address (RFC 5737) — non-loopback, so `createAgentAuth` requires a token. */
const LAN_HOST = '203.0.113.10';

/**
 * @param documentRoot
 * @param host
 */
function makeConfig(
	documentRoot: string,
	host: LocalServerConfig['host'] = 'localhost',
): LocalServerConfig {
	return {
		version: '0.0.0-test',
		port: 0,
		host,
		documentRoot,
		assetsRoot: documentRoot,
		lang: 'en',
		stylesheets: [],
		classList: [],
		editableArea: '.content',
		indexFileName: 'index.html',
		filesDir: {
			image: { serverPath: documentRoot, clientPath: '/files' },
			pdf: { serverPath: documentRoot, clientPath: '/files' },
			video: { serverPath: documentRoot, clientPath: '/files' },
			audio: { serverPath: documentRoot, clientPath: '/files' },
			other: { serverPath: documentRoot, clientPath: '/files' },
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
		virtualTree: { enabled: false, pathKey: 'path' },
		agent: { enabled: true },
	};
}

let tmp: ({ path: string } & AsyncDisposable) | undefined;
let documentRoot: string;
let server: ServerType | undefined;
let bootedHub: AgentHub | undefined;

beforeEach(async () => {
	tmp = await mkdtempDisposable('bge-agent-ws-');
	documentRoot = path.join(tmp.path, 'docs');
	await fs.mkdir(documentRoot);
	await fs.writeFile(path.join(documentRoot, 'a.html'), PAGE_HTML, 'utf8');
});

afterEach(async () => {
	bootedHub?.dispose();
	bootedHub = undefined;
	server?.close();
	await tmp?.[Symbol.asyncDispose]();
});

/**
 * Boot the real Hono app on a random loopback port. The server always
 * LISTENS on localhost (tests can't bind a TEST-NET address); `host` is
 * only what `hostGuard` / `createAgentAuth` are configured with, and clients
 * send it as their `Host` header.
 * @param options
 * @param options.host
 */
async function bootServer(options: { readonly host?: LocalServerConfig['host'] } = {}) {
	const host = options.host ?? 'localhost';
	const app = new Hono();
	const userConfig = makeConfig(documentRoot, host);
	const hub = createAgentHub({ indexFileName: userConfig.indexFileName });
	bootedHub = hub;
	const auth: AgentAuth = await createAgentAuth(host, tmp!.path);
	const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
	setRoute(app, userConfig, null, { hub, auth, upgradeWebSocket });
	server = serve({ fetch: app.fetch, hostname: 'localhost', port: 0 });
	injectWebSocket(server);
	await new Promise((resolve) => server!.once('listening', resolve));
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	return { hub, port, auth, host };
}

/**
 * @param port
 * @param headers
 */
function connect(port: number, headers?: Record<string, string>) {
	return new Promise<WebSocket>((resolve, reject) => {
		const ws = new WebSocket(`ws://localhost:${port}/ws/editor`, {
			headers: headers ?? { host: 'localhost' },
		});
		ws.once('open', () => resolve(ws));
		ws.once('error', reject);
	});
}

/**
 * Open a socket, send `hello` for `page`, and wait for `welcome`.
 * @param port
 * @param serverSession
 * @param page
 */
async function connectTab(port: number, serverSession: string, page = '/a.html') {
	const ws = await connect(port);
	const welcomePromise = nextMessage(ws);
	ws.send(
		JSON.stringify({
			type: 'hello',
			page,
			revision: 1,
			serverSession,
			uiState: IDLE_UI_STATE,
		}),
	);
	const welcome = await welcomePromise;
	return { ws, welcome };
}

/**
 * @param port
 * @param body
 * @param headers
 */
async function invoke(port: number, body: unknown, headers: Record<string, string> = {}) {
	return fetch(`http://localhost:${port}/api/agent/invoke`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});
}

/**
 * The protocol's two-call read: the first `page_blocks` returns count +
 * readToken, the second (with that token) returns the block list and a token
 * good for the following mutation.
 * @param port
 * @param pathInput
 */
async function readViaProtocol(port: number, pathInput: string) {
	const first = await invoke(port, { tool: 'page_blocks', args: { path: pathInput } });
	const firstBody = (await first.json()) as { result: { readToken: string } };
	const second = await invoke(port, {
		tool: 'page_blocks',
		args: { path: pathInput, readToken: firstBody.result.readToken },
	});
	const secondBody = (await second.json()) as {
		result: { readToken: string; blocks: readonly unknown[] };
	};
	return {
		first,
		second,
		readToken: secondBody.result.readToken,
		blocks: secondBody.result.blocks,
	};
}

/**
 * @param ws
 */
function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
	return new Promise((resolve) => {
		ws.once('message', (data: Buffer) => resolve(JSON.parse(data.toString('utf8'))));
	});
}

describe('WS /ws/editor (real socket, real HTTP server)', () => {
	test('a connecting tab receives welcome after hello, and the hub relays an invoke to it as apply', async () => {
		const { hub, port } = await bootServer();
		const ws = await connect(port);
		try {
			const welcomePromise = nextMessage(ws);
			ws.send(
				JSON.stringify({
					type: 'hello',
					page: '/a.html',
					revision: 1,
					serverSession: hub.serverSession,
					uiState: {
						openDialog: null,
						sourceMode: false,
						processing: false,
						editingBlockIndex: null,
					},
				}),
			);
			const welcome = await welcomePromise;
			expect(welcome.type).toBe('welcome');

			const applyPromise = nextMessage(ws);
			const applyResultPromise = hub.tabHub.apply(
				'/a.html',
				'main',
				{ op: 'delete', index: 0 },
				1,
				true,
			);
			const apply = await applyPromise;
			expect(apply.type).toBe('apply');

			ws.send(
				JSON.stringify({
					type: 'ack',
					id: apply.id,
					revision: 2,
					html: '<div class="content"></div>',
				}),
			);
			const result = await applyResultPromise;
			expect(result.html).toBe('<div class="content"></div>');
		} finally {
			ws.close();
		}
	});

	test('an HTTP item_update is relayed to the connected tab as a literal apply frame, and the acked HTML is what lands on disk', async () => {
		const { hub, port } = await bootServer();
		const { ws } = await connectTab(port, hub.serverSession, '/a.html');
		try {
			const { first, second, readToken, blocks } = await readViaProtocol(port, '/a.html');
			expect(first.status).toBe(200);
			expect(second.status).toBe(200);
			expect(blocks).toHaveLength(1);

			const applyPromise = nextMessage(ws);
			const responsePromise = invoke(port, {
				tool: 'item_update',
				args: {
					path: '/a.html',
					target: { index: 0 },
					itemIndex: 0,
					data: { wysiwyg: '<p>acked via ws</p>' },
					readToken,
				},
			});

			const apply = await applyPromise;
			expect(apply).toEqual({
				type: 'apply',
				id: expect.any(String),
				area: 'main',
				op: {
					op: 'update-item',
					index: 0,
					itemIndex: 0,
					data: { wysiwyg: '<p>acked via ws</p>' },
				},
				baseRevision: 1,
				revision: 2,
				highlight: true,
			});

			const ackedHtml = PAGE_INNER.replace('hello', 'acked via ws');
			ws.send(
				JSON.stringify({ type: 'ack', id: apply.id, revision: 2, html: ackedHtml }),
			);

			const res = await responsePromise;
			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				ok: boolean;
				appliedTo: string;
				result: { appliedTo: string; path: string; dryRun: boolean; readToken: string };
			};
			expect(body.ok).toBe(true);
			expect(body.appliedTo).toBe('browser');
			expect(body.result.appliedTo).toBe('browser');
			expect(body.result.path).toBe('/a.html');
			expect(body.result.dryRun).toBe(false);

			const written = await fs.readFile(path.join(documentRoot, 'a.html'), 'utf8');
			expect(written).toContain('<p>acked via ws</p>');
			expect(written).not.toContain('<p>hello</p>');
			expect(written).toContain('<div class="content">');
		} finally {
			ws.close();
		}
	});

	test('a malformed frame from the tab is ignored and the socket stays usable', async () => {
		const { hub, port } = await bootServer();
		const { ws } = await connectTab(port, hub.serverSession);
		try {
			ws.send('{this is not json');
			ws.send(JSON.stringify({ type: 'teleport' }));
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(hub.tabHub.primaryTabFor('/a.html')).not.toBeNull();

			const applyPromise = nextMessage(ws);
			void hub.tabHub
				.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1)
				.catch(() => {});
			const apply = await applyPromise;
			expect(apply.type).toBe('apply');
		} finally {
			ws.close();
		}
	});

	test('closing the socket disconnects the tab from the hub', async () => {
		const { hub, port } = await bootServer();
		const ws = await connect(port);
		const welcomePromise = nextMessage(ws);
		ws.send(
			JSON.stringify({
				type: 'hello',
				page: '/a.html',
				revision: 1,
				serverSession: hub.serverSession,
				uiState: {
					openDialog: null,
					sourceMode: false,
					processing: false,
					editingBlockIndex: null,
				},
			}),
		);
		await welcomePromise;
		expect(hub.tabHub.primaryTabFor('/a.html')).not.toBeNull();

		ws.close();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(hub.tabHub.primaryTabFor('/a.html')).toBeNull();
	});
});

describe('WS /ws/editor — non-loopback bind requires the session cookie or bearer', () => {
	/**
	 * @param ws
	 */
	function nextClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
		return new Promise((resolve) => {
			ws.once('close', (code: number, reason: Buffer) =>
				resolve({ code, reason: reason.toString('utf8') }),
			);
		});
	}

	test('an upgrade with no credentials is accepted at HTTP level and then closed with 1008 Unauthorized; no session is registered', async () => {
		const { hub, port } = await bootServer({ host: LAN_HOST });
		const ws = await connect(port, { host: LAN_HOST });
		const closed = await nextClose(ws);
		expect(closed).toEqual({ code: 1008, reason: 'Unauthorized' });
		expect(hub.tabHub.snapshotAll()).toEqual([]);
	});

	test('an upgrade carrying a wrong bge_session cookie is closed with 1008', async () => {
		const { hub, port } = await bootServer({ host: LAN_HOST });
		const ws = await connect(port, {
			host: LAN_HOST,
			cookie: 'bge_session=000000000000000000000000000000000000000000000000',
		});
		const closed = await nextClose(ws);
		expect(closed.code).toBe(1008);
		expect(hub.tabHub.snapshotAll()).toEqual([]);
	});

	test('an upgrade carrying the bge_session cookie registers a tab that receives welcome after hello', async () => {
		const { hub, port, auth } = await bootServer({ host: LAN_HOST });
		const ws = await connect(port, {
			host: LAN_HOST,
			cookie: `bge_session=${auth.token}`,
		});
		try {
			const welcomePromise = nextMessage(ws);
			ws.send(
				JSON.stringify({
					type: 'hello',
					page: '/a.html',
					revision: 1,
					serverSession: hub.serverSession,
					uiState: IDLE_UI_STATE,
				}),
			);
			const welcome = await welcomePromise;
			expect(welcome.type).toBe('welcome');
			expect(welcome.revision).toBe(1);
			expect(hub.tabHub.primaryTabFor('/a.html')?.id).toBe(welcome.sessionId);
		} finally {
			ws.close();
		}
	});

	test('an upgrade carrying Authorization: Bearer is accepted too', async () => {
		const { hub, port, auth } = await bootServer({ host: LAN_HOST });
		const ws = await connect(port, {
			host: LAN_HOST,
			authorization: `Bearer ${auth.token}`,
		});
		try {
			const welcomePromise = nextMessage(ws);
			ws.send(
				JSON.stringify({
					type: 'hello',
					page: '/a.html',
					revision: 1,
					serverSession: hub.serverSession,
					uiState: IDLE_UI_STATE,
				}),
			);
			const welcome = await welcomePromise;
			expect(welcome.type).toBe('welcome');
		} finally {
			ws.close();
		}
	});

	test('an upgrade whose Host header is an unlisted address is refused by hostGuard with HTTP 403', async () => {
		const { port } = await bootServer({ host: LAN_HOST });
		const error = await new Promise<Error>((resolve) => {
			const ws = new WebSocket(`ws://localhost:${port}/ws/editor`, {
				headers: { host: '203.0.113.99' },
			});
			ws.once('error', resolve);
		});
		expect(error.message).toBe('Unexpected server response: 403');
	});

	test('POST /api/agent/invoke over real HTTP without credentials is 401', async () => {
		const { port } = await bootServer({ host: LAN_HOST });
		const res = await invoke(
			port,
			{ tool: 'page_blocks', args: { path: '/a.html' } },
			{ host: LAN_HOST },
		);
		expect(res.status).toBe(401);
	});
});
