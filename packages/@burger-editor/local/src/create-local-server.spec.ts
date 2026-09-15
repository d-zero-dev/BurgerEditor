import { expect, test } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';

import {
	createTestApp,
	makeLocalServerConfig,
	makeTmpRoots,
	nextMessage,
} from './__tests__/fixtures.js';
import { IDLE_UI_STATE, PAGE_HTML } from './__tests__/protocol-fixtures.js';
import { createLocalServer } from './create-local-server.js';

test('listens on 127.0.0.1:0, reports port/url, and serves GET /api/health over real HTTP', async () => {
	await using roots = await makeTmpRoots('bge-boot-server-');
	await using t = await createTestApp({
		config: makeLocalServerConfig({
			documentRoot: roots.documentRoot,
			agent: { enabled: false },
		}),
	});
	await using server = await createLocalServer({
		app: t.app,
		hostname: '127.0.0.1',
		port: 0,
	});

	expect(server.port).toBeGreaterThan(0);
	expect(server.url).toBe(`http://127.0.0.1:${server.port}`);
	const res = await fetch(`${server.url}/api/health`, {
		headers: { connection: 'close' },
	});
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ status: 'ok', timestamp: expect.any(Number) });
});

test('asyncDispose closes the listener: a new connection is refused afterwards (regression: #869)', async () => {
	await using roots = await makeTmpRoots('bge-boot-server-');
	await using t = await createTestApp({
		config: makeLocalServerConfig({
			documentRoot: roots.documentRoot,
			agent: { enabled: false },
		}),
	});
	const server = await createLocalServer({ app: t.app, hostname: '127.0.0.1', port: 0 });
	await fetch(`${server.url}/api/health`, { headers: { connection: 'close' } });

	await server[Symbol.asyncDispose]();

	await expect(fetch(`${server.url}/api/health`)).rejects.toThrow();
	expect(server.server.listening).toBe(false);
});

test('the provided WebSocketServer performs the upgrade: hello → welcome through serve()', async () => {
	await using roots = await makeTmpRoots('bge-boot-server-', {
		pages: { 'a.html': PAGE_HTML },
	});
	await using t = await createTestApp({
		config: makeLocalServerConfig({ documentRoot: roots.documentRoot }),
		configDir: roots.path,
	});
	const wss = new WebSocketServer({ noServer: true });
	const connections: unknown[] = [];
	wss.on('connection', (ws) => connections.push(ws));

	await using server = await createLocalServer({
		app: t.app,
		hostname: '127.0.0.1',
		port: 0,
		wss,
	});

	const ws = await new Promise<WebSocket>((resolve, reject) => {
		const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws/editor`, {
			headers: { host: 'localhost' },
		});
		socket.once('open', () => resolve(socket));
		socket.once('error', reject);
	});
	const welcome = nextMessage(ws);
	ws.send(
		JSON.stringify({
			type: 'hello',
			page: '/a.html',
			revision: 1,
			serverSession: t.hub!.serverSession,
			uiState: IDLE_UI_STATE,
		}),
	);
	const welcomeMessage = await welcome;
	expect(welcomeMessage.type).toBe('welcome');
	expect(connections).toHaveLength(1);
	ws.close();
});
