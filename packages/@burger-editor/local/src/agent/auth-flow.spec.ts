import type { LocalServerConfig } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { setRoute } from '../route.js';

import { createAgentAuth, type AgentAuth } from './auth.js';
import { createAgentHub, type AgentHub } from './hub.js';

/** A TEST-NET-3 address (RFC 5737) — non-loopback, so `createAgentAuth` requires a token. */
const LAN_HOST = '203.0.113.10';

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
		host: LAN_HOST,
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
let hub: AgentHub | undefined;
let auth: AgentAuth;
let app: Hono;

beforeEach(async () => {
	tmp = await mkdtempDisposable('bge-agent-auth-flow-');
	documentRoot = path.join(tmp.path, 'docs');
	await fs.mkdir(documentRoot);
	await fs.writeFile(path.join(documentRoot, 'a.html'), PAGE_HTML, 'utf8');
	const userConfig = makeConfig(documentRoot);
	app = new Hono();
	hub = createAgentHub({ indexFileName: userConfig.indexFileName });
	auth = await createAgentAuth(LAN_HOST, tmp.path);
	const noopUpgrade = (() => async (_c: unknown, next: () => Promise<void>) =>
		next()) as unknown as never;
	setRoute(app, userConfig, null, { hub, auth, upgradeWebSocket: noopUpgrade });
});

afterEach(async () => {
	hub?.dispose();
	hub = undefined;
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
	return app.request(urlPath, {
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
		expect(auth.required).toBe(true);
		expect(auth.token).toMatch(/^[0-9a-f]{48}$/);
	});
});

describe('non-loopback bind — POST /api/agent/invoke', () => {
	test('with no credentials is 401 Unauthorized', async () => {
		const res = await invoke(PAGE_BLOCKS);
		expect(res.status).toBe(401);
		expect(await res.text()).toBe('Unauthorized');
	});

	test('with the correct Authorization: Bearer token is 200', async () => {
		const res = await invoke(PAGE_BLOCKS, { authorization: `Bearer ${auth.token}` });
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
		const res = await invoke(PAGE_BLOCKS, { authorization: `Basic ${auth.token}` });
		expect(res.status).toBe(401);
	});

	test('with the correct bge_session cookie is 200', async () => {
		const res = await invoke(PAGE_BLOCKS, { cookie: `bge_session=${auth.token}` });
		expect(res.status).toBe(200);
	});

	test('with the correct bge_session cookie among other cookies is 200', async () => {
		const res = await invoke(PAGE_BLOCKS, {
			cookie: `theme=dark; bge_session=${auth.token}; lang=en`,
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
			{ authorization: `Bearer ${auth.token}` },
		);
		expect(res.status).toBe(200);
	});
});

describe('non-loopback bind — GET /?token= login', () => {
	test('a valid token sets an HttpOnly, SameSite=Strict bge_session cookie and redirects to the URL without the token', async () => {
		const res = await req(`/?token=${auth.token}`);
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('/');
		const setCookie = res.headers.get('set-cookie') ?? '';
		expect(setCookie).toContain(`bge_session=${auth.token}`);
		expect(setCookie).toContain('HttpOnly');
		expect(setCookie).toContain('SameSite=Strict');
		expect(setCookie).toContain('Path=/');
	});

	test('the redirect keeps every other query parameter but drops token', async () => {
		const res = await req(`/a.html?token=${auth.token}&draft=1`);
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
		const login = await req(`/?token=${auth.token}`);
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
			{ authorization: `Bearer ${auth.token}` },
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
		const res = await app.request('/api/agent/status', {
			headers: { host: '203.0.113.99', authorization: `Bearer ${auth.token}` },
		});
		expect(res.status).toBe(403);
		expect(await res.text()).toBe('Forbidden: untrusted Host header');
	});

	test('a loopback Host header is still allowed alongside the configured LAN host', async () => {
		const res = await app.request('/api/agent/status', {
			headers: { host: 'localhost', authorization: `Bearer ${auth.token}` },
		});
		expect(res.status).toBe(200);
	});
});
