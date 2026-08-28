import type { AddressInfo } from 'node:net';

import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

import { agentTools } from '@burger-editor/cli';
import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from 'vitest';

import { __resetV4ContextCache } from './context.js';
import { __resetReachabilityCache, routeToolCall } from './router.js';

const pageListTool = agentTools.find((t) => t.name === 'page_list')!;
const editorStateGetTool = agentTools.find((t) => t.name === 'editor_state_get')!;
const editorWaitForEventTool = agentTools.find(
	(t) => t.name === 'editor_wait_for_event',
)!;

let stack: AsyncDisposableStack;

// loadContext() walks cosmiconfig from process.cwd() — co-locate the fixture
// under this package's own directory tree so `@burger-editor/blocks`
// resolves via the workspace node_modules (same pattern the removed
// tools/v4.spec.ts used).
beforeAll(async () => {
	stack = new AsyncDisposableStack();
	const originalCwd = process.cwd();
	const tmp = await mkdtempDisposable(
		path.join(path.resolve(import.meta.dirname, '../../'), '.tmp-router-spec-'),
	);
	stack.use(tmp);
	stack.defer(() => {
		process.chdir(originalCwd);
	});
	const docRoot = path.join(tmp.path, 'src');
	await fs.mkdir(docRoot, { recursive: true });
	await fs.writeFile(
		path.join(docRoot, 'index.html'),
		`<div class="content"></div>`,
		'utf8',
	);
	await fs.writeFile(
		path.join(tmp.path, 'burgereditor.config.mjs'),
		`import { defaultCatalog } from '@burger-editor/blocks';
export default {
	documentRoot: './src',
	assetsRoot: './src',
	editableArea: '.content',
	catalog: defaultCatalog,
	newFileContent: '<div class="content"></div>',
};
`,
		'utf8',
	);
	process.chdir(tmp.path);
});

afterAll(async () => {
	await stack.disposeAsync();
});

beforeEach(() => {
	__resetV4ContextCache();
	__resetReachabilityCache();
	delete process.env.BGE_AGENT_TOKEN;
});

/**
 * @param handler
 */
function startFakeLocal(
	handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ close: () => Promise<void>; url: string }> {
	const server = http.createServer(handler);
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			resolve({
				url: `http://127.0.0.1:${port}`,
				close: () => new Promise((r) => server.close(() => r())),
			});
		});
	});
}

describe('routeToolCall — disk mode', () => {
	test('always runs the tool locally, never probing localUrl', async () => {
		const result = await routeToolCall(
			pageListTool,
			{},
			{ mode: 'disk', localUrl: 'http://127.0.0.1:1' },
		);
		expect(result.appliedTo).toBe('disk');
		expect(result.result).toMatchObject({ documentRoot: expect.stringContaining('src') });
	});

	test('editor_state_get resolves to an empty session list', async () => {
		const result = await routeToolCall(
			editorStateGetTool,
			{},
			{
				mode: 'disk',
				localUrl: 'http://127.0.0.1:1',
			},
		);
		expect(result.result).toEqual({ mode: 'disk', sessions: [] });
	});

	test('editor_wait_for_event rejects with local-required', async () => {
		await expect(
			routeToolCall(
				editorWaitForEventTool,
				{},
				{ mode: 'disk', localUrl: 'http://127.0.0.1:1' },
			),
		).rejects.toMatchObject({ code: 'local-required' });
	});
});

describe('routeToolCall — local mode', () => {
	test('an unreachable local server fails with local-unreachable', async () => {
		await expect(
			routeToolCall(pageListTool, {}, { mode: 'local', localUrl: 'http://127.0.0.1:1' }),
		).rejects.toMatchObject({ code: 'local-unreachable' });
	});
});

describe('routeToolCall — auto mode', () => {
	let fakeLocal: { close: () => Promise<void>; url: string } | null = null;

	afterEach(async () => {
		await fakeLocal?.close();
		fakeLocal = null;
	});

	test('forwards to a reachable local server and passes appliedTo through', async () => {
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			if (req.url === '/api/agent/invoke') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(
					JSON.stringify({ ok: true, result: { via: 'browser' }, appliedTo: 'browser' }),
				);
				return;
			}
			res.writeHead(404);
			res.end();
		});
		const result = await routeToolCall(
			pageListTool,
			{},
			{ mode: 'auto', localUrl: fakeLocal.url },
		);
		expect(result).toEqual({ result: { via: 'browser' }, appliedTo: 'browser' });
	});

	test('sends BGE_AGENT_TOKEN as a bearer header when set', async () => {
		let receivedAuth: string | undefined;
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			receivedAuth = req.headers.authorization;
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'disk' }));
		});
		process.env.BGE_AGENT_TOKEN = 'secret-token';
		await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url });
		expect(receivedAuth).toBe('Bearer secret-token');
	});

	test('a mid-window crash (reachable cached, but the connection fails on invoke) falls back to disk in auto mode without waiting out the TTL', async () => {
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'browser' }));
		});
		const localUrl = fakeLocal.url;
		// Warm the reachability cache with a real success, THEN kill the server —
		// the cached "reachable" verdict is still within its TTL for the next call.
		await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl });
		await fakeLocal.close();
		fakeLocal = null;

		const result = await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl });
		expect(result.appliedTo).toBe('disk');
	});

	test('the same mid-window crash surfaces as local-unreachable in --mode local (no disk fallback)', async () => {
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'browser' }));
		});
		const localUrl = fakeLocal.url;
		await routeToolCall(pageListTool, {}, { mode: 'local', localUrl });
		await fakeLocal.close();
		fakeLocal = null;

		await expect(
			routeToolCall(pageListTool, {}, { mode: 'local', localUrl }),
		).rejects.toMatchObject({ code: 'local-unreachable' });
	});

	test('an application-level error FROM a reachable local (e.g. stale readToken) propagates as-is, without falling back to disk', async () => {
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			res.writeHead(409, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ error: 'stale', message: 'readToken is stale' }));
		});
		await expect(
			routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url }),
		).rejects.toMatchObject({ code: 'stale' });
	});

	test('a 401 text response from a reachable local (auth required, no token) surfaces as unauthorized — NOT as a crash that falls back to disk', async () => {
		let invokeCalls = 0;
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				// status answers 200 without auth, exactly like local's real
				// route, so the reachability probe passes.
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			invokeCalls++;
			res.writeHead(401, { 'content-type': 'text/plain' });
			res.end('Unauthorized');
		});
		await expect(
			routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url }),
		).rejects.toMatchObject({ code: 'unauthorized' });
		expect(invokeCalls).toBe(1);
	});

	test('a non-JSON error body from a reachable local surfaces as an AgentError, not a disk fallback', async () => {
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			res.writeHead(500, { 'content-type': 'text/plain' });
			res.end('Internal Server Error');
		});
		await expect(
			routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url }),
		).rejects.toMatchObject({ code: 'invalid' });
	});

	test('falls back to disk once the local server stops responding (after the reachability TTL is reset)', async () => {
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'browser' }));
		});
		const first = await routeToolCall(
			pageListTool,
			{},
			{ mode: 'auto', localUrl: fakeLocal.url },
		);
		expect(first.appliedTo).toBe('browser');

		await fakeLocal.close();
		fakeLocal = null;
		__resetReachabilityCache();

		const second = await routeToolCall(
			pageListTool,
			{},
			{
				mode: 'auto',
				localUrl: 'http://127.0.0.1:1',
			},
		);
		expect(second.appliedTo).toBe('disk');
	});
});
