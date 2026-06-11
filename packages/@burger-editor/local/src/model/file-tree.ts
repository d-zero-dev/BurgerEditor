// Compatibility shim. Canonical implementation lives in @burger-editor/file-io.
export type { DirInfo, FileInfo, LogicalEntry, Tree } from '@burger-editor/file-io';
export { buildFileTreeFromLogicalPaths, generateFileTree } from '@burger-editor/file-io';
