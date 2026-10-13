import type {
	BurgerEditorConfig,
	ResolveConfigOptions,
	ResolverInvalidEntry,
	ResolverState,
} from '@burger-editor/file-io';

import { resolveConfig, loadResolverState } from '@burger-editor/file-io';

export interface CliContext {
	readonly config: BurgerEditorConfig;
	readonly configPath: string | null;
	readonly resolverState: ResolverState | null;
	/**
	 * Files under documentRoot that could not be registered into the virtual
	 * resolver state (missing or malformed `pathKey` Front Matter, unreadable
	 * file, …). Empty when `virtualTree.enabled === false`.
	 *
	 * The CLI surfaces this via `page-list` so a typoed / legacy file doesn't
	 * silently disappear from the agent's view of the project.
	 */
	readonly invalidPages: readonly ResolverInvalidEntry[];
}

/**
 * Resolve the project config (see `resolveConfig` in `@burger-editor/file-io`
 * for how the file is located, including `BGE_CONFIG`) and, when virtualTree
 * is enabled, scan documentRoot into a resolver state.
 * @param searchFrom directory to start the cosmiconfig search from
 * @param options forwarded to `resolveConfig` — `configPath` names the config file directly
 * @example
 * ```ts
 * const ctx = await loadContext(undefined, { configPath: './burgereditor.child.config.js' });
 * console.log(ctx.configPath, ctx.config.documentRoot);
 * ```
 */
export async function loadContext(
	searchFrom?: string,
	options?: ResolveConfigOptions,
): Promise<CliContext> {
	const { config, configPath } = await resolveConfig(searchFrom, options);
	if (!config.virtualTree.enabled) {
		return { config, configPath, resolverState: null, invalidPages: [] };
	}
	// Lenient by default — a single legacy file with missing Front Matter
	// must not lock the whole CLI out of the project. The invalid list is
	// preserved on the context so commands can surface it on demand.
	const { state, invalid } = await loadResolverState(
		config.documentRoot,
		config.virtualTree.pathKey,
	);
	return { config, configPath, resolverState: state, invalidPages: invalid };
}
