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
 * Locate and parse the user's BurgerEditor config and merge it with defaults.
 * Thin wrapper around `@burger-editor/file-io`'s resolveConfig so callers can
 * keep importing from `@burger-editor/local/get-user-config`.
 */
export async function getUserConfig(): Promise<UserConfigResult> {
	const { config, configPath } = await resolveConfig();
	const configDir = configPath ? path.dirname(configPath) : process.cwd();
	return { config, configDir };
}
