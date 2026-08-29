import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';

import { hostGuard } from './host-guard.js';

/**
 * @param configuredHost
 */
function buildApp(configuredHost: string): Hono {
	const app = new Hono();
	app.use('*', hostGuard(configuredHost));
	app.get('/api/agent/status', (c) => c.json({ ok: true }));
	return app;
}

describe('hostGuard', () => {
	test.each(['localhost', '127.0.0.1', '[::1]'])(
		'allows a loopback Host header (%s) with no configured host match needed',
		async (host) => {
			const app = buildApp('192.0.2.50');
			const res = await app.request('/api/agent/status', { headers: { host } });
			expect(res.status).toBe(200);
		},
	);

	test('allows the configured host', async () => {
		const app = buildApp('192.0.2.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.0.2.50:5255' },
		});
		expect(res.status).toBe(200);
	});

	test('rejects an unrecognized Host header (DNS rebinding)', async () => {
		const app = buildApp('192.0.2.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: 'evil.example.com' },
		});
		expect(res.status).toBe(403);
	});

	test('rejects a missing Host header', async () => {
		const guard = hostGuard('192.0.2.50');
		const fakeContext = {
			req: { header: () => {} },
			text: (body: string, status: number) => new Response(body, { status }),
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await guard(fakeContext as any, async () => {});
		expect((result as Response).status).toBe(403);
	});

	test('rejects a mismatched Origin header even with an allowed Host header', async () => {
		const app = buildApp('192.0.2.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.0.2.50:5255', origin: 'http://evil.example.com' },
		});
		expect(res.status).toBe(403);
	});

	test('allows a matching Origin header', async () => {
		const app = buildApp('192.0.2.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.0.2.50:5255', origin: 'http://192.0.2.50:5255' },
		});
		expect(res.status).toBe(200);
	});
});

describe('hostGuard — wildcard bind (0.0.0.0 / ::)', () => {
	// A wildcard bind is reachable under every interface address, and no
	// client ever sends the wildcard itself as Host — allow-listing the
	// literal would 403 every real LAN client. Access is gated by the agent
	// token in that mode; the guard only has to keep Origin honest.
	test.each(['0.0.0.0', '::', '[::]'])(
		'%s accepts a request addressed to any interface address',
		async (bind) => {
			const app = buildApp(bind);
			const res = await app.request('/api/agent/status', {
				headers: { host: '192.0.2.20:5255' },
			});
			expect(res.status).toBe(200);
		},
	);

	test('accepts when Origin names the same host the request was addressed to', async () => {
		const app = buildApp('0.0.0.0');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.0.2.20:5255', origin: 'http://192.0.2.20:5255' },
		});
		expect(res.status).toBe(200);
	});

	test('still rejects an Origin that differs from Host (DNS rebinding page)', async () => {
		const app = buildApp('0.0.0.0');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.0.2.20:5255', origin: 'http://evil.example.com' },
		});
		expect(res.status).toBe(403);
	});

	test('still rejects a missing Host header', async () => {
		const guard = hostGuard('0.0.0.0');
		const fakeContext = {
			req: { header: () => {} },
			text: (body: string, status: number) => new Response(body, { status }),
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await guard(fakeContext as any, async () => {});
		expect((result as Response).status).toBe(403);
	});
});
