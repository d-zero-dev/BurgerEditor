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

import { createAgentAuth } from './auth.js';
import { createAgentHub } from './hub.js';

const PAGE_HTML =
	'<html><body><div class="content"><div data-bge-name="text" data-bge-container="grid:1" id="bge-1">' +
	'<div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item="">' +
	'<div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>hello</p></div></div>' +
	'</div></div></div></div></div></body></html>';

/**
 * @param documentRoot
 */
function makeConfig(documentRoot: string): LocalServerConfig {
	return {
		version: '0.0.0-test',
		port: 0,
		host: 'localhost',
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

beforeEach(async () => {
	tmp = await mkdtempDisposable('bge-agent-ws-');
	documentRoot = path.join(tmp.path, 'docs');
	await fs.mkdir(documentRoot);
	await fs.writeFile(path.join(documentRoot, 'a.html'), PAGE_HTML, 'utf8');
});

afterEach(async () => {
	server?.close();
	await tmp?.[Symbol.asyncDispose]();
});

/**
 *
 */
async function bootServer() {
	const app = new Hono();
	const hub = createAgentHub();
	const auth = await createAgentAuth('localhost', '/tmp/unused');
	const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
	setRoute(app, makeConfig(documentRoot), null, { hub, auth, upgradeWebSocket });
	server = serve({ fetch: app.fetch, hostname: 'localhost', port: 0 });
	injectWebSocket(server);
	await new Promise((resolve) => server!.once('listening', resolve));
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	return { hub, port };
}

/**
 * @param port
 */
function connect(port: number): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://localhost:${port}/ws/editor`, {
			headers: { host: 'localhost' },
		});
		ws.once('open', () => resolve(ws));
		ws.once('error', reject);
	});
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
