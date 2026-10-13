import type { BurgerEditorConfig } from './types.js';
import type { ResolverState } from './virtual-path-resolver.js';

import path from 'node:path';

import { toDiskPath } from './virtual-path-resolver.js';

/**
 * Thrown by {@link resolvePathInput} when a page path would resolve to a
 * location outside `documentRoot` (or contains a NUL byte). Every
 * page-path argument of the CLI, the MCP tools and `local`'s
 * `/api/agent/invoke` funnels through `resolvePathInput`, so this is the one
 * choke point that keeps an agent- or network-supplied `../../…` from
 * reading, creating or deleting files the project doesn't own.
 * @example
 * ```ts
 * try {
 * 	resolvePathInput('../../.env', config, null);
 * } catch (error) {
 * 	if (error instanceof PathOutsideDocumentRootError) {
 * 		// reject the request
 * 	}
 * }
 * ```
 */
export class PathOutsideDocumentRootError extends Error {
	readonly input: string;

	constructor(input: string) {
		super(
			`Path ${JSON.stringify(input)} resolves outside documentRoot. Only pages under the project's documentRoot can be addressed.`,
		);
		this.name = 'PathOutsideDocumentRootError';
		this.input = input;
	}
}

/**
 * Accept either:
 *   - a real disk path (absolute, when it points inside documentRoot — returned unchanged),
 *   - a project-relative path with or without leading slash (resolved against documentRoot),
 *   - a virtual / logical path (used when `virtualTree.enabled === true` — looked up via
 *     the resolver state, falling back to project-relative when not registered),
 * and resolve it to an absolute disk path.
 *
 * Trailing-slash inputs are treated as directory references and `indexFileName`
 * is appended. Empty input resolves to `documentRoot/indexFileName`.
 *
 * Leading `/` is treated as the project root (web-style), NOT the filesystem
 * root — agents almost always mean "the page at /foo.html in this project",
 * not "/foo.html at the OS root".
 * @param input user-supplied path
 * @param config resolved config (provides documentRoot, indexFileName, virtualTree)
 * @param resolverState resolver state for virtual mode, or null
 */
export function resolvePathInput(
	input: string,
	config: BurgerEditorConfig,
	resolverState: ResolverState | null,
): string {
	if (input.includes('\0')) {
		throw new PathOutsideDocumentRootError(input);
	}

	// Already absolute AND inside documentRoot — caller resolved everything for us.
	if (path.isAbsolute(input) && isInside(input, config.documentRoot)) {
		return input;
	}

	const stripped = input.replace(/^\/+/, '');

	if (resolverState && config.virtualTree.enabled) {
		const disk = toDiskPath(resolverState, stripped);
		if (disk) {
			return assertInside(
				path.join(config.documentRoot, disk),
				config.documentRoot,
				input,
			);
		}
	}

	let normalized = stripped;
	if (normalized.endsWith('/') || normalized === '') {
		normalized = path.posix.join(normalized, config.indexFileName);
	}
	// `path.join` collapses `..` segments, so `../../x` lands OUTSIDE
	// documentRoot — check the joined result, not the input string, so every
	// spelling (`..`, `%2e%2e`-decoded, a virtual-tree entry that was
	// registered with a traversing disk path, …) is caught by the same test.
	return assertInside(
		path.join(config.documentRoot, normalized),
		config.documentRoot,
		input,
	);
}

/**
 * @param resolved
 * @param documentRoot
 * @param input the original user-supplied string, for the error message
 */
function assertInside(resolved: string, documentRoot: string, input: string): string {
	if (!isInside(resolved, documentRoot)) {
		throw new PathOutsideDocumentRootError(input);
	}
	return resolved;
}

/**
 * `child` is strictly below `parent` — `parent` itself does not count, since a
 * page path must name a file, never the documentRoot directory.
 * @param child
 * @param parent
 */
function isInside(child: string, parent: string): boolean {
	const rel = path.relative(path.resolve(parent), path.resolve(child));
	return rel.length > 0 && !rel.startsWith('..') && !path.isAbsolute(rel);
}
