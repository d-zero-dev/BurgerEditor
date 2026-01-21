import type { LocalServerConfig } from './types.js';

import { HealthMonitor } from '@burger-editor/core/health';

import { HEALTH_CHECK_END_POINT } from './constants.js';

/**
 * Creates a HealthMonitor instance configured for the local server
 * @param config - Local server configuration
 * @returns A configured HealthMonitor instance ready to start
 * @example
 * ```typescript
 * import { getUserConfig, createHealthChecker } from '@burger-editor/local';
 *
 * const config = await getUserConfig();
 * const healthMonitor = createHealthChecker(config);
 * healthMonitor.start();
 * ```
 */
export function createHealthChecker(config: LocalServerConfig): HealthMonitor {
	// プロトコル省略でブラウザがhttp/httpsフォールバックを処理
	const baseUrl = `//${config.host}:${config.port}`;

	return new HealthMonitor({
		...config.healthCheck,
		async checkHealth() {
			try {
				const response = await fetch(`${baseUrl}${HEALTH_CHECK_END_POINT}`);
				return response.ok;
			} catch {
				return false;
			}
		},
	});
}
