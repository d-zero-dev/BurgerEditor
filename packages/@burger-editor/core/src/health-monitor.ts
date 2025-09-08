import type { BurgerEditorEngine } from './engine/engine.js';

import { createBgeEvent } from './event/create-bge-event.js';

export interface HealthCheckContext {
	readonly enabled: boolean;
	readonly interval: number;
	readonly retryCount: number;
	readonly currentFailureCount: number;
}

export interface HealthCheckFunction {
	(context: HealthCheckContext): Promise<boolean>;
}

export interface HealthMonitorOptions {
	readonly enabled: boolean;
	readonly interval: number;
	readonly retryCount: number;
	readonly checkHealth: HealthCheckFunction;
}

/**
 * Monitors server health status and notifies offline/online state changes via events
 */
export class HealthMonitor {
	#checkHealth: HealthCheckFunction;
	/**
	 * Default health check implementation (no-op, always returns true)
	 */
	#defaultHealthCheck: HealthCheckFunction = () => {
		return Promise.resolve(true);
	};
	#enabled: boolean;
	#engine: BurgerEditorEngine;
	#failureCount: number = 0;
	#interval: number;
	#isOnline: boolean = true;
	#retryCount: number;
	#timeoutId: number | null = null;

	/**
	 * Get current online status
	 */
	get isOnline(): boolean {
		return this.#isOnline;
	}

	constructor(engine: BurgerEditorEngine, options?: Partial<HealthMonitorOptions>) {
		this.#engine = engine;
		this.#enabled = options?.enabled ?? false;
		this.#interval = options?.interval ?? 10_000;
		this.#retryCount = options?.retryCount ?? 3;
		this.#checkHealth = options?.checkHealth ?? this.#defaultHealthCheck;
	}

	/**
	 * Start health monitoring
	 */
	start(): void {
		if (!this.#enabled || this.#timeoutId !== null) {
			return;
		}

		// Initial check (scheduleNextCheck will be called from performHealthCheck)
		void this.#performHealthCheck();
	}

	/**
	 * Stop health monitoring
	 */
	stop(): void {
		if (this.#timeoutId !== null) {
			clearTimeout(this.#timeoutId);
			this.#timeoutId = null;
		}
	}

	/**
	 * Calculate dynamic interval based on current state
	 * - Normal/Recovery/Offline: use base interval (設定したintervalで等間隔)
	 * - Retry phase: exponential backoff for fast detection
	 */
	#calculateInterval(): number {
		// Normal state or offline state: use base interval
		if (this.#failureCount === 0 || !this.#isOnline) {
			return this.#interval;
		}

		// Retry phase (failing but still online): exponential backoff
		// Fast initial detection, then backs off
		const baseRetryInterval = this.#interval / this.#retryCount;
		const exponentialFactor = Math.pow(1.5, this.#failureCount - 1);
		return Math.min(baseRetryInterval * exponentialFactor, this.#interval);
	}
	/**
	 * Dispatch server offline event
	 */
	#dispatchServerOfflineEvent(): void {
		const event = createBgeEvent('bge:server-offline', { timestamp: Date.now() });
		this.#engine.el.dispatchEvent(event);
	}
	/**
	 * Dispatch server online event
	 */
	#dispatchServerOnlineEvent(): void {
		const event = createBgeEvent('bge:server-online', { timestamp: Date.now() });
		this.#engine.el.dispatchEvent(event);
	}
	/**
	 * Handle health check failure
	 */
	#handleFailure(): void {
		this.#failureCount++;

		// Transition to offline state when consecutive failures reach threshold
		if (this.#failureCount >= this.#retryCount && this.#isOnline) {
			this.#isOnline = false;
			this.#dispatchServerOfflineEvent();
		}
	}
	/**
	 * Perform health check using provided callback
	 */
	async #performHealthCheck(): Promise<void> {
		try {
			const context = {
				enabled: this.#enabled,
				interval: this.#interval,
				retryCount: this.#retryCount,
				currentFailureCount: this.#failureCount,
			};
			const isHealthy = await this.#checkHealth(context);

			if (isHealthy) {
				// Success: Check for recovery from offline state
				if (this.#isOnline) {
					// Already online, reset failure count
					this.#failureCount = 0;
				} else {
					this.#isOnline = true;
					this.#failureCount = 0;
					this.#dispatchServerOnlineEvent();
				}
			} else {
				// Health check returned false: treat as failure
				this.#handleFailure();
			}
		} catch {
			// Health check threw error: treat as failure
			this.#handleFailure();
		}

		// Schedule next check with dynamic interval
		this.#scheduleNextCheck();
	}

	/**
	 * Schedule next health check with dynamic interval
	 */
	#scheduleNextCheck(): void {
		const nextInterval = this.#calculateInterval();
		this.#timeoutId = window.setTimeout(() => {
			void this.#performHealthCheck();
		}, nextInterval);
	}
}
