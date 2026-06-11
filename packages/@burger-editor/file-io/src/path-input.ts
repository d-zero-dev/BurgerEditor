import type { BurgerEditorConfig } from './types.js';
import type { ResolverState } from './virtual-path-resolver.js';

import path from 'node:path';

import { toDiskPath } from './virtual-path-resolver.js';

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
	// Already absolute AND inside documentRoot — caller resolved everything for us.
	if (path.isAbsolute(input) && isInside(input, config.documentRoot)) {
		return input;
	}

	const stripped = input.replace(/^\/+/, '');

	if (resolverState && config.virtualTree.enabled) {
		const disk = toDiskPath(resolverState, stripped);
		if (disk) {
			return path.join(config.documentRoot, disk);
		}
	}

	let normalized = stripped;
	if (normalized.endsWith('/') || normalized === '') {
		normalized = path.posix.join(normalized, config.indexFileName);
	}
	return path.join(config.documentRoot, normalized);
}

/**
 *
 * @param child
 * @param parent
 */
function isInside(child: string, parent: string): boolean {
	const rel = path.relative(parent, child);
	return rel.length > 0 && !rel.startsWith('..') && !path.isAbsolute(rel);
}
