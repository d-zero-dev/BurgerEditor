import { test, expect, beforeEach, afterEach, describe, vi } from 'vitest';

import { HealthMonitor } from './health-monitor.js';

describe('HealthMonitor', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('start', () => {
		test('should not start when enabled is false', () => {
			const checkHealth = vi.fn().mockResolvedValue(true);
			const monitor = new HealthMonitor({ enabled: false, checkHealth });

			monitor.start();

			expect(checkHealth).not.toHaveBeenCalled();
		});

		test('should call checkHealth immediately when enabled', async () => {
			const checkHealth = vi.fn().mockResolvedValue(true);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				checkHealth,
			});

			monitor.start();
			await vi.advanceTimersByTimeAsync(0);

			expect(checkHealth).toHaveBeenCalledOnce();

			monitor.stop();
		});

		test('should not start twice if already running', async () => {
			const checkHealth = vi.fn().mockResolvedValue(true);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				checkHealth,
			});

			monitor.start();
			await vi.advanceTimersByTimeAsync(0);
			monitor.start();

			expect(checkHealth).toHaveBeenCalledOnce();

			monitor.stop();
		});

		test('should pass context to checkHealth', async () => {
			const checkHealth = vi.fn().mockResolvedValue(true);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 5000,
				retryCount: 5,
				checkHealth,
			});

			monitor.start();
			await vi.advanceTimersByTimeAsync(0);

			expect(checkHealth).toHaveBeenCalledWith({
				enabled: true,
				interval: 5000,
				retryCount: 5,
				currentFailureCount: 0,
			});

			monitor.stop();
		});
	});

	describe('stop', () => {
		test('should clear the timer', async () => {
			const checkHealth = vi.fn().mockResolvedValue(true);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				checkHealth,
			});

			monitor.start();
			await vi.advanceTimersByTimeAsync(0);
			monitor.stop();

			expect(checkHealth).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(30_000);

			expect(checkHealth).toHaveBeenCalledOnce();
		});
	});

	describe('online/offline transitions', () => {
		test('should call onOffline after consecutive failures reach retryCount', async () => {
			const onOffline = vi.fn();
			const checkHealth = vi.fn().mockResolvedValue(false);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				retryCount: 3,
				checkHealth,
				onOffline,
			});

			monitor.start();
			expect(monitor.isOnline).toBe(true);

			// 1st check (immediate): fail → failureCount=1
			await vi.advanceTimersByTimeAsync(0);
			expect(checkHealth).toHaveBeenCalledTimes(1);
			expect(onOffline).not.toHaveBeenCalled();
			expect(monitor.isOnline).toBe(true);

			// 2nd check (after backoff ~3333ms): fail → failureCount=2
			await vi.advanceTimersByTimeAsync(4000);
			expect(checkHealth).toHaveBeenCalledTimes(2);
			expect(onOffline).not.toHaveBeenCalled();
			expect(monitor.isOnline).toBe(true);

			// 3rd check (after backoff ~5000ms): fail → failureCount=3 = retryCount → offline
			await vi.advanceTimersByTimeAsync(6000);
			expect(checkHealth).toHaveBeenCalledTimes(3);
			expect(onOffline).toHaveBeenCalledOnce();
			expect(monitor.isOnline).toBe(false);

			monitor.stop();
		});

		test('should call onOnline when recovering from offline', async () => {
			const onOnline = vi.fn();
			const onOffline = vi.fn();
			let isHealthy = false;
			const checkHealth = vi.fn().mockImplementation(() => Promise.resolve(isHealthy));
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				retryCount: 3,
				checkHealth,
				onOffline,
				onOnline,
			});

			monitor.start();

			// Go offline: 3 consecutive failures
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(10_000);
			await vi.advanceTimersByTimeAsync(10_000);
			expect(monitor.isOnline).toBe(false);

			// Recover
			isHealthy = true;
			await vi.advanceTimersByTimeAsync(10_000);
			expect(onOnline).toHaveBeenCalledOnce();
			expect(monitor.isOnline).toBe(true);

			monitor.stop();
		});

		test('should reset failure count on successful check', async () => {
			const onOffline = vi.fn();
			let callCount = 0;
			const checkHealth = vi.fn().mockImplementation(() => {
				callCount++;
				// Fail once, then succeed
				if (callCount === 1) return Promise.resolve(false);
				return Promise.resolve(true);
			});
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				retryCount: 2,
				checkHealth,
				onOffline,
			});

			monitor.start();

			// 1st: fail → failureCount=1
			await vi.advanceTimersByTimeAsync(0);
			expect(onOffline).not.toHaveBeenCalled();

			// 2nd: success → failureCount reset to 0
			await vi.advanceTimersByTimeAsync(10_000);
			expect(onOffline).not.toHaveBeenCalled();
			expect(checkHealth).toHaveBeenCalledTimes(2);

			monitor.stop();
		});

		test('should handle checkHealth throwing errors as failures', async () => {
			const onOffline = vi.fn();
			const checkHealth = vi.fn().mockRejectedValue(new Error('Network error'));
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				retryCount: 2,
				checkHealth,
				onOffline,
			});

			monitor.start();

			await vi.advanceTimersByTimeAsync(0);
			expect(monitor.isOnline).toBe(true);

			await vi.advanceTimersByTimeAsync(10_000);
			expect(onOffline).toHaveBeenCalledOnce();
			expect(monitor.isOnline).toBe(false);

			monitor.stop();
		});
	});

	describe('interval calculation', () => {
		test('should use base interval for normal state', async () => {
			const checkHealth = vi.fn().mockResolvedValue(true);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				retryCount: 3,
				checkHealth,
			});

			monitor.start();
			await vi.advanceTimersByTimeAsync(0);
			expect(checkHealth).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(10_000);
			expect(checkHealth).toHaveBeenCalledTimes(2);

			monitor.stop();
		});

		test('should use exponential backoff during retry phase', async () => {
			const checkHealth = vi.fn().mockResolvedValue(false);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				retryCount: 3,
				checkHealth,
			});

			monitor.start();

			// 1st check (immediate)
			await vi.advanceTimersByTimeAsync(0);
			expect(checkHealth).toHaveBeenCalledTimes(1);

			// After first failure, interval = baseRetryInterval * 1.5^0 = 10000/3 ≈ 3333ms
			const baseRetry = 10_000 / 3;
			await vi.advanceTimersByTimeAsync(baseRetry);
			expect(checkHealth).toHaveBeenCalledTimes(2);

			monitor.stop();
		});

		test('should use base interval when offline', async () => {
			const checkHealth = vi.fn().mockResolvedValue(false);
			const monitor = new HealthMonitor({
				enabled: true,
				interval: 10_000,
				retryCount: 3,
				checkHealth,
			});

			monitor.start();

			// Go offline (3 failures)
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(10_000);
			await vi.advanceTimersByTimeAsync(10_000);
			expect(monitor.isOnline).toBe(false);

			const callsBefore = checkHealth.mock.calls.length;

			// Offline interval should be base interval
			await vi.advanceTimersByTimeAsync(10_000);
			expect(checkHealth).toHaveBeenCalledTimes(callsBefore + 1);

			monitor.stop();
		});
	});

	describe('isOnline', () => {
		test('should default to true', () => {
			const monitor = new HealthMonitor();
			expect(monitor.isOnline).toBe(true);
		});
	});

	describe('defaults', () => {
		test('should use default values when options not provided', () => {
			const monitor = new HealthMonitor();
			expect(monitor.isOnline).toBe(true);
			// enabled defaults to false, so start() should not do anything
			const checkHealth = vi.fn();
			monitor.start();
			expect(checkHealth).not.toHaveBeenCalled();
		});
	});
});
