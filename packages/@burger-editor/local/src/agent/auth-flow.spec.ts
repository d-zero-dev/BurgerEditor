import type { LocalServerConfig } from '../types.js';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	createTestApp,
	makeLocalServerConfig,
	makeTmpRoots,
	type TestApp,
	type TmpRoots,
} from '../__tests__/fixtures.js';
import { LAN_HOST, PAGE_HTML } from '../__tests__/protocol-fixtures.js';

let tmp: TmpRoots | undefined;
let documentRoot: string;
let t: TestApp;

beforeEach(async () => {
	tmp = await makeTmpRoots('bge-agent-auth-flow-', { pages: { 'a.html': PAGE_HTML } });
	documentRoot = tmp.documentRoot;
	const config: LocalServerConfig = makeLocalServerConfig({
		documentRoot,
		host: LAN_HOST,
	});
	t = await createTestApp({ config, configDir: tmp.path });
});

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

/**
 * @param body
 * @param extraHeaders
 */
function invoke(body: unknown, extraHeaders: Record<string, string> = {}) {
	return req(
		'/api/agent/invoke',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		},
		extraHeaders,
	);
}

const PAGE_BLOCKS = { tool: 'page_blocks', args: { path: '/a.html' } };

describe('non-loopback bind — the auth fixture itself', () => {
	test('createAgentAuth for 203.0.113.10 requires a 48-hex-char token', () => {
		expect(t.auth!.required).toBe(true);
		expect(t.auth!.token).toMatch(/^[0-9a-f]{48}$/);
	});
});

describe('non-loopback bind — POST /api/agent/invoke', () => {
	test('with no credentials is 401 Unauthorized', async () => {
		const res = await invoke(PAGE_BLOCKS);
		expect(res.status).toBe(401);
		expect(await res.text()).toBe('Unauthorized');
	});

	test('with the correct Authorization: Bearer token is 200', async () => {
		const res = await invoke(PAGE_BLOCKS, { authorization: `Bearer ${t.auth!.token}` });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean; appliedTo: string };
		expect(body.ok).toBe(true);
		expect(body.appliedTo).toBe('disk');
	});

	test('with a wrong bearer token is 401', async () => {
		const res = await invoke(PAGE_BLOCKS, {
			authorization: 'Bearer 000000000000000000000000000000000000000000000000',
		});
		expect(res.status).toBe(401);
	});

	test('with a bearer token of the wrong length is 401', async () => {
		const res = await invoke(PAGE_BLOCKS, { authorization: 'Bearer short' });
		expect(res.status).toBe(401);
	});

	test('with the token in an Authorization header that is not a Bearer scheme is 401', async () => {
		const res = await invoke(PAGE_BLOCKS, { authorization: `Basic ${t.auth!.token}` });
		expect(res.status).toBe(401);
	});

	test('with the correct bge_session cookie is 200', async () => {
		const res = await invoke(PAGE_BLOCKS, { cookie: `bge_session=${t.auth!.token}` });
		expect(res.status).toBe(200);
	});

	test('with the correct bge_session cookie among other cookies is 200', async () => {
		const res = await invoke(PAGE_BLOCKS, {
			cookie: `theme=dark; bge_session=${t.auth!.token}; lang=en`,
		});
		expect(res.status).toBe(200);
	});

	test('with a wrong bge_session cookie is 401', async () => {
		const res = await invoke(PAGE_BLOCKS, {
			cookie: 'bge_session=000000000000000000000000000000000000000000000000',
		});
		expect(res.status).toBe(401);
	});

	test('GET /api/agent/tools without credentials is 401', async () => {
		const res = await req('/api/agent/tools');
		expect(res.status).toBe(401);
	});

	test('GET /api/agent/tools with the bearer token is 200', async () => {
		const res = await req(
			'/api/agent/tools',
			{},
			{ authorization: `Bearer ${t.auth!.token}` },
		);
		expect(res.status).toBe(200);
	});
});

describe('non-loopback bind — GET /?token= login', () => {
	test('a valid token sets an HttpOnly, SameSite=Strict bge_session cookie and redirects to the URL without the token', async () => {
		const res = await req(`/?token=${t.auth!.token}`);
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('/');
		const setCookie = res.headers.get('set-cookie') ?? '';
		expect(setCookie).toContain(`bge_session=${t.auth!.token}`);
		expect(setCookie).toContain('HttpOnly');
		expect(setCookie).toContain('SameSite=Strict');
		expect(setCookie).toContain('Path=/');
	});

	test('the redirect keeps every other query parameter but drops token', async () => {
		const res = await req(`/a.html?token=${t.auth!.token}&draft=1`);
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('/a.html?draft=1');
	});

	test('a wrong token is 401 and sets no cookie', async () => {
		const res = await req('/?token=wrong');
		expect(res.status).toBe(401);
		expect(await res.text()).toBe('Unauthorized: invalid token');
		expect(res.headers.get('set-cookie')).toBeNull();
	});

	test('the cookie the login handed out then authorizes /api/agent/invoke', async () => {
		const login = await req(`/?token=${t.auth!.token}`);
		const cookiePair = (login.headers.get('set-cookie') ?? '').split(';')[0]!;
		const res = await invoke(PAGE_BLOCKS, { cookie: cookiePair });
		expect(res.status).toBe(200);
	});
});

describe('non-loopback bind — GET /api/agent/status', () => {
	test('unauthenticated returns only protocolVersion and version', async () => {
		const res = await req('/api/agent/status');
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body).toEqual({ protocolVersion: '1', version: '0.0.0-test' });
	});

	test('authenticated returns the full payload including pid and documentRoot', async () => {
		const res = await req(
			'/api/agent/status',
			{},
			{ authorization: `Bearer ${t.auth!.token}` },
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(Object.keys(body).toSorted()).toEqual([
			'documentRoot',
			'pid',
			'protocolVersion',
			'sessions',
			'startedAt',
			'version',
			'virtualTree',
		]);
		expect(body.documentRoot).toBe(documentRoot);
		expect(body.pid).toBe(process.pid);
	});
});

describe('non-loopback bind — Host guard on /api/agent/*', () => {
	test('a Host header naming a different address is 403 even with a valid bearer token', async () => {
		const res = await t.app.request('/api/agent/status', {
			headers: { host: '203.0.113.99', authorization: `Bearer ${t.auth!.token}` },
		});
		expect(res.status).toBe(403);
		expect(await res.text()).toBe('Forbidden: untrusted Host header');
	});

	test('a loopback Host header is still allowed alongside the configured LAN host', async () => {
		const res = await t.app.request('/api/agent/status', {
			headers: { host: 'localhost', authorization: `Bearer ${t.auth!.token}` },
		});
		expect(res.status).toBe(200);
	});
});
