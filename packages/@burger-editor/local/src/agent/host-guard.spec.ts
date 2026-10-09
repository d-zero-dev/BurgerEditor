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

describe('hostGuard — an IPv6 configured host (regression: #1001)', () => {
	// Browsers send an IPv6 Host/Origin bracketed (`[2001:db8::1]:5255`), and
	// URL#hostname keeps the brackets — the bare configured value alone
	// would 403 every legitimate request.
	test('accepts Host and Origin addressed to the bracketed configured address', async () => {
		const app = buildApp('2001:db8::1');
		const res = await app.request('/api/agent/status', {
			headers: {
				host: '[2001:db8::1]:5255',
				origin: 'http://[2001:db8::1]:5255',
			},
		});
		expect(res.status).toBe(200);
	});

	test('matches however the config spells the address (uppercase, long form)', async () => {
		const app = buildApp('2001:DB8:0:0::1');
		const res = await app.request('/api/agent/status', {
			headers: { host: '[2001:db8::1]:5255' },
		});
		expect(res.status).toBe(200);
	});

	test('still rejects a different IPv6 address', async () => {
		const app = buildApp('2001:db8::1');
		const res = await app.request('/api/agent/status', {
			headers: { host: '[2001:db8::2]:5255' },
		});
		expect(res.status).toBe(403);
	});
});

describe('hostGuard — missing Host header', () => {
	test('rejects a request without a Host header', async () => {
		const guard = hostGuard('192.0.2.50');
		const fakeContext = {
			req: { header: () => {} },
			text: (body: string, status: number) => new Response(body, { status }),
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await guard(fakeContext as any, async () => {});
		expect((result as Response).status).toBe(403);
	});
});
