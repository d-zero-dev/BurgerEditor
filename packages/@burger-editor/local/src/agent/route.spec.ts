import type { LocalServerConfig } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { setRoute } from '../route.js';

import { createAgentAuth } from './auth.js';
import { createAgentHub } from './hub.js';

const PAGE_HTML =
	'<html><body><div class="content"><div data-bge-name="text" data-bge-container="grid:1" id="bge-1">' +
	'<div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item="">' +
	'<div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>hello</p></div></div>' +
	'</div></div></div></div></div></body></html>';

/**
 * Every request needs a `Host` header that passes `hostGuard` — `Hono#request`
 * doesn't synthesize one the way a real HTTP client would.
 * @param app
 * @param urlPath
 * @param init
 */
function req(app: Hono, urlPath: string, init: RequestInit = {}) {
	return app.request(urlPath, {
		...init,
		headers: { ...init.headers, host: 'localhost' },
	});
}

/**
 * @param app
 * @param urlPath
 * @param body
 */
function postJson(app: Hono, urlPath: string, body: unknown) {
	return req(app, urlPath, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
}

/**
 *
 */
async function makeTmpDocumentRoot() {
	const tmp = await mkdtempDisposable('bge-agent-route-');
	const documentRoot = path.join(tmp.path, 'docs');
	await fs.mkdir(documentRoot);
	await fs.writeFile(path.join(documentRoot, 'a.html'), PAGE_HTML, 'utf8');
	return { documentRoot, tmp };
}

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

/**
 * @param userConfig
 */
async function buildApp(userConfig: LocalServerConfig) {
	const app = new Hono();
	const hub = createAgentHub({ indexFileName: userConfig.indexFileName });
	const auth = await createAgentAuth('localhost', '/tmp/unused');
	// These tests exercise HTTP only — `upgradeWebSocket` just needs to be
	// callable at route-registration time; it's never actually invoked as a
	// WS upgrade in this file (see `ws.spec.ts` for that).
	const noopUpgrade = (() => async (_c: unknown, next: () => Promise<void>) =>
		next()) as unknown as never;
	setRoute(app, userConfig, null, { hub, auth, upgradeWebSocket: noopUpgrade });
	return { app, hub };
}

/**
 * @param app
 * @param pathInput
 */
async function readToken(app: Hono, pathInput: string): Promise<string> {
	const res = await postJson(app, '/api/agent/invoke', {
		tool: 'page_blocks',
		args: { path: pathInput },
	});
	const body = (await res.json()) as { result: { readToken: string } };
	return body.result.readToken;
}

let tmp: ({ path: string } & AsyncDisposable) | undefined;
let documentRoot: string;

beforeEach(async () => {
	({ documentRoot, tmp } = await makeTmpDocumentRoot());
});

afterEach(async () => {
	await tmp?.[Symbol.asyncDispose]();
});

describe('GET /api/agent/tools', () => {
	test('returns every agent tool with a JSON schema and the shared instructions', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await req(app, '/api/agent/tools');
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			instructions: string;
			tools: readonly { name: string; inputSchema: unknown }[];
		};
		expect(body.instructions.length).toBeGreaterThan(0);
		expect(body.tools.some((t) => t.name === 'page_blocks')).toBe(true);
		expect(body.tools.every((t) => !!t.inputSchema)).toBe(true);
	});
});

describe('GET /api/agent/status', () => {
	test('returns the full payload when loopback (no auth required)', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await req(app, '/api/agent/status');
		expect(res.status).toBe(200);
		const body = (await res.json()) as { documentRoot: string; sessions: unknown[] };
		expect(body.documentRoot).toBe(documentRoot);
		expect(body.sessions).toEqual([]);
	});
});

describe('POST /api/agent/invoke — no tab open', () => {
	test('applies a block_delete to disk and reports appliedTo: disk', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const token = await readToken(app, '/a.html');
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { appliedTo: string };
		expect(body.appliedTo).toBe('disk');
		const written = await fs.readFile(path.join(documentRoot, 'a.html'), 'utf8');
		expect(written).not.toContain('data-bge-name="text"');
	});

	test('rejects without a readToken', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 } },
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe('read-required');
	});

	test('unknown tool name is a 404', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'not_a_real_tool',
			args: {},
		});
		expect(res.status).toBe(404);
	});

	test('a malformed body is a 400', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', { nope: true });
		expect(res.status).toBe(400);
	});
});

describe('POST /api/agent/invoke — front_matter_set always applies to disk', () => {
	test('applies even though a tab has the page open, and reports appliedTo: disk', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const sent: unknown[] = [];
		const sessionId = hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		hub.tabHub.hello(sessionId, {
			page: '/a.html',
			revision: 1,
			serverSession: hub.serverSession,
			uiState: {
				openDialog: null,
				sourceMode: false,
				processing: false,
				editingBlockIndex: null,
			},
		});

		const token = await readToken(app, '/a.html');
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'front_matter_set',
			args: { path: '/a.html', patch: { title: 'New Title' }, readToken: token },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { appliedTo: string };
		expect(body.appliedTo).toBe('disk');
		expect(sent.some((m) => (m as { type: string }).type === 'reload')).toBe(true);
	});
});

/**
 * `invoke` does several `await`s (readToken verification, hashing, reading
 * the file, parsing blocks) before it reaches `hub.tabHub.apply()` — a
 * single microtask tick isn't enough to observe the `apply` message.
 * @param sent
 * @param after
 */
async function waitForApply(
	sent: readonly unknown[],
	/** id of an `apply` already handled — keeps waiting until a DIFFERENT one arrives (multi-op batches). */
	after?: string,
): Promise<{ type: string; id: string }> {
	for (let i = 0; i < 100; i++) {
		const last = sent.at(-1) as { type: string; id: string } | undefined;
		if (last?.type === 'apply' && last.id !== after) {
			return last;
		}
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error('apply message never arrived');
}

/**
 * What a real tab acks with: the editable area's INNER content (what
 * `engine.content.getContentsAsString()` returns), never a full document.
 * `saveContent` writes it back inside `editableArea`, so acking with a whole
 * `<html>` document would nest a document inside `.content` and break every
 * later block lookup on that page.
 */
const PAGE_INNER = PAGE_HTML.replace('<html><body><div class="content">', '').replace(
	'</div></body></html>',
	'',
);

describe('POST /api/agent/invoke — with a tab open', () => {
	/**
	 * @param hub
	 * @param page
	 */
	function connectPrimaryTab(
		hub: Awaited<ReturnType<typeof buildApp>>['hub'],
		page = '/a.html',
	) {
		const sent: unknown[] = [];
		const sessionId = hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		hub.tabHub.hello(sessionId, {
			page,
			revision: 1,
			serverSession: hub.serverSession,
			uiState: {
				openDialog: null,
				sourceMode: false,
				processing: false,
				editingBlockIndex: null,
			},
		});
		return { sessionId, sent };
	}

	test('matches a root-page tab (hello page: "/") against an agent path of "/index.html"', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		await fs.writeFile(path.join(documentRoot, 'index.html'), PAGE_HTML, 'utf8');
		// The browser tab at the site root sends its own location.pathname
		// ("/"), while the agent addresses the same file by its full name —
		// both must resolve to the same TabHub key (agent/route.ts's
		// normalizedPage) or this always falls back to disk.
		const { sessionId, sent } = connectPrimaryTab(hub, '/');
		const token = await readToken(app, '/index.html');

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/index.html', target: { index: 0 }, readToken: token },
		});
		const applyMessage = await waitForApply(sent);
		hub.tabHub.resolveAck(sessionId, applyMessage.id, 2, '');

		const res = await invokePromise;
		expect(res.status).toBe(200);
		const body = (await res.json()) as { appliedTo: string };
		expect(body.appliedTo).toBe('browser');
	});

	test('relays a block_delete to the primary tab and persists its ack html', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sessionId, sent } = connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});

		const applyMessage = await waitForApply(sent);
		hub.tabHub.resolveAck(sessionId, applyMessage.id, 2, '');

		const res = await invokePromise;
		expect(res.status).toBe(200);
		const body = (await res.json()) as { appliedTo: string };
		expect(body.appliedTo).toBe('browser');
		const written = await fs.readFile(path.join(documentRoot, 'a.html'), 'utf8');
		expect(written).not.toContain('data-bge-name="text"');
	});

	test('rejects with stale when the readToken no longer matches disk content', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');

		// An external editor changes the file after the token was issued.
		await fs.writeFile(
			path.join(documentRoot, 'a.html'),
			PAGE_HTML.replace('hello', 'edited'),
		);

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		expect(res.status).toBe(409);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe('stale');
	});

	test('a busy tab nacking user-editing surfaces as a 409', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sessionId, sent } = connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const applyMessage = await waitForApply(sent);
		hub.tabHub.resolveNack(sessionId, applyMessage.id, 'user-editing', {
			editingBlockIndex: 0,
		});

		const res = await invokePromise;
		expect(res.status).toBe(409);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe('user-editing');
	});

	test('a nack with a non-standard reason surfaces as invalid, with the browser detail folded into message', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sessionId, sent } = connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const applyMessage = await waitForApply(sent);
		hub.tabHub.resolveNack(
			sessionId,
			applyMessage.id,
			'disabled-block',
			'this item type is disabled by editorOptions.isDisable',
		);

		const res = await invokePromise;
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string; message: string };
		expect(body.error).toBe('invalid');
		expect(body.message).toContain(
			'this item type is disabled by editorOptions.isDisable',
		);
	});

	test('malformed args are rejected with 400 invalid before anything reaches the tab', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sent } = connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 'zero' }, readToken: token },
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string; message: string };
		expect(body.error).toBe('invalid');
		expect(body.message).toContain('target');
		// Nothing but the welcome ever went to the tab — no apply, no 5 s
		// ApplyTimeout dressed up as "tab stopped responding".
		expect(sent.map((m) => (m as { type: string }).type)).toEqual(['welcome']);
	});

	test('a disk-applied mutation (front_matter_set) keeps the revision registry in sync, so the next relayed op is not rejected as stale', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sessionId, sent } = connectPrimaryTab(hub);

		// A relayed op first, so the registry holds a persistedHash for the page.
		let token = await readToken(app, '/a.html');
		const firstInvoke = postJson(app, '/api/agent/invoke', {
			tool: 'item_update',
			args: {
				path: '/a.html',
				target: { index: 0 },
				itemIndex: 0,
				data: { wysiwyg: '<p>one</p>' },
				readToken: token,
			},
		});
		const firstApply = await waitForApply(sent);
		hub.tabHub.resolveAck(
			sessionId,
			firstApply.id,
			2,
			PAGE_INNER.replace('hello', 'one'),
		);
		const firstRes = await firstInvoke;
		expect(firstRes.status).toBe(200);

		// Now a disk-applied write moves the file under the registry.
		token = await readToken(app, '/a.html');
		const fmRes = await postJson(app, '/api/agent/invoke', {
			tool: 'front_matter_set',
			args: { path: '/a.html', patch: { title: 'T' }, readToken: token },
		});
		expect(fmRes.status).toBe(200);
		// The open tab was told to reload — it is behind disk now.
		expect(
			sent.some((m) => {
				const msg = m as { type: string; reason?: string };
				return msg.type === 'reload' && msg.reason === 'front-matter';
			}),
		).toBe(true);
		// Simulate the tab having reloaded and re-synced.
		hub.tabHub.setSyncedHash(sessionId, hub.revisions.get('/a.html')!.persistedHash!);

		// The very next relayed op must NOT be rejected as stale.
		token = await readToken(app, '/a.html');
		const secondInvoke = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const secondApply = await waitForApply(sent, firstApply.id);
		hub.tabHub.resolveAck(sessionId, secondApply.id, 3, '');
		const res = await secondInvoke;
		expect(res.status).toBe(200);
		expect(((await res.json()) as { appliedTo: string }).appliedTo).toBe('browser');
	});

	test('a page_update batch that fails mid-way reloads the tab so its partially-applied DOM is discarded', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sessionId, sent } = connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'page_update',
			args: {
				path: '/a.html',
				ops: [
					{ op: 'delete', index: 0 },
					{ op: 'delete', index: 99 },
				],
				readToken: token,
			},
		});
		const firstApply = await waitForApply(sent);
		hub.tabHub.resolveAck(sessionId, firstApply.id, 2, '');
		const secondApply = await waitForApply(sent, firstApply.id);
		expect(secondApply.id).not.toBe(firstApply.id);
		hub.tabHub.resolveNack(
			sessionId,
			secondApply.id,
			'range',
			'Block index 99 out of range',
		);

		const res = await invokePromise;
		expect(res.status).toBe(400);
		expect(((await res.json()) as { error: string }).error).toBe('invalid');
		// Disk untouched…
		const written = await fs.readFile(path.join(documentRoot, 'a.html'), 'utf8');
		expect(written).toContain('data-bge-name="text"');
		// …and the tab, which already applied op 0, was told to reload.
		expect(
			sent.some((m) => {
				const msg = m as { type: string; reason?: string };
				return msg.type === 'reload' && msg.reason === 'behind';
			}),
		).toBe(true);
	});
});
