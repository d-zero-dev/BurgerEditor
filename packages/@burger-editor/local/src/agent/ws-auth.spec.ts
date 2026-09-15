import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	createTestApp,
	makeLocalServerConfig,
	makeTmpRoots,
	type TestApp,
	type TmpRoots,
} from '../__tests__/fixtures.js';
import {
	FOREIGN_HOST,
	LAN_HOST,
	PAGE_HTML,
	WRONG_TOKEN,
} from '../__tests__/protocol-fixtures.js';

/**
 * Makes the request look like a WebSocket handshake to Hono. This matters
 * for ORDERING: `@hono/node-server`'s `upgradeWebSocket` answers 500 in
 * process when it sees `upgrade: websocket` (there is no real Node socket to
 * hand over), so a 401/403 here proves `hostGuard`/`requireAgentAuth` ran
 * BEFORE it. Without these headers `upgradeWebSocket` would fall through to
 * `next()` and a mis-ordered middleware chain would go unnoticed.
 */
const UPGRADE_HEADERS = { upgrade: 'websocket', connection: 'Upgrade' } as const;

let roots: TmpRoots;
let t: TestApp;

beforeEach(async () => {
	roots = await makeTmpRoots('bge-agent-ws-auth-', { pages: { 'a.html': PAGE_HTML } });
	t = await createTestApp({
		config: makeLocalServerConfig({ documentRoot: roots.documentRoot, host: LAN_HOST }),
		configDir: roots.path,
	});
});

afterEach(async () => {
	await t[Symbol.asyncDispose]();
	await roots[Symbol.asyncDispose]();
});

describe('GET /ws/editor handshake — non-loopback bind', () => {
	test('no credentials → 401 before upgradeWebSocket runs; no session registered', async () => {
		const res = await t.request('/ws/editor', { headers: UPGRADE_HEADERS });
		expect(res.status).toBe(401);
		expect(t.hub!.tabHub.snapshotAll()).toEqual([]);
	});

	test('wrong bge_session cookie → 401', async () => {
		const res = await t.request('/ws/editor', {
			headers: { ...UPGRADE_HEADERS, cookie: `bge_session=${WRONG_TOKEN}` },
		});
		expect(res.status).toBe(401);
	});

	test('wrong bearer → 401', async () => {
		const res = await t.request('/ws/editor', {
			headers: { ...UPGRADE_HEADERS, authorization: `Bearer ${WRONG_TOKEN}` },
		});
		expect(res.status).toBe(401);
	});

	test('foreign Host → 403 even with a valid bearer (hostGuard precedes auth)', async () => {
		const res = await t.request('/ws/editor', {
			headers: {
				...UPGRADE_HEADERS,
				host: FOREIGN_HOST,
				authorization: `Bearer ${t.auth!.token}`,
			},
		});
		expect(res.status).toBe(403);
		expect(await res.text()).toBe('Forbidden: untrusted Host header');
	});

	// Why there is no "valid credentials → accepted" case here: `app.request`
	// carries no `HttpBindings.incoming`, so `@hono/node-server`'s
	// `upgradeWebSocket` can only answer 500 in-process. The positive path is
	// observable exclusively through `createLocalServer` — see `ws.spec.ts`.
});
