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
 * Resolve (and memoize) the `CliContext` for this process. Only a
 * successful load stays cached: a rejected load clears the slot before the
 * rejection reaches the caller. The MCP process is long-lived — with a
 * poisoned cache, one mistyped `burgereditor.config.*` would keep failing
 * every disk-side tool call (including `auto` mode's disk fallback) until
 * the agent host restarts the server, even after the user fixed the file.
 * Re-running cosmiconfig on the next call after a failure is cheap compared
 * to that, and the success path still pays the load exactly once.
 */
export function getContext(): Promise<CliContext> {
	if (!cachedContextPromise) {
		const loading = loadContext();
		cachedContextPromise = loading;
		loading.catch(() => {
			// Only drop the cache if it still holds THIS attempt — a reset
			// and a fresh load may already have replaced it.
			if (cachedContextPromise === loading) {
				cachedContextPromise = null;
			}
		});
	}
	return cachedContextPromise;
}

/** Test-only: clear the per-process context cache. */
export function __resetV4ContextCache(): void {
	cachedContextPromise = null;
}
