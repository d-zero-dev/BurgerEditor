// Compatibility shim. Canonical implementation lives in @burger-editor/file-io.
export type { PathConflict, ResolverEntry, ResolverState } from '@burger-editor/file-io';
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
} from '@burger-editor/file-io';
