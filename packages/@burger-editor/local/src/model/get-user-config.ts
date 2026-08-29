import type { LocalServerConfig } from '../types.js';

import path from 'node:path';

import { resolveConfig } from '@burger-editor/file-io';

export interface UserConfigResult {
	readonly config: LocalServerConfig;
	/**
	 * Directory the config file was found in, or `process.cwd()` when no
	 * config file exists — where `agent/auth.ts` stores the per-launch agent
	 * token (`<configDir>/.burgereditor/agent-token`).
	 */
	readonly configDir: string;
}

/**
 * Locate and parse the user's BurgerEditor config, merge it with defaults,
 * and report where it was found. Thin wrapper around
 * `@burger-editor/file-io`'s `resolveConfig`; returns `{ config, configDir }`
 * rather than the bare config because the Agent Hub needs the config's
 * directory as a stable place to persist its per-launch token — and a
 * caller that only wants the config picks `config` out of it in one step.
 * @example
 * ```ts
 * import { getUserConfig } from '@burger-editor/local/get-user-config';
 *
 * const { config, configDir } = await getUserConfig();
 * console.log(config.host, config.port); // 'localhost' 5255
 * console.log(configDir); // directory containing burgereditor.config.js
 * ```
 */
export async function getUserConfig(): Promise<UserConfigResult> {
	const { config, configPath } = await resolveConfig();
	const configDir = configPath ? path.dirname(configPath) : process.cwd();
	return { config, configDir };
}
