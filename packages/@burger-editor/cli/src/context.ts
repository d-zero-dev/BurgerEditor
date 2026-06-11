import type { BurgerEditorConfig, ResolverState } from '@burger-editor/file-io';

import { resolveConfig, loadResolverState } from '@burger-editor/file-io';

export interface CliContext {
	readonly config: BurgerEditorConfig;
	readonly configPath: string | null;
	readonly resolverState: ResolverState | null;
}

/**
 *
 * @param searchFrom directory to start the cosmiconfig search from
 */
export async function loadContext(searchFrom?: string): Promise<CliContext> {
	const { config, configPath } = await resolveConfig(searchFrom);
	const resolverState = config.virtualTree.enabled
		? await loadResolverState(config.documentRoot, config.virtualTree.pathKey)
		: null;
	return { config, configPath, resolverState };
}
