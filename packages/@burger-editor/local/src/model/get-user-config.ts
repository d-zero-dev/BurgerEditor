import type { LocalServerConfig } from '../types.js';

import { resolveConfig } from '@burger-editor/file-io';

/**
 * Locate and parse the user's BurgerEditor config and merge it with defaults.
 * Thin wrapper around `@burger-editor/file-io`'s resolveConfig so callers can
 * keep importing from `@burger-editor/local/get-user-config`.
 */
export async function getUserConfig(): Promise<LocalServerConfig> {
	const { config } = await resolveConfig();
	return config;
}
