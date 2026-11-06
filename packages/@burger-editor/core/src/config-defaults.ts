import type { Config } from './types.js';

/**
 * Fill the required keys of a `Config` that `config` omits (or sets to
 * `undefined`) with empty values (`[]`, `''`, `null`); the keys it has,
 * including optional ones such as `mediaQueries`, are kept as they are.
 *
 * Writers that build HTML without an editor engine (`render()`, the agent tools
 * that write to disk) hold only part of the project config. They fill it here,
 * so every such writer gets the same values for the same config.
 * @param config - The keys the caller has
 * @returns A complete `Config`
 * @example
 * ```ts
 * const config = withConfigDefaults({ mediaQueries: ['(max-width: 599px)'] });
 * // config.classList is [], config.googleMapsApiKey is null
 * ```
 */
export function withConfigDefaults(config: Partial<Config> = {}): Config {
	return {
		...config,
		classList: config.classList ?? [],
		googleMapsApiKey: config.googleMapsApiKey ?? null,
		sampleImagePath: config.sampleImagePath ?? '',
		sampleFilePath: config.sampleFilePath ?? '',
		stylesheets: config.stylesheets ?? [],
	};
}
