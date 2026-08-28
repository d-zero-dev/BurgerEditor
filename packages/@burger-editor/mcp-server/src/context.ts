import type { CliContext } from '@burger-editor/cli';

import { loadContext } from '@burger-editor/cli';

/**
 * Cache the `CliContext` for the lifetime of this MCP server process.
 * `loadContext()` runs cosmiconfig + (when virtualTree is enabled) a full
 * documentRoot scan — expensive enough that paying it on every tool call
 * would add O(files × calls) work to an agent session. Invalidated by
 * `__resetV4ContextCache()` so tests can swap fixtures between cases.
 */
let cachedContextPromise: Promise<CliContext> | null = null;

/**
 *
 */
export function getContext(): Promise<CliContext> {
	if (!cachedContextPromise) {
		cachedContextPromise = loadContext();
	}
	return cachedContextPromise;
}

/** Test-only: clear the per-process context cache. */
export function __resetV4ContextCache(): void {
	cachedContextPromise = null;
}
