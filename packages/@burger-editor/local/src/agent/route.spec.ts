import type { AppType } from '../app.js';
import type { LocalServerConfig } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { items } from '@burger-editor/blocks';
import { computeContentHash, encodeReadToken } from '@burger-editor/cli';
import { itemImport } from '@burger-editor/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	createTestApp,
	makeLocalServerConfig,
	makeTmpRoots,
	type TestApp,
	type TmpRoots,
} from '../__tests__/fixtures.js';
import { idleUiState, PAGE_HTML, PAGE_INNER } from '../__tests__/protocol-fixtures.js';
import { MISSING_FILE_CONTENT_HASH } from '../protocol/ws-messages.js';

import { __handleChangeForTest } from './fs-watcher.js';

/**
 * Every request needs a `Host` header that passes `hostGuard` — `Hono#request`
 * doesn't synthesize one the way a real HTTP client would.
 * @param app
 * @param urlPath
 * @param init
 */
function req(app: AppType, urlPath: string, init: RequestInit = {}) {
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
function postJson(app: AppType, urlPath: string, body: unknown) {
	return req(app, urlPath, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
}

/**
 * @param documentRoot
 */
function makeConfig(documentRoot: string): LocalServerConfig {
	return makeLocalServerConfig({ documentRoot });
}

/**
 * @param userConfig
 * @param hubOptions
 * @param hubOptions.now
 */
async function buildApp(
	userConfig: LocalServerConfig,
	hubOptions: { readonly now?: () => number } = {},
) {
	const t = await createTestApp({
		config: userConfig,
		configDir: tmp!.path,
		hub: hubOptions,
	});
	apps.push(t);
	return { app: t.app, hub: t.hub! };
}

/**
 * @param app
 * @param pathInput
 */
async function readToken(app: AppType, pathInput: string): Promise<string> {
	const res = await postJson(app, '/api/agent/invoke', {
		tool: 'page_blocks',
		args: { path: pathInput },
	});
	const body = (await res.json()) as { result: { readToken: string } };
	return body.result.readToken;
}

let tmp: TmpRoots | undefined;
let documentRoot: string;
/** Every `TestApp` `buildApp` created in the current test — disposed in `afterEach` so no ping interval outlives its test. */
const apps: TestApp[] = [];

beforeEach(async () => {
	tmp = await makeTmpRoots('bge-agent-route-', { pages: { 'a.html': PAGE_HTML } });
	documentRoot = tmp.documentRoot;
});

afterEach(async () => {
	for (const app of apps.splice(0)) {
		await app[Symbol.asyncDispose]();
	}
	await tmp?.[Symbol.asyncDispose]();
});

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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

	test('reports protocolVersion "1"', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await req(app, '/api/agent/status');
		const body = (await res.json()) as { protocolVersion: string; version: string };
		expect(body.protocolVersion).toBe('1');
		expect(body.version).toBe('0.0.0-test');
	});

	test('GET /api/agent/tools also reports protocolVersion "1"', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await req(app, '/api/agent/tools');
		const body = (await res.json()) as { protocolVersion: string };
		expect(body.protocolVersion).toBe('1');
	});
});

describe('POST /api/agent/invoke — every JSON response carries an ISO timestamp', () => {
	test('a successful disk-applied invoke', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_blocks',
			args: { path: '/a.html' },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { timestamp: string };
		expect(body.timestamp).toMatch(ISO_TIMESTAMP);
	});

	test('a 400 read-required error', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 } },
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { timestamp: string };
		expect(body.timestamp).toMatch(ISO_TIMESTAMP);
	});

	test('a 404 unknown-tool error', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', { tool: 'nope', args: {} });
		expect(res.status).toBe(404);
		const body = (await res.json()) as { timestamp: string };
		expect(body.timestamp).toMatch(ISO_TIMESTAMP);
	});

	test('a 400 malformed-body error', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', { nope: true });
		expect(res.status).toBe(400);
		const body = (await res.json()) as { timestamp: string };
		expect(body.timestamp).toMatch(ISO_TIMESTAMP);
	});

	test('editor_state_get', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'editor_state_get',
			args: {},
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { timestamp: string; result: unknown };
		expect(body.timestamp).toMatch(ISO_TIMESTAMP);
		expect(body.result).toEqual({ mode: 'local', sessions: [] });
	});
});

describe('POST /api/agent/invoke — editor_wait_for_event', () => {
	test('times out with an empty event list when nothing happens', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'editor_wait_for_event',
			args: { timeoutMs: 20 },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			ok: boolean;
			result: { events: unknown[]; timedOut: boolean; nextSince: number };
		};
		expect(body.ok).toBe(true);
		expect(body.result).toEqual({
			events: [],
			nextSince: 0,
			timedOut: true,
			overflowed: false,
		});
	});

	test('resolves immediately with an event already past `since`', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		hub.events.append('content-saved', { path: '/a.html' });
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'editor_wait_for_event',
			args: { since: 0, timeoutMs: 1000 },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			result: { events: { type: string }[]; timedOut: boolean };
		};
		expect(body.result.timedOut).toBe(false);
		expect(body.result.events).toEqual([
			expect.objectContaining({ type: 'content-saved' }),
		]);
	});

	test('rejects an unknown `types` filter with 400', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'editor_wait_for_event',
			args: { types: ['not-a-real-type'] },
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string; message: string };
		expect(body.error).toBe('invalid');
		expect(body.message).toContain('not-a-real-type');
	});
});

describe('GET /api/agent/events', () => {
	test('times out with `timedOut: true` when nothing happens within timeoutMs', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await req(app, '/api/agent/events?since=0&timeoutMs=20');
		expect(res.status).toBe(200);
		const body = (await res.json()) as { events: unknown[]; timedOut: boolean };
		expect(body).toMatchObject({ events: [], timedOut: true, overflowed: false });
	});

	test('returns an event already past `since` immediately', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		hub.events.append('session-connected', { sessionId: 'x' });
		const res = await req(app, '/api/agent/events?since=0&timeoutMs=1000');
		const body = (await res.json()) as { events: { type: string }[]; timedOut: boolean };
		expect(body.timedOut).toBe(false);
		expect(body.events).toEqual([expect.objectContaining({ type: 'session-connected' })]);
	});

	test('clamps `timeoutMs` above 30000 to 30000', async () => {
		vi.useFakeTimers();
		try {
			const { app } = await buildApp(makeConfig(documentRoot));
			const pending = req(app, '/api/agent/events?since=0&timeoutMs=999999');
			// If the clamp were NOT applied and 999999 reached `setTimeout`
			// directly, advancing only 30s would not be enough to resolve this —
			// the assertion below would then hang until the outer test timeout.
			await vi.advanceTimersByTimeAsync(30_000);
			const res = await pending;
			expect(res.status).toBe(200);
			const body = (await res.json()) as { timedOut: boolean };
			expect(body.timedOut).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});

	test('rejects an unknown `types` filter with 400', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await req(app, '/api/agent/events?types=bogus');
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe('invalid');
	});

	test('trims whitespace around each `types` entry (comma-space is a common separator)', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		hub.events.append('session-connected', { sessionId: 'x' });
		const res = await req(
			app,
			'/api/agent/events?since=0&timeoutMs=1000&types=session-connected,%20ui-idle',
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { events: { type: string }[] };
		expect(body.events).toEqual([expect.objectContaining({ type: 'session-connected' })]);
	});

	test('rejects a negative `since` with 400 instead of a misleading `overflowed: true`', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));
		const res = await req(app, '/api/agent/events?since=-1');
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe('invalid');
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

	test('appends a `content-saved` event keyed by the normalized `page`, not the raw `path`', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const token = await readToken(app, '/a.html');
		await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const { events } = hub.events.since(0);
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'content-saved',
					payload: { page: '/a.html', appliedTo: 'disk' },
				}),
			]),
		);
	});

	test('a `dryRun: true` call does not append a `content-saved` event (nothing was written)', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const token = await readToken(app, '/a.html');
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token, dryRun: true },
		});
		expect(res.status).toBe(200);
		expect(hub.events.since(0).events).toEqual([]);
	});

	test('a read-only tool (page_blocks) does not append a `content-saved` event', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		await postJson(app, '/api/agent/invoke', {
			tool: 'page_blocks',
			args: { path: '/a.html' },
		});
		expect(hub.events.since(0).events).toEqual([]);
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

	test('appends a `front-matter-changed` event, not a generic `content-saved`', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const token = await readToken(app, '/a.html');
		await postJson(app, '/api/agent/invoke', {
			tool: 'front_matter_set',
			args: { path: '/a.html', patch: { title: 'New Title' }, readToken: token },
		});
		const { events } = hub.events.since(0);
		expect(events.some((e) => e.type === 'front-matter-changed')).toBe(true);
		expect(events.some((e) => e.type === 'content-saved')).toBe(false);
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

describe('POST /api/agent/invoke — with a tab open', () => {
	/**
	 * @param hub
	 * @param page
	 * @param normalizedHtml - What the tab reports as its unsaved normalization on open
	 */
	function connectPrimaryTab(
		hub: Awaited<ReturnType<typeof buildApp>>['hub'],
		page = '/a.html',
		normalizedHtml?: string,
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
			normalizedHtml,
		});
		return { sessionId, sent };
	}

	const RAW_PAGE_HTML =
		'<html><body><div class="content"><p>hello</p></div></body></html>';

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
		expect(hub.events.since(0).events.some((e) => e.type === 'content-saved')).toBe(true);
	});

	test("takes the tab's unsaved normalization onto disk once and answers stale, then relays the retry", async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		// Disk has raw HTML with no block markers; the tab's editor wrapped it
		// into a block on open but (deliberately) didn't save that.
		await fs.writeFile(path.join(documentRoot, 'a.html'), RAW_PAGE_HTML, 'utf8');
		const { sessionId, sent } = connectPrimaryTab(hub, '/a.html', PAGE_INNER);
		const token = await readToken(app, '/a.html');

		const first = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});

		expect(first.status).toBe(409);
		const firstBody = (await first.json()) as { error: string; readToken: string };
		expect(firstBody.error).toBe('stale');
		const written = await fs.readFile(path.join(documentRoot, 'a.html'), 'utf8');
		expect(written).toContain('data-bge-name="text"');
		expect(sent.some((m) => (m as { type: string }).type === 'apply')).toBe(false);
		expect(sent.at(-1)).toStrictEqual({ type: 'committed', revision: 1 });
		expect(hub.tabHub.get(sessionId)?.normalizedHtml).toBeNull();

		const retryPromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: firstBody.readToken },
		});
		const applyMessage = await waitForApply(sent);
		hub.tabHub.resolveAck(sessionId, applyMessage.id, 2, '');

		const retry = await retryPromise;
		expect(retry.status).toBe(200);
		const retryBody = (await retry.json()) as { appliedTo: string };
		expect(retryBody.appliedTo).toBe('browser');
	});

	test("an external edit is reported as stale before the tab's unsaved normalization is taken onto disk, so it is not overwritten", async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const filePath = path.join(documentRoot, 'a.html');
		await fs.writeFile(filePath, RAW_PAGE_HTML, 'utf8');
		connectPrimaryTab(hub, '/a.html', PAGE_INNER);
		await readToken(app, '/a.html');

		const externallyEdited = RAW_PAGE_HTML.replace('hello', 'externally edited');
		await fs.writeFile(filePath, externallyEdited, 'utf8');
		const freshDiskToken = encodeReadToken({
			path: '/a.html',
			contentHash: await computeContentHash(filePath),
		});

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: freshDiskToken },
		});

		expect(res.status).toBe(409);
		const body = (await res.json()) as { error: string; message: string };
		expect(body.error).toBe('stale');
		expect(body.message).toContain('outside local');
		expect(await fs.readFile(filePath, 'utf8')).toBe(externallyEdited);
	});

	test("a readToken that no longer matches disk is rejected before the tab's unsaved normalization is taken onto disk", async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const filePath = path.join(documentRoot, 'a.html');
		await fs.writeFile(filePath, RAW_PAGE_HTML, 'utf8');
		const { sessionId } = connectPrimaryTab(hub, '/a.html', PAGE_INNER);
		const token = await readToken(app, '/a.html');
		const editedByAnotherReader = RAW_PAGE_HTML.replace('hello', 'edited');
		await fs.writeFile(filePath, editedByAnotherReader, 'utf8');

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});

		expect(res.status).toBe(409);
		expect(await fs.readFile(filePath, 'utf8')).toBe(editedByAnotherReader);
		expect(hub.tabHub.get(sessionId)?.normalizedHtml).toBe(PAGE_INNER);
	});

	test("a human save of the page (POST /api/content) drops the tab's unsaved normalization", async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		await fs.writeFile(path.join(documentRoot, 'a.html'), RAW_PAGE_HTML, 'utf8');
		const { sessionId } = connectPrimaryTab(hub, '/a.html', PAGE_INNER);

		const res = await postJson(app, '/api/content', {
			path: '/a.html',
			content: PAGE_INNER,
		});

		expect(res.status).toBe(200);
		expect(hub.tabHub.get(sessionId)?.normalizedHtml).toBeNull();
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

	test("page_update's insert op reaches the tab with an image's empty media filled in from the project's mediaQueries", async () => {
		// The browser saves the blockHtml it is sent as it is, so the server
		// normalizes it, with the project config, before relaying.
		const { app, hub } = await buildApp(
			makeLocalServerConfig({ documentRoot, mediaQueries: ['(max-width: 599px)'] }),
		);
		const { sessionId, sent } = connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');
		const blockHtml =
			'<div data-bge-name="image" data-bge-container="grid:1">' +
			'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
			`<div data-bgi="image" data-bgi-ver="0.0.0">${itemImport(items['image']!.template, {
				path: ['/img/pc.png', '/img/sp.png'],
				width: [400, 300],
				height: [300, 200],
				media: ['', ''],
				alt: ['説明'],
				loading: ['eager'],
			})}</div>` +
			'</div></div></div></div>';

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'page_update',
			args: {
				path: '/a.html',
				ops: [{ op: 'insert', index: 0, blockHtml }],
				readToken: token,
			},
		});
		const apply = (await waitForApply(sent)) as unknown as {
			id: string;
			op: { blockHtml: string };
		};

		expect(apply.op.blockHtml).toContain('media="(max-width: 599px)"');
		expect(apply.op.blockHtml).not.toContain('media=""');
		hub.tabHub.resolveAck(sessionId, apply.id, 2, PAGE_INNER);
		const res = await invokePromise;
		expect(res.status).toBe(200);
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

	test('a tab that disconnects while an apply is pending yields 504 local-unreachable', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sessionId, sent } = connectPrimaryTab(hub);
		const token = await readToken(app, '/a.html');

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		await waitForApply(sent);
		// The browser tab goes away (socket close → onClose → disconnect).
		hub.tabHub.disconnect(sessionId);

		const res = await invokePromise;
		expect(res.status).toBe(504);
		const body = (await res.json()) as { error: string; message: string };
		expect(body.error).toBe('local-unreachable');
		expect(body.message).toContain('disconnected');
		// Disk untouched — nothing was acked.
		const written = await fs.readFile(path.join(documentRoot, 'a.html'), 'utf8');
		expect(written).toContain('data-bge-name="text"');
	});

	test('an external disk edit is reported as stale + external-change reload, and a page_blocks re-read clears it so the next mutation relays again', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const { sessionId, sent } = connectPrimaryTab(hub);
		const filePath = path.join(documentRoot, 'a.html');

		// page_blocks (read-only) seeds persistedHash for the page.
		await readToken(app, '/a.html');
		const seededHash = await computeContentHash(filePath);
		expect(hub.revisions.get('/a.html')).toEqual({
			revision: 1,
			persistedHash: seededHash,
		});

		// An IDE rewrites the file behind local's back.
		await fs.writeFile(filePath, PAGE_HTML.replace('hello', 'externally edited'), 'utf8');
		// A readToken that matches the NEW disk content — as if minted by a
		// disk-mode reader — so the readToken check passes and the
		// persistedHash drift is what gets detected.
		const freshDiskToken = encodeReadToken({
			path: '/a.html',
			contentHash: await computeContentHash(filePath),
		});

		const staleRes = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: freshDiskToken },
		});
		expect(staleRes.status).toBe(409);
		const staleBody = (await staleRes.json()) as { error: string; message: string };
		expect(staleBody.error).toBe('stale');
		expect(staleBody.message).toContain('outside local');
		expect(sent).toEqual([
			{ type: 'welcome', sessionId, revision: 1 },
			// The external-change detector bumps the revision itself (to
			// claim the change) rather than leaving persistedHash stale —
			// see the route.ts comment at the `isExternallyChanged` branch.
			{ type: 'reload', revision: 2, reason: 'external-change' },
		]);
		const contentChangedCountAfterInvoke = hub.events
			.since(0)
			.events.filter((e) => e.type === 'content-changed').length;
		expect(contentChangedCountAfterInvoke).toBe(1);

		// The same external write also reaches fs.watch independently (async,
		// possibly after this invoke already detected and claimed it above).
		// Because the invoke-time detection already bumped persistedHash to
		// currentHash, this must be a no-op — no second `content-changed`,
		// no second reload — instead of double-reporting the one edit.
		await __handleChangeForTest(hub, documentRoot, '/a.html', 'a.html');
		expect(
			hub.events.since(0).events.filter((e) => e.type === 'content-changed').length,
		).toBe(contentChangedCountAfterInvoke);
		expect(sent).toEqual([
			{ type: 'welcome', sessionId, revision: 1 },
			{ type: 'reload', revision: 2, reason: 'external-change' },
		]);

		// The agent does what the error says: re-reads the page.
		const reRead = await postJson(app, '/api/agent/invoke', {
			tool: 'page_blocks',
			args: { path: '/a.html' },
		});
		expect(reRead.status).toBe(200);
		const reReadToken = ((await reRead.json()) as { result: { readToken: string } })
			.result.readToken;
		const currentHash = await computeContentHash(filePath);
		expect(hub.revisions.get('/a.html')).toEqual({
			revision: 2,
			persistedHash: currentHash,
		});
		// The tab reloaded and now matches disk.
		hub.tabHub.setSyncedHash(sessionId, currentHash);

		// The next mutation is relayed to the tab again instead of being stuck on stale.
		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: reReadToken },
		});
		const applyMessage = await waitForApply(sent);
		expect(applyMessage.type).toBe('apply');
		hub.tabHub.resolveAck(sessionId, applyMessage.id, 2, '');
		const res = await invokePromise;
		expect(res.status).toBe(200);
		expect(((await res.json()) as { appliedTo: string }).appliedTo).toBe('browser');
	});

	test('with two tabs on the page, the primary gets apply, the other gets reload other-tab after the disk save, and only the primary is marked synced', async () => {
		let now = 0;
		const { app, hub } = await buildApp(makeConfig(documentRoot), { now: () => now });
		const other = connectPrimaryTab(hub);
		now = 10;
		const primary = connectPrimaryTab(hub);
		expect(hub.tabHub.primaryTabFor('/a.html')?.id).toBe(primary.sessionId);
		const token = await readToken(app, '/a.html');

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const applyMessage = await waitForApply(primary.sent);
		expect(other.sent).toEqual([
			{ type: 'welcome', sessionId: other.sessionId, revision: 1 },
		]);
		hub.tabHub.resolveAck(primary.sessionId, applyMessage.id, 2, '');

		const res = await invokePromise;
		expect(res.status).toBe(200);
		const savedHash = await computeContentHash(path.join(documentRoot, 'a.html'));
		expect(hub.revisions.get('/a.html')).toEqual({
			revision: 2,
			persistedHash: savedHash,
		});
		expect(other.sent).toEqual([
			{ type: 'welcome', sessionId: other.sessionId, revision: 1 },
			{ type: 'reload', revision: 2, reason: 'other-tab' },
		]);
		expect(primary.sent.map((m) => (m as { type: string }).type)).toEqual([
			'welcome',
			'apply',
		]);
		expect(hub.tabHub.get(primary.sessionId)?.syncedHash).toBe(savedHash);
		expect(hub.tabHub.get(other.sessionId)?.syncedHash).toBeNull();
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

describe('POST /api/agent/invoke — page_create', () => {
	test('broadcasts a page-event and appends a page-created event, not content-saved', async () => {
		// `page_create` writes `newFileContent` as the new page's starting
		// content — it must actually contain `editableArea` (`.content`) or
		// the create itself fails with `NoEditableAreaError`. Every other
		// test in this file only exercises `page_create`'s failure paths, so
		// `makeConfig`'s placeholder `newFileContent` was never exercised
		// against a REAL create until now.
		const config = {
			...makeConfig(documentRoot),
			newFileContent: '<div class="content"></div>',
		};
		const { app, hub } = await buildApp(config);
		const sent: unknown[] = [];
		const sessionId = hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		hub.tabHub.hello(sessionId, {
			page: '/b.html',
			revision: 1,
			serverSession: hub.serverSession,
			uiState: {
				openDialog: null,
				sourceMode: false,
				processing: false,
				editingBlockIndex: null,
			},
		});

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_create',
			args: { path: '/b.html' },
		});
		expect(res.status).toBe(200);
		expect(sent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'page-event', kind: 'created', to: '/b.html' }),
			]),
		);
		const { events } = hub.events.since(0);
		expect(events.some((e) => e.type === 'page-created')).toBe(true);
		expect(events.some((e) => e.type === 'content-saved')).toBe(false);
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'page-created', payload: { to: '/b.html' } }),
			]),
		);
	});
});

describe('POST /api/agent/invoke — page_delete', () => {
	test('broadcasts a page-event with `from` set to the deleted path', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const sent: unknown[] = [];
		hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		const token = await readToken(app, '/a.html');

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_delete',
			args: { path: '/a.html', readToken: token },
		});
		expect(res.status).toBe(200);
		expect(sent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'page-event', kind: 'deleted', from: '/a.html' }),
			]),
		);
		const { events } = hub.events.since(0);
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'page-deleted', payload: { from: '/a.html' } }),
			]),
		);
	});
});

describe('POST /api/agent/invoke — page_rename', () => {
	test('broadcasts a page-event with both `from` and `to`', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const sent: unknown[] = [];
		hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		const token = await readToken(app, '/a.html');

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_rename',
			args: { from: '/a.html', to: '/renamed.html', readToken: token },
		});
		expect(res.status).toBe(200);
		expect(sent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'page-event',
					kind: 'renamed',
					from: '/a.html',
					to: '/renamed.html',
				}),
			]),
		);
		// The `page-renamed` event-log entry must carry the same `{from, to}`
		// shape as the WS broadcast, not the raw `{toolName, result}` — every
		// page tool's `result` has a different shape (`path`, `to`, `target`,
		// …), which would force an `editor_wait_for_event` consumer to know
		// each tool's individual result shape just to read which page moved.
		const { events } = hub.events.since(0);
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'page-renamed',
					payload: { from: '/a.html', to: '/renamed.html' },
				}),
			]),
		);
	});
});

describe('POST /api/agent/invoke — page_copy', () => {
	test('broadcasts a page-event with `to` set to the copy destination', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const sent: unknown[] = [];
		hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		const token = await readToken(app, '/a.html');

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_copy',
			args: { from: '/a.html', to: '/copy.html', readToken: token },
		});
		expect(res.status).toBe(200);
		expect(sent).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'page-event',
					kind: 'created',
					to: '/copy.html',
				}),
			]),
		);
		const { events } = hub.events.since(0);
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'page-created', payload: { to: '/copy.html' } }),
			]),
		);
	});
});

describe('POST /api/agent/invoke — documentRoot containment over HTTP', () => {
	// documentRoot is <tmp>/docs, so `..` lands in <tmp>: plant a file there
	// and prove the agent endpoint can neither read it nor create beside it.
	test('page_get with a traversing path is a 400 and leaks nothing', async () => {
		await fs.writeFile(path.join(tmp!.path, 'secret.txt'), 'TOP SECRET', 'utf8');
		const { app } = await buildApp(makeConfig(documentRoot));

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_get',
			args: { path: '../secret.txt' },
		});
		expect(res.status).toBe(400);
		const text = await res.text();
		expect(text).not.toContain('TOP SECRET');
		expect((JSON.parse(text) as { error: string }).error).toBe('invalid');
	});

	test('page_create with a traversing path is a 400 and writes nothing outside documentRoot', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_create',
			args: { path: '../escaped.html' },
		});
		expect(res.status).toBe(400);
		await expect(fs.stat(path.join(tmp!.path, 'escaped.html'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});

	test('page_delete with a traversing path never hands back a readToken for it', async () => {
		await fs.writeFile(path.join(tmp!.path, 'victim.html'), '<p>x</p>', 'utf8');
		const { app } = await buildApp(makeConfig(documentRoot));

		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'page_delete',
			args: { path: '../victim.html' },
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string; readToken?: string };
		expect(body.error).toBe('invalid');
		expect(body.readToken).toBeUndefined();
		await expect(fs.stat(path.join(tmp!.path, 'victim.html'))).resolves.toBeDefined();
	});
});

describe('tabs behind disk never receive an agent op', () => {
	/** The page content a human saves in the tests below: the seeded block plus a second one. */
	const SAVED_INNER =
		PAGE_INNER +
		PAGE_INNER.replace('id="bge-1"', 'id="bge-2"').replace('hello', 'second');

	/**
	 * Connect a tab that was served the page with `contentHash`.
	 * @param hub
	 * @param options
	 * @param options.page
	 * @param options.contentHash
	 * @param options.normalizedHtml
	 */
	function connectTab(
		hub: Awaited<ReturnType<typeof buildApp>>['hub'],
		options: { page?: string; contentHash?: string; normalizedHtml?: string } = {},
	) {
		const sent: unknown[] = [];
		const sessionId = hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		hub.tabHub.hello(sessionId, {
			page: options.page ?? '/a.html',
			revision: 1,
			serverSession: hub.serverSession,
			uiState: idleUiState(),
			...(options.contentHash === undefined ? {} : { contentHash: options.contentHash }),
			...(options.normalizedHtml === undefined
				? {}
				: { normalizedHtml: options.normalizedHtml }),
		});
		return {
			sessionId,
			sent,
			types: () => sent.map((m) => (m as { type: string }).type),
		};
	}

	const filePath = () => path.join(documentRoot, 'a.html');

	test('a human save in one tab reloads the other tab, and the next agent op goes to the tab that saved', async () => {
		let now = 0;
		const { app, hub } = await buildApp(makeConfig(documentRoot), { now: () => now });
		const served = await computeContentHash(filePath());
		const saver = connectTab(hub, { contentHash: served });
		now = 10;
		// The other tab is the most recently active one
		const stale = connectTab(hub, { contentHash: served });

		const saveRes = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
			sessionId: saver.sessionId,
		});
		expect(saveRes.status).toBe(200);
		const savedHash = await computeContentHash(filePath());
		expect(hub.tabHub.get(saver.sessionId)).toMatchObject({
			syncedHash: savedHash,
			reloadRequested: false,
		});
		expect(stale.sent.at(-1)).toEqual({
			type: 'reload',
			revision: 2,
			reason: 'other-tab',
		});
		expect(hub.tabHub.get(stale.sessionId)?.reloadRequested).toBe(true);
		expect(saver.types()).toEqual(['welcome']);

		const token = await readToken(app, '/a.html');
		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 1 }, readToken: token },
		});
		const applyMessage = await waitForApply(saver.sent);
		hub.tabHub.resolveAck(saver.sessionId, applyMessage.id, 2, PAGE_INNER);

		const res = await invokePromise;
		expect(res.status).toBe(200);
		expect(stale.types()).not.toContain('apply');
	});

	test('a tab served older content than disk is told to reload and the op is answered stale, leaving disk untouched', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const served = await computeContentHash(filePath());
		// Saved before the tab connected, so the tab never received the reload
		const saveRes = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
		});
		expect(saveRes.status).toBe(200);
		const savedFile = await fs.readFile(filePath(), 'utf8');
		const behind = connectTab(hub, { contentHash: served });

		const token = await readToken(app, '/a.html');
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});

		expect(res.status).toBe(409);
		expect(((await res.json()) as { error: string }).error).toBe('stale');
		expect(behind.types()).toEqual(['welcome', 'reload']);
		expect(await fs.readFile(filePath(), 'utf8')).toBe(savedFile);
	});

	test('a save without a sessionId marks no tab in step and reloads every tab on the page', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const served = await computeContentHash(filePath());
		const a = connectTab(hub, { contentHash: served, normalizedHtml: PAGE_INNER });
		const b = connectTab(hub, { contentHash: served });

		const saveRes = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
		});

		expect(saveRes.status).toBe(200);
		for (const tab of [a, b]) {
			expect(tab.sent.at(-1)).toEqual({
				type: 'reload',
				revision: 2,
				reason: 'other-tab',
			});
			expect(hub.tabHub.get(tab.sessionId)).toMatchObject({
				syncedHash: served,
				reloadRequested: true,
				normalizedHtml: null,
			});
		}
	});

	test.each([
		['a tab on another page', 'other-page'],
		['an id no tab has', 'unknown'],
	] as const)(
		'a save whose sessionId names %s is treated as a save without one',
		async (_label, kind) => {
			const { app, hub } = await buildApp(makeConfig(documentRoot));
			const served = await computeContentHash(filePath());
			const onPage = connectTab(hub, { contentHash: served });
			const elsewhere = connectTab(hub, { page: '/b.html' });

			const saveRes = await postJson(app, '/api/content', {
				path: '/a.html',
				content: SAVED_INNER,
				sessionId: kind === 'other-page' ? elsewhere.sessionId : 'no-such-session',
			});

			expect(saveRes.status).toBe(200);
			expect(onPage.sent.at(-1)).toEqual({
				type: 'reload',
				revision: 2,
				reason: 'other-tab',
			});
			expect(elsewhere.types()).toEqual(['welcome']);
		},
	);

	test('a newly opened tab served the content on disk receives the op, even before the agent read the page', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const served = await computeContentHash(filePath());
		const tab = connectTab(hub, { contentHash: served });
		const token = encodeReadToken({ path: '/a.html', contentHash: served });

		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const applyMessage = await waitForApply(tab.sent);
		hub.tabHub.resolveAck(tab.sessionId, applyMessage.id, 2, '');

		const invokeRes = await invokePromise;
		expect(invokeRes.status).toBe(200);
	});

	test("a tab behind disk does not get its unsaved normalization written over another tab's save", async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const served = await computeContentHash(filePath());
		const saveRes = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
		});
		expect(saveRes.status).toBe(200);
		const savedFile = await fs.readFile(filePath(), 'utf8');
		connectTab(hub, { contentHash: served, normalizedHtml: PAGE_INNER });

		const token = await readToken(app, '/a.html');
		const res = await postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});

		expect(res.status).toBe(409);
		expect(await fs.readFile(filePath(), 'utf8')).toBe(savedFile);
	});

	test('a tab that reconnects with the contentHash its save returned receives the op', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const saveRes = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
		});
		const { contentHash } = (await saveRes.json()) as { contentHash: string };
		expect(contentHash).toBe(await computeContentHash(filePath()));
		const tab = connectTab(hub, { contentHash });

		const token = await readToken(app, '/a.html');
		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const applyMessage = await waitForApply(tab.sent);
		hub.tabHub.resolveAck(tab.sessionId, applyMessage.id, 2, PAGE_INNER);

		const invokeRes = await invokePromise;
		expect(invokeRes.status).toBe(200);
	});

	test('POST /api/content rejects a sessionId that is not a string', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));

		const res = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
			sessionId: 42,
		});

		expect(res.status).toBe(400);
	});

	test('the served page carries the hash of the file it was served from, and a fixed value for a missing file', async () => {
		const { app } = await buildApp(makeConfig(documentRoot));

		const existingRes = await req(app, '/a.html');
		const missingRes = await req(app, '/missing.html');
		const existing = await existingRes.text();
		const missing = await missingRes.text();

		expect(existing).toContain(
			`<input type="hidden" id="content-hash" value="${await computeContentHash(filePath())}"/>`,
		);
		expect(missing).toContain(
			`<input type="hidden" id="content-hash" value="${MISSING_FILE_CONTENT_HASH}"/>`,
		);
	});
});

describe('a human save from a tab behind disk is rejected', () => {
	const SAVED_INNER = PAGE_INNER.replace('hello', 'saved first');
	const LATE_INNER = PAGE_INNER.replace('hello', 'saved from older content');

	/**
	 * @param hub
	 * @param contentHash
	 */
	function connectTab(
		hub: Awaited<ReturnType<typeof buildApp>>['hub'],
		contentHash: string,
	) {
		const sent: unknown[] = [];
		const sessionId = hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		hub.tabHub.hello(sessionId, {
			page: '/a.html',
			revision: 1,
			serverSession: hub.serverSession,
			uiState: idleUiState(),
			contentHash,
		});
		return { sessionId, sent };
	}

	const filePath = () => path.join(documentRoot, 'a.html');

	test("a tab that was told to reload by another tab's save cannot save over it", async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const served = await computeContentHash(filePath());
		const first = connectTab(hub, served);
		const late = connectTab(hub, served);
		await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
			sessionId: first.sessionId,
		});
		const savedFile = await fs.readFile(filePath(), 'utf8');

		const res = await postJson(app, '/api/content', {
			path: '/a.html',
			content: LATE_INNER,
			sessionId: late.sessionId,
		});

		expect(res.status).toBe(409);
		expect(((await res.json()) as { error: string }).error).toBe('conflict');
		expect(await fs.readFile(filePath(), 'utf8')).toBe(savedFile);
	});

	test('the tab that saved can keep saving', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const tab = connectTab(hub, await computeContentHash(filePath()));

		const first = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
			sessionId: tab.sessionId,
		});
		const second = await postJson(app, '/api/content', {
			path: '/a.html',
			content: LATE_INNER,
			sessionId: tab.sessionId,
		});

		expect([first.status, second.status]).toEqual([200, 200]);
		expect(await fs.readFile(filePath(), 'utf8')).toContain('saved from older content');
	});

	test('a tab served older content than disk cannot save over it', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const served = await computeContentHash(filePath());
		await fs.writeFile(
			filePath(),
			PAGE_HTML.replace('hello', 'edited elsewhere'),
			'utf8',
		);
		const tab = connectTab(hub, served);

		const res = await postJson(app, '/api/content', {
			path: '/a.html',
			content: LATE_INNER,
			sessionId: tab.sessionId,
		});

		expect(res.status).toBe(409);
		expect(await fs.readFile(filePath(), 'utf8')).toContain('edited elsewhere');
	});

	test('after an agent op acked by the tab, the tab can save', async () => {
		const { app, hub } = await buildApp(makeConfig(documentRoot));
		const tab = connectTab(hub, await computeContentHash(filePath()));
		const token = await readToken(app, '/a.html');
		const invokePromise = postJson(app, '/api/agent/invoke', {
			tool: 'block_delete',
			args: { path: '/a.html', target: { index: 0 }, readToken: token },
		});
		const applyMessage = await waitForApply(tab.sent);
		hub.tabHub.resolveAck(tab.sessionId, applyMessage.id, 2, '');
		const invokeRes = await invokePromise;
		expect(invokeRes.status).toBe(200);

		const res = await postJson(app, '/api/content', {
			path: '/a.html',
			content: SAVED_INNER,
			sessionId: tab.sessionId,
		});

		expect(res.status).toBe(200);
	});
});

describe('a human save that moves the page to another logical path (virtual tree)', () => {
	/**
	 * Seed `1.html` at the logical path `/about.html` and open it in one tab.
	 */
	async function setUp() {
		await fs.rm(path.join(documentRoot, 'a.html'));
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n' + PAGE_HTML,
			'utf8',
		);
		const { app, hub } = await buildApp(
			makeLocalServerConfig({
				documentRoot,
				virtualTree: { enabled: true, pathKey: 'path' },
			}),
		);
		const sent: unknown[] = [];
		const sessionId = hub.tabHub.register({
			send: (data) => sent.push(JSON.parse(data)),
			close: () => {},
		});
		hub.tabHub.hello(sessionId, {
			page: '/about.html',
			revision: 1,
			serverSession: hub.serverSession,
			uiState: idleUiState(),
			contentHash: await computeContentHash(path.join(documentRoot, '1.html')),
		});
		return { app, hub, sessionId, sent };
	}

	test('answers the new logical path, and tells the other tabs the page moved (as an agent rename does) without reloading them at the old path', async () => {
		const { app, hub, sessionId, sent } = await setUp();
		const otherSent: unknown[] = [];
		const other = hub.tabHub.register({
			send: (data) => otherSent.push(JSON.parse(data)),
			close: () => {},
		});
		hub.tabHub.hello(other, {
			page: '/about.html',
			revision: 1,
			serverSession: hub.serverSession,
			uiState: idleUiState(),
		});

		const res = await postJson(app, '/api/content', {
			path: '/about.html',
			content: PAGE_INNER,
			frontMatter: { path: 'company/about.html' },
			sessionId,
		});

		expect(res.status).toBe(200);
		expect(((await res.json()) as { logicalPath: string }).logicalPath).toBe(
			'/company/about.html',
		);
		// The tab that saved follows the new path itself, so it gets no notice,
		// and an agent's op on the new path is relayed to it
		expect(sent.map((m) => (m as { type: string }).type)).toEqual(['welcome']);
		expect(hub.tabHub.get(sessionId)?.page).toBe('/company/about.html');
		// Reloading the old path would answer Not Found, so the other tab is told
		// the page moved and is marked behind instead
		expect(otherSent).toEqual([
			{ type: 'welcome', sessionId: other, revision: 1 },
			{
				type: 'page-event',
				kind: 'renamed',
				from: '/about.html',
				to: '/company/about.html',
			},
		]);
		expect(hub.tabHub.get(other)?.reloadRequested).toBe(true);
		expect(hub.events.since(0).events).toContainEqual(
			expect.objectContaining({
				type: 'page-renamed',
				payload: { from: '/about.html', to: '/company/about.html' },
			}),
		);
	});

	test('a save that keeps the logical path answers it and tells no tab anything', async () => {
		const { app, sessionId, sent } = await setUp();

		const res = await postJson(app, '/api/content', {
			path: '/about.html',
			content: PAGE_INNER,
			frontMatter: { path: 'about.html' },
			sessionId,
		});

		expect(((await res.json()) as { logicalPath: string }).logicalPath).toBe(
			'/about.html',
		);
		expect(sent.map((m) => (m as { type: string }).type)).toEqual(['welcome']);
	});
});
