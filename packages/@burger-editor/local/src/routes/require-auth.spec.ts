import type { LocalServerConfig } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	createTestApp,
	makeLocalServerConfig,
	makeTmpRoots,
	type TestApp,
	type TmpRoots,
} from '../__tests__/fixtures.js';
import { FOREIGN_HOST, LAN_HOST, PAGE_HTML } from '../__tests__/protocol-fixtures.js';

let tmp: TmpRoots | undefined;
let t: TestApp;

/**
 * @param agentEnabled
 * @param host
 */
async function setUp(agentEnabled: boolean, host: LocalServerConfig['host']) {
	tmp = await makeTmpRoots('bge-require-auth-', { pages: { 'a.html': PAGE_HTML } });
	t = await createTestApp({
		config: makeLocalServerConfig({
			documentRoot: tmp.documentRoot,
			host,
			agent: { enabled: agentEnabled },
		}),
		configDir: tmp.path,
	});
}

afterEach(async () => {
	await t[Symbol.asyncDispose]();
	await tmp?.[Symbol.asyncDispose]();
});

/**
 * @param urlPath
 * @param init
 * @param extraHeaders
 */
function req(
	urlPath: string,
	init: RequestInit = {},
	extraHeaders: Record<string, string> = {},
) {
	return t.app.request(urlPath, {
		...init,
		headers: {
			...(init.headers as Record<string, string>),
			host: LAN_HOST,
			...extraHeaders,
		},
	});
}

const WRITE_PATHS = [
	['POST /api/content', '/api/content'],
	['POST /api/content/create', '/api/content/create'],
	['POST /api/file/list', '/api/file/list'],
	['POST /api/file/upload', '/api/file/upload'],
] as const;

describe.each([true, false])(
	'non-loopback bind (agent.enabled: %s) — app-wide credential gate',
	(agentEnabled) => {
		beforeEach(async () => {
			await setUp(agentEnabled, LAN_HOST);
		});

		test.each(['/', '/a.html', '/config.json', '/api/tree'])(
			'GET %s without credentials is 401',
			async (urlPath) => {
				const res = await req(urlPath);
				expect(res.status).toBe(401);
			},
		);

		test.each(WRITE_PATHS)('%s without credentials is 401', async (_label, urlPath) => {
			const res = await req(urlPath, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}',
			});
			expect(res.status).toBe(401);
		});

		test('a bearer token passes the gate', async () => {
			const res = await req(
				'/config.json',
				{},
				{ authorization: `Bearer ${t.auth.token}` },
			);
			expect(res.status).toBe(200);
		});

		test('the bge_session cookie passes the gate', async () => {
			const res = await req('/a.html', {}, { cookie: `bge_session=${t.auth.token}` });
			expect(res.status).toBe(200);
		});

		test('a wrong cookie does not pass the gate', async () => {
			const res = await req('/a.html', {}, { cookie: 'bge_session=wrong' });
			expect(res.status).toBe(401);
		});

		test('the ?token= login still works through the gate', async () => {
			const res = await req(`/?token=${t.auth.token}`);
			expect(res.status).toBe(302);
		});

		test('an uploaded media file under a filesDir clientPath is 401 without credentials', async () => {
			await fs.writeFile(path.join(t.config.assetsRoot, 'secret.txt'), 'x', 'utf8');
			const res = await req('/files/secret.txt');
			expect(res.status).toBe(401);
		});

		test('an uploaded media file is served once the cookie is present', async () => {
			await fs.writeFile(path.join(t.config.assetsRoot, 'secret.txt'), 'x', 'utf8');
			const res = await req(
				'/files/secret.txt',
				{},
				{ cookie: `bge_session=${t.auth.token}` },
			);
			expect(res.status).toBe(200);
		});

		test('a path that merely starts with /api/agent is not exempt from the gate', async () => {
			const res = await req('/api/agent-extra');
			expect(res.status).toBe(401);
		});

		test('a path that merely starts with /ws is not exempt from the gate', async () => {
			const res = await req('/ws-extra');
			expect(res.status).toBe(401);
		});

		test('the health endpoint stays open', async () => {
			const res = await req('/api/health');
			expect(res.status).toBe(200);
		});

		test('a foreign Host is 403 on a content route even with a valid token', async () => {
			const res = await req(
				'/config.json',
				{},
				{ host: FOREIGN_HOST, authorization: `Bearer ${t.auth.token}` },
			);
			expect(res.status).toBe(403);
		});
	},
);

describe('loopback bind', () => {
	beforeEach(async () => {
		await setUp(true, 'localhost');
	});

	test('pages and APIs are open without credentials', async () => {
		const res = await t.request('/config.json');
		expect(res.status).toBe(200);
	});

	test('a request without a Host header is 403', async () => {
		const res = await t.app.request('/config.json');
		expect(res.status).toBe(403);
	});

	test('a Host that is not loopback is 403 on a content route (DNS rebinding)', async () => {
		const res = await t.request('/config.json', {
			headers: { host: 'attacker.example' },
		});
		expect(res.status).toBe(403);
	});

	test('a foreign Origin is 403 on POST /api/content (DNS rebinding)', async () => {
		const res = await t.request('/api/content', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				origin: 'http://attacker.example',
			},
			body: '{}',
		});
		expect(res.status).toBe(403);
	});
});
