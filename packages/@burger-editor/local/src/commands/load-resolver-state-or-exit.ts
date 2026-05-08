import {
	PathConflictError,
	loadResolverState,
	type ResolverState,
} from '../model/virtual-path-resolver.js';

/**
 * Run {@link loadResolverState} and, on failure, print a human-readable error
 * to stderr and exit the process with status 1.
 *
 * Why a wrapper:
 * - Node's default uncaught handler prefixes errors with `Error:` and a stack
 *   trace, which buries the structured `PathConflictError.message` listing the
 *   files in conflict. Operators need to see the file names first, not the
 *   stack frames.
 * - A bare `process.exit(1)` tied to the failure makes the contract explicit
 *   so that CI / process managers (PM2, systemd) can rely on the exit code.
 *
 * Throws are not rethrown — control never returns to the caller on the error
 * path, since `process.exit` is `(code?: number) => never`.
 * @param documentRoot
 * @param pathKey
 */
export async function loadResolverStateOrExit(
	documentRoot: string,
	pathKey: string,
): Promise<ResolverState> {
	try {
		return await loadResolverState(documentRoot, pathKey);
	} catch (error) {
		if (error instanceof PathConflictError) {
			console.error('\n' + error.message);
			console.error(
				`\nFix the conflicting front matter "${pathKey}" values in the listed files and retry.`,
			);
		} else {
			const detail = error instanceof Error ? error.message : String(error);
			console.error(`\nFailed to load virtualTree resolver state:\n  ${detail}`);
		}
		process.exit(1);
	}
}
