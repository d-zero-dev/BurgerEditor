import type {
	BurgerEditorConfig,
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
 *
 * @param searchFrom directory to start the cosmiconfig search from
 */
export async function loadContext(searchFrom?: string): Promise<CliContext> {
	const { config, configPath } = await resolveConfig(searchFrom);
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
