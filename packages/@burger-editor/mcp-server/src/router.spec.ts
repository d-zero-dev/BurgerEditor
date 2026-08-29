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
import {
	computeWaitForEventTimeoutMs,
	__resetReachabilityCache,
	routeToolCall,
} from './router.js';

const pageListTool = agentTools.find((t) => t.name === 'page_list')!;
const pageCreateTool = agentTools.find((t) => t.name === 'page_create')!;
const editorStateGetTool = agentTools.find((t) => t.name === 'editor_state_get')!;
const editorWaitForEventTool = agentTools.find(
	(t) => t.name === 'editor_wait_for_event',
)!;

let stack: AsyncDisposableStack;
let projectDir: string;
let docRoot: string;

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
	projectDir = tmp.path;
	docRoot = path.join(tmp.path, 'src');
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

beforeEach(async () => {
	__resetV4ContextCache();
	__resetReachabilityCache();
	delete process.env.BGE_AGENT_TOKEN;
	await fs.rm(path.join(projectDir, '.burgereditor'), { recursive: true, force: true });
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
				close: () =>
					new Promise((r) => {
						// A handler that deliberately never answers (probe-timeout
						// test) leaves its socket open; `close()` alone would wait
						// for it forever.
						server.closeAllConnections();
						server.close(() => r());
					}),
			});
		});
	});
}

/**
 * A fake local that answers the reachability probe and echoes every invoke
 * as a browser-applied success, recording what it received.
 * @param onInvoke
 */
function startEchoingLocal(
	onInvoke: (req: http.IncomingMessage) => void = () => {},
): Promise<{ close: () => Promise<void>; url: string }> {
	return startFakeLocal((req, res) => {
		if (req.url === '/api/agent/status') {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ protocolVersion: 1 }));
			return;
		}
		onInvoke(req);
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'browser' }));
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

	test('reads the token from <configDir>/.burgereditor/agent-token (the file local writes) when BGE_AGENT_TOKEN is unset', async () => {
		let receivedAuth: string | undefined;
		fakeLocal = await startEchoingLocal((req) => {
			receivedAuth = req.headers.authorization;
		});
		// configDir is the directory of the resolved burgereditor.config.mjs —
		// the fixture's project root — which is where local persists the token.
		await fs.mkdir(path.join(projectDir, '.burgereditor'), { recursive: true });
		await fs.writeFile(
			path.join(projectDir, '.burgereditor', 'agent-token'),
			'file-token\n',
			'utf8',
		);
		await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url });
		expect(receivedAuth).toBe('Bearer file-token');
	});

	test('BGE_AGENT_TOKEN takes precedence over the token file', async () => {
		let receivedAuth: string | undefined;
		fakeLocal = await startEchoingLocal((req) => {
			receivedAuth = req.headers.authorization;
		});
		await fs.mkdir(path.join(projectDir, '.burgereditor'), { recursive: true });
		await fs.writeFile(
			path.join(projectDir, '.burgereditor', 'agent-token'),
			'file-token',
			'utf8',
		);
		process.env.BGE_AGENT_TOKEN = 'env-token';
		await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url });
		expect(receivedAuth).toBe('Bearer env-token');
	});

	test('sends no authorization header when neither the env var nor the token file exists', async () => {
		let receivedAuth: string | undefined = 'sentinel';
		fakeLocal = await startEchoingLocal((req) => {
			receivedAuth = req.headers.authorization;
		});
		await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url });
		expect(receivedAuth).toBeUndefined();
	});

	test('a mutation forwarded to a reachable local is applied in the browser only — nothing is written to disk', async () => {
		let forwarded: { tool: string; args: unknown } | null = null;
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			let body = '';
			req.on('data', (chunk) => {
				body += chunk;
			});
			req.on('end', () => {
				forwarded = JSON.parse(body);
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'browser' }));
			});
		});
		const result = await routeToolCall(
			pageCreateTool,
			{ path: 'created-in-browser.html' },
			{ mode: 'auto', localUrl: fakeLocal.url },
		);
		expect(result).toEqual({ result: {}, appliedTo: 'browser' });
		expect(forwarded).toEqual({
			tool: 'page_create',
			args: { path: 'created-in-browser.html' },
		});
		// The disk fixture holds exactly the one page beforeAll wrote — the
		// forwarded page_create must not have created a second file.
		expect(await fs.readdir(docRoot)).toEqual(['index.html']);
	});

	test('a local whose status route never answers is treated as unreachable after the 500 ms probe timeout and auto mode falls back to disk', async () => {
		let invokeCalls = 0;
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				// Never call res.end(): the probe must give up on its own.
				return;
			}
			invokeCalls++;
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'browser' }));
		});
		const started = Date.now();
		const result = await routeToolCall(
			pageListTool,
			{},
			{ mode: 'auto', localUrl: fakeLocal.url },
		);
		const elapsed = Date.now() - started;
		expect(result.appliedTo).toBe('disk');
		expect(invokeCalls).toBe(0);
		expect(elapsed).toBeGreaterThanOrEqual(450);
		expect(elapsed).toBeLessThan(2000);
	}, 5000);

	test('a reachable verdict is cached: two invokes inside the TTL probe /api/agent/status only once', async () => {
		let statusCalls = 0;
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				statusCalls++;
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ ok: true, result: {}, appliedTo: 'browser' }));
		});
		await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url });
		await routeToolCall(pageListTool, {}, { mode: 'auto', localUrl: fakeLocal.url });
		expect(statusCalls).toBe(1);
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

	test('a local that never answers editor_wait_for_event resolves as a graceful timeout once the client-side abort margin elapses, instead of erroring', async () => {
		fakeLocal = await startFakeLocal((req, res) => {
			if (req.url === '/api/agent/status') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ protocolVersion: 1 }));
				return;
			}
			// Never call res.end(): the client-side abort must fire on its own.
			// `local` is presumably still alive (just slower than the margin
			// allows), so this must NOT surface as `local-unreachable` /
			// `local-required` — that would make `auto` mode drop the
			// reachability cache and fall back to disk for what is really just
			// a slow long-poll.
		});
		const result = await routeToolCall(
			editorWaitForEventTool,
			{ since: 7, timeoutMs: 0 },
			{ mode: 'local', localUrl: fakeLocal.url },
		);
		expect(result).toEqual({
			result: { events: [], nextSince: 7, timedOut: true, overflowed: false },
			appliedTo: 'disk',
		});
	}, 10_000);
});

describe('computeWaitForEventTimeoutMs', () => {
	test('defaults to 10s plus the margin when timeoutMs is omitted', () => {
		expect(computeWaitForEventTimeoutMs({})).toBe(10_000 + 5000);
	});

	test('adds the margin on top of a requested timeoutMs', () => {
		expect(computeWaitForEventTimeoutMs({ timeoutMs: 2000 })).toBe(2000 + 5000);
	});

	test('clamps a requested timeoutMs above 30s to 30s before adding the margin', () => {
		expect(computeWaitForEventTimeoutMs({ timeoutMs: 999_999 })).toBe(30_000 + 5000);
	});

	test('clamps a negative timeoutMs to 0 before adding the margin', () => {
		expect(computeWaitForEventTimeoutMs({ timeoutMs: -5 })).toBe(5000);
	});

	test('ignores a non-numeric timeoutMs and falls back to the default', () => {
		expect(computeWaitForEventTimeoutMs({ timeoutMs: 'soon' })).toBe(10_000 + 5000);
	});
});
