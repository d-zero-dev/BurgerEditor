import type { LocalServerConfig } from './types.js';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { HEALTH_CHECK_END_POINT } from './constants.js';
import { createHealthChecker } from './create-health-checker.js';

describe('createHealthChecker', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('polls an IPv6 host through a bracketed, parseable URL (regression: #1001)', async () => {
		const fetchSpy = vi.fn(() => Promise.resolve(new Response('ok')));
		vi.stubGlobal('fetch', fetchSpy);
		// HealthMonitor schedules its next check with `window.setTimeout`.
		vi.stubGlobal('window', globalThis);
		// The config type admits only localhost / IPv4, but an untyped JS
		// config can still pass an IPv6 literal at runtime.
		const config = {
			host: '::1' as LocalServerConfig['host'],
			port: 5255,
			healthCheck: { enabled: true },
		} as LocalServerConfig;

		using monitor = createHealthChecker(config);
		monitor.start();
		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

		expect(fetchSpy).toHaveBeenCalledWith(`//[::1]:5255${HEALTH_CHECK_END_POINT}`);
	});
});
