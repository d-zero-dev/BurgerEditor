// Install jsdom-backed DOMParser before importing anything from @burger-editor/core
// that relies on it. Side-effect import — must come first.
import './dom-shim.js';

export type * from './types.js';

export type { ResolvedConfig } from './config/resolve.js';
export { resolveConfig } from './config/resolve.js';

export { loadContent, saveContent, FileNotFoundError } from './document/edit-content.js';

export type { DirInfo, FileInfo, LogicalEntry, Tree } from './file-tree.js';
export { buildFileTreeFromLogicalPaths, generateFileTree } from './file-tree.js';

export type {
	PathConflict,
	ResolverEntry,
	ResolverState,
} from './virtual-path-resolver.js';
export {
	EmptyLogicalPathError,
	IdAlreadyExistsError,
	PathConflictError,
	createEmptyState,
	deleteEntry,
	listEntries,
	listLogicalPaths,
	loadResolverState,
	registerEntry,
	setLogicalPath,
	toDiskPath,
	toLogicalPath,
} from './virtual-path-resolver.js';

export { resolvePathInput } from './path-input.js';
