import {
	PathConflictError,
	loadResolverState,
	type ResolverState,
} from '../model/virtual-path-resolver.js';

/**
 * Run {@link loadResolverState} (in strict mode) and, on failure, print a
 * human-readable error to stderr and exit the process with status 1.
 *
 * **Strict mode is intentional here**: the local server's boot is the right
 * time to refuse a documentRoot with malformed Front Matter — an operator
 * starting `bge dev` against a project with broken pages should see the
 * problem immediately, not have the UI silently omit those pages from the
 * tree. The lenient default in `loadResolverState` is for CLI / MCP agent
 * sessions where typoed legacy files must not lock the whole tool out.
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
		const { state } = await loadResolverState(documentRoot, pathKey, {
			strict: true,
		});
		return state;
	} catch (error) {
		if (error instanceof PathConflictError) {
			console.error('\n' + error.message);
			console.error(
				`\nFix the conflicting front matter "${pathKey}" values in the listed files and retry.`,
			);
		} else if (error instanceof Error) {
			console.error(`\nFailed to load virtualTree resolver state:\n  ${error.message}`);
		} else {
			// loadResolverState only throws Error subclasses; re-raise non-Error
			// values so a future regression is surfaced instead of swallowed.
			throw error;
		}
		process.exit(1);
	}
}
