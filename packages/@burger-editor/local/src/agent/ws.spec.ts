import type { LocalServerConfig } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
	createTestServer,
	makeLocalServerConfig,
	makeTmpRoots,
	nextMessage,
} from '../__tests__/fixtures.js';
import {
	IDLE_UI_STATE,
	LAN_HOST,
	PAGE_HTML,
	PAGE_INNER,
} from '../__tests__/protocol-fixtures.js';

/**
 * Boot the real Hono app on a random loopback port. `bootServer` always
 * LISTENS on `127.0.0.1` (tests can't bind a TEST-NET address, and
 * `'localhost'` resolves to a different address than the client's for the
 * bind vs. the connect DNS lookup on some CI runners, refusing every
 * connection); `host` is only what `hostGuard` / `createAgentAuth` are
 * configured with, and clients send it as their `Host` header.
 * @param host
 */
async function bootServer(host: LocalServerConfig['host'] = 'localhost') {
	const roots = await makeTmpRoots('bge-agent-ws-', { pages: { 'a.html': PAGE_HTML } });
	const server = await createTestServer({
		config: makeLocalServerConfig({ documentRoot: roots.documentRoot, host }),
		configDir: roots.path,
	});
	return {
		...server,
		roots,
		async [Symbol.asyncDispose]() {
			await server[Symbol.asyncDispose]();
			await roots[Symbol.asyncDispose]();
		},
	};
}

/**
 * The protocol's two-call read: the first `page_blocks` returns count +
 * readToken, the second (with that token) returns the block list and a token
 * good for the following mutation.
 * @param t
 * @param pathInput
 */
async function readViaProtocol(
	t: Awaited<ReturnType<typeof bootServer>>,
	pathInput: string,
) {
	const first = await t.invoke({ tool: 'page_blocks', args: { path: pathInput } });
	const firstBody = (await first.json()) as { result: { readToken: string } };
	const second = await t.invoke({
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

describe('WS /ws/editor (real socket, real HTTP server)', () => {
	test('a connecting tab receives welcome after hello, and the hub relays an invoke to it as apply', async () => {
		await using t = await bootServer();
		const ws = await t.connectWs();
		try {
			const welcomePromise = nextMessage(ws);
			ws.send(
				JSON.stringify({
					type: 'hello',
					page: '/a.html',
					revision: 1,
					serverSession: t.hub!.serverSession,
					uiState: IDLE_UI_STATE,
				}),
			);
			const welcome = await welcomePromise;
			expect(welcome.type).toBe('welcome');

			const applyPromise = nextMessage(ws);
			const applyResultPromise = t.hub!.tabHub.apply(
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
		await using t = await bootServer();
		const { ws } = await t.connectTab('/a.html');
		try {
			const { first, second, readToken, blocks } = await readViaProtocol(t, '/a.html');
			expect(first.status).toBe(200);
			expect(second.status).toBe(200);
			expect(blocks).toHaveLength(1);

			const applyPromise = nextMessage(ws);
			const responsePromise = t.invoke({
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

			const written = await fs.readFile(
				path.join(t.roots.documentRoot, 'a.html'),
				'utf8',
			);
			expect(written).toContain('<p>acked via ws</p>');
			expect(written).not.toContain('<p>hello</p>');
			expect(written).toContain('<div class="content">');
		} finally {
			ws.close();
		}
	});

	test('a malformed frame from the tab is ignored and the socket stays usable', async () => {
		await using t = await bootServer();
		const { ws } = await t.connectTab();
		try {
			ws.send('{this is not json');
			ws.send(JSON.stringify({ type: 'teleport' }));
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(t.hub!.tabHub.primaryTabFor('/a.html')).not.toBeNull();

			const applyPromise = nextMessage(ws);
			void t
				.hub!.tabHub.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1)
				.catch(() => {});
			const apply = await applyPromise;
			expect(apply.type).toBe('apply');
		} finally {
			ws.close();
		}
	});

	test('closing the socket disconnects the tab from the hub', async () => {
		await using t = await bootServer();
		const ws = await t.connectWs();
		const welcomePromise = nextMessage(ws);
		ws.send(
			JSON.stringify({
				type: 'hello',
				page: '/a.html',
				revision: 1,
				serverSession: t.hub!.serverSession,
				uiState: IDLE_UI_STATE,
			}),
		);
		await welcomePromise;
		expect(t.hub!.tabHub.primaryTabFor('/a.html')).not.toBeNull();

		ws.close();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(t.hub!.tabHub.primaryTabFor('/a.html')).toBeNull();
	});
});

describe('WS /ws/editor — non-loopback bind requires the session cookie or bearer', () => {
	test('an upgrade with no credentials is refused at the HTTP handshake with 401; no session is registered', async () => {
		await using t = await bootServer(LAN_HOST);
		expect(await t.upgradeStatus()).toBe(401);
		expect(t.hub!.tabHub.snapshotAll()).toEqual([]);
	});

	test('an upgrade carrying the bge_session cookie registers a tab that receives welcome after hello', async () => {
		await using t = await bootServer(LAN_HOST);
		const ws = await t.connectWs({ cookie: `bge_session=${t.auth!.token}` });
		try {
			const welcomePromise = nextMessage(ws);
			ws.send(
				JSON.stringify({
					type: 'hello',
					page: '/a.html',
					revision: 1,
					serverSession: t.hub!.serverSession,
					uiState: IDLE_UI_STATE,
				}),
			);
			const welcome = await welcomePromise;
			expect(welcome.type).toBe('welcome');
			expect(welcome.revision).toBe(1);
			expect(t.hub!.tabHub.primaryTabFor('/a.html')?.id).toBe(welcome.sessionId);
		} finally {
			ws.close();
		}
	});

	test('an upgrade carrying Authorization: Bearer is accepted too', async () => {
		await using t = await bootServer(LAN_HOST);
		const ws = await t.connectWs({ authorization: `Bearer ${t.auth!.token}` });
		try {
			const welcomePromise = nextMessage(ws);
			ws.send(
				JSON.stringify({
					type: 'hello',
					page: '/a.html',
					revision: 1,
					serverSession: t.hub!.serverSession,
					uiState: IDLE_UI_STATE,
				}),
			);
			const welcome = await welcomePromise;
			expect(welcome.type).toBe('welcome');
		} finally {
			ws.close();
		}
	});
});
