import type { LocalServerConfig } from '../types.js';
import type { ResolveConfigOptions } from '@burger-editor/file-io';

import path from 'node:path';

import { resolveConfig } from '@burger-editor/file-io';

import { assertConnectableHost } from '../helpers/host.js';

export interface UserConfigResult {
	readonly config: LocalServerConfig;
	/**
	 * Directory the config file was found in, or `process.cwd()` when no
	 * config file exists — where `agent/auth.ts` stores the per-launch agent
	 * token (`<configDir>/.burgereditor/agent-token`).
	 */
	readonly configDir: string;
	/** Absolute path of the loaded config file, or `null` when none was found and defaults apply. */
	readonly configPath: string | null;
}

/**
 * Locate and parse the user's BurgerEditor config, merge it with defaults,
 * and report where it was found. Thin wrapper around
 * `@burger-editor/file-io`'s `resolveConfig`; returns `{ config, configDir,
 * configPath }` rather than the bare config because the Agent Hub needs the
 * config's directory as a stable place to persist its per-launch token — and
 * a caller that only wants the config picks `config` out of it in one step.
 * @throws {import('../helpers/host.js').WildcardHostError} when `host` is `0.0.0.0` / `::` — see `helpers/host.ts` for why
 * @param options forwarded to `resolveConfig` — `configPath` names the config file directly (otherwise `BGE_CONFIG`, then a search from `process.cwd()`)
 * @example
 * ```ts
 * import { getUserConfig } from '@burger-editor/local/get-user-config';
 *
 * const { config, configDir } = await getUserConfig();
 * console.log(config.host, config.port); // 'localhost' 5255
 * console.log(configDir); // directory containing burgereditor.config.js
 *
 * const child = await getUserConfig({ configPath: './burgereditor.child.config.js' });
 * console.log(child.configPath); // absolute path of burgereditor.child.config.js
 * ```
 */
export async function getUserConfig(
	options?: ResolveConfigOptions,
): Promise<UserConfigResult> {
	const { config, configPath } = await resolveConfig(undefined, options);
	assertConnectableHost(config.host);
	const configDir = configPath ? path.dirname(configPath) : process.cwd();
	return { config, configDir, configPath };
}
