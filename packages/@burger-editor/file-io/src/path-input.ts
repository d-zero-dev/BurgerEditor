import type { BurgerEditorConfig } from './types.js';
import type { ResolverState } from './virtual-path-resolver.js';

import path from 'node:path';

import { toDiskPath } from './virtual-path-resolver.js';

/**
 * Accept either a real disk path (absolute, or relative to documentRoot) or a
 * virtual / logical path (used when `virtualTree.enabled === true`) and
 * resolve it to an absolute disk path.
 *
 * Trailing-slash inputs are treated as directory references and `indexFileName`
 * is appended. `.html` is appended for slashed-but-extension-less inputs only
 * when it is unambiguous to do so; otherwise the caller will surface an ENOENT
 * downstream which is a clearer error than a silent rewrite.
 * @param input user-supplied path
 * @param config resolved config (provides documentRoot, indexFileName, virtualTree)
 * @param resolverState resolver state for virtual mode, or null
 */
export function resolvePathInput(
	input: string,
	config: BurgerEditorConfig,
	resolverState: ResolverState | null,
): string {
	if (path.isAbsolute(input)) {
		return input;
	}

	if (resolverState && config.virtualTree.enabled) {
		const stripped = input.replace(/^\/+/, '');
		const disk = toDiskPath(resolverState, stripped);
		if (disk) {
			return path.join(config.documentRoot, disk);
		}
	}

	let normalized = input.startsWith('/') ? input.slice(1) : input;
	if (normalized.endsWith('/') || normalized === '') {
		normalized = path.posix.join(normalized, config.indexFileName);
	}
	return path.join(config.documentRoot, normalized);
}
