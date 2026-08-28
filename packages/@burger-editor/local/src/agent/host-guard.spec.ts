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
			const app = buildApp('192.168.1.50');
			const res = await app.request('/api/agent/status', { headers: { host } });
			expect(res.status).toBe(200);
		},
	);

	test('allows the configured host', async () => {
		const app = buildApp('192.168.1.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.168.1.50:5255' },
		});
		expect(res.status).toBe(200);
	});

	test('rejects an unrecognized Host header (DNS rebinding)', async () => {
		const app = buildApp('192.168.1.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: 'evil.example.com' },
		});
		expect(res.status).toBe(403);
	});

	test('rejects a missing Host header', async () => {
		const guard = hostGuard('192.168.1.50');
		const fakeContext = {
			req: { header: () => {} },
			text: (body: string, status: number) => new Response(body, { status }),
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await guard(fakeContext as any, async () => {});
		expect((result as Response).status).toBe(403);
	});

	test('rejects a mismatched Origin header even with an allowed Host header', async () => {
		const app = buildApp('192.168.1.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.168.1.50:5255', origin: 'http://evil.example.com' },
		});
		expect(res.status).toBe(403);
	});

	test('allows a matching Origin header', async () => {
		const app = buildApp('192.168.1.50');
		const res = await app.request('/api/agent/status', {
			headers: { host: '192.168.1.50:5255', origin: 'http://192.168.1.50:5255' },
		});
		expect(res.status).toBe(200);
	});
});
