/**
 * Virtual path resolver — bidirectional mapping between disk filenames
 * (`<id>.html`) and logical paths (`foo/bar/about.html`) for the virtualTree
 * feature of `@burger-editor/local`.
 *
 * ## Error vocabulary
 *
 * - {@link IdAlreadyExistsError} — `id` is already mapped to a logical path.
 *   Thrown by {@link registerEntry} only.
 * - {@link PathConflictError} — a logical path is claimed by more than one id.
 *   Thrown by {@link loadResolverState}, {@link registerEntry}, and
 *   {@link setLogicalPath}.
 * - Plain `Error` — `id` is unknown. Thrown by {@link setLogicalPath} when the
 *   caller passes an id that is not currently registered. This is reserved for
 *   programming errors; route handlers should never see it because they
 *   resolve the id from `toDiskPath` first.
 *
 * ## Constraints on `pathKey` values (= logical paths)
 *
 * 1. Must be a non-empty string. {@link loadResolverState} throws on missing /
 *    non-string values.
 * 2. Must be unique across the resolver state.
 * 3. Path-traversal sequences (`..`) are NOT rejected here. Logical paths are
 *    used purely as map keys and tree-building data; they never reach `fs`.
 *    See `route.tsx` for the disk-path defense in depth.
 *
 * ## State immutability
 *
 * All update functions return a new {@link ResolverState} value. The route
 * layer holds a single mutable reference (`let resolverState = ...`) and
 * advances it only after the corresponding `saveContent` succeeds (2-phase
 * commit). Callers that need a true no-op fast path can rely on reference
 * equality: {@link setLogicalPath} and {@link deleteEntry} return the same
 * instance when the requested change is a no-op.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { parseFrontMatter } from '@burger-editor/core';

/**
 * Bidirectional map between disk filenames and logical paths.
 *
 * The two maps are kept in sync; treat the value as immutable and do not
 * construct it directly outside this module — go through {@link createEmptyState}
 * + {@link registerEntry} instead.
 */
export type ResolverState = {
	readonly diskToLogical: ReadonlyMap<string, string>;
	readonly logicalToDisk: ReadonlyMap<string, string>;
};

/**
 * Construct an empty resolver state. Use as the seed when building state
 * incrementally (e.g. tests or migration scripts).
 */
export function createEmptyState(): ResolverState {
	return {
		diskToLogical: new Map(),
		logicalToDisk: new Map(),
	};
}

/**
 * Canonical form for logical paths used as map keys. Strips any leading
 * slashes so that `'foo.html'` and `'/foo.html'` resolve to the same entry.
 *
 * Front Matter conventions vary (some pipelines store `path: foo.html`,
 * others `path: /foo.html`); the resolver normalizes both into the
 * slash-less form internally and `buildFileTreeFromLogicalPaths` re-attaches
 * the leading slash when rendering each `href` value.
 * @param logicalPath the raw path string (typically from Front Matter or a
 *                    request param)
 * @returns the canonical, slash-less form
 */
function normalizeLogicalPath(logicalPath: string): string {
	return logicalPath.replace(/^\/+/, '');
}

export type PathConflict = {
	readonly logicalPath: string;
	readonly diskFiles: readonly string[];
};

export class PathConflictError extends Error {
	readonly conflicts: readonly PathConflict[];

	constructor(conflicts: readonly PathConflict[]) {
		const summary = conflicts
			.map(
				({ logicalPath, diskFiles }) =>
					`  - "${logicalPath}" claimed by: ${diskFiles.join(', ')}`,
			)
			.join('\n');
		super(`Conflicting logical paths in virtual tree:\n${summary}`);
		this.name = 'PathConflictError';
		this.conflicts = conflicts;
	}
}

export class IdAlreadyExistsError extends Error {
	readonly existingLogicalPath: string;
	readonly id: string;

	constructor(id: string, existingLogicalPath: string) {
		super(
			`File ID "${id}" is already in use (currently mapped to "${existingLogicalPath}").`,
		);
		this.name = 'IdAlreadyExistsError';
		this.id = id;
		this.existingLogicalPath = existingLogicalPath;
	}
}

/**
 * Thrown when a logical path canonicalizes to an empty string (e.g. inputs
 * like `'/'`, `'//'` after stripping leading slashes). Reserved as a 4xx
 * trigger at route boundaries.
 */
export class EmptyLogicalPathError extends Error {
	readonly input: string;

	constructor(input: string) {
		super(`Logical path normalizes to empty string: ${JSON.stringify(input)}`);
		this.name = 'EmptyLogicalPathError';
		this.input = input;
	}
}

/**
 * Resolve the disk filename (`<id>.html`) for a given logical path.
 * @param state
 * @param logicalPath logical path from the virtual tree (e.g. `foo/bar/about.html`)
 * @returns the disk filename, or `null` if the logical path is not registered
 */
export function toDiskPath(state: ResolverState, logicalPath: string): string | null {
	return state.logicalToDisk.get(normalizeLogicalPath(logicalPath)) ?? null;
}

/**
 * Resolve the logical path that the given disk filename was registered under.
 * @param state
 * @param diskFileName a basename like `<id>.html`
 * @returns the logical path, or `null` if no such id is registered
 */
export function toLogicalPath(state: ResolverState, diskFileName: string): string | null {
	return state.diskToLogical.get(diskFileName) ?? null;
}

/**
 * Snapshot of all logical paths currently registered. Order is the iteration
 * order of the underlying Map (≈ insertion order); callers that rely on
 * deterministic order should sort.
 * @param state
 */
export function listLogicalPaths(state: ResolverState): readonly string[] {
	return [...state.logicalToDisk.keys()];
}

/** A registered (id ↔ logical path) pair, surfaced for tree builders. */
export type ResolverEntry = {
	readonly id: string;
	readonly logicalPath: string;
};

/**
 * Snapshot of all entries with both halves of the mapping. Used by the tree
 * builder so that the rendered nav can label each leaf with its disk id.
 * @param state
 */
export function listEntries(state: ResolverState): readonly ResolverEntry[] {
	return [...state.diskToLogical.entries()].map(([id, logicalPath]) => ({
		id,
		logicalPath,
	}));
}

/**
 * Register a new (id → logical path) pair and return the next state.
 * @param state
 * @param id disk filename, must be unused in `state`
 * @param logicalPath must be unused in `state`
 * @returns a new state with the entry added; the original `state` is not mutated
 * @throws {EmptyLogicalPathError} if `logicalPath` normalizes to an empty string (e.g. `'/'`)
 * @throws {IdAlreadyExistsError} if `id` is already registered (reports its current logical path)
 * @throws {PathConflictError} if `logicalPath` is already taken by another id
 */
export function registerEntry(
	state: ResolverState,
	id: string,
	logicalPath: string,
): ResolverState {
	const canonical = normalizeLogicalPath(logicalPath);
	if (canonical.length === 0) {
		// "/" / "//" / etc. canonicalize to empty and would corrupt the state map
		// with an empty key. Reject at every entry point, mirroring loadResolverState.
		throw new EmptyLogicalPathError(logicalPath);
	}
	const existingLogical = state.diskToLogical.get(id);
	if (existingLogical !== undefined) {
		throw new IdAlreadyExistsError(id, existingLogical);
	}
	if (state.logicalToDisk.has(canonical)) {
		throw new PathConflictError([
			{
				logicalPath: canonical,
				diskFiles: [state.logicalToDisk.get(canonical)!, id],
			},
		]);
	}
	const diskToLogical = new Map(state.diskToLogical);
	const logicalToDisk = new Map(state.logicalToDisk);
	diskToLogical.set(id, canonical);
	logicalToDisk.set(canonical, id);
	return { diskToLogical, logicalToDisk };
}

/**
 * Change the logical path that `id` is mapped to. Use this when the user
 * edits the Front Matter `pathKey` value of an existing file.
 *
 * As an optimization, if `newLogicalPath` equals the current logical path of
 * `id`, the original `state` reference is returned unchanged so callers can
 * detect "no work to do" via reference equality (`next === state`).
 * @param state
 * @param id disk filename; must already be registered in `state`
 * @param newLogicalPath the new logical path; must not be taken by another id
 * @returns a new state with the entry remapped, or the original `state` if no-op
 * @throws {Error} if `id` is not registered (programming error — callers should resolve via `toDiskPath` first)
 * @throws {EmptyLogicalPathError} if `newLogicalPath` normalizes to an empty string (e.g. `'/'`)
 * @throws {PathConflictError} if `newLogicalPath` is already taken by another id
 */
export function setLogicalPath(
	state: ResolverState,
	id: string,
	newLogicalPath: string,
): ResolverState {
	const canonical = normalizeLogicalPath(newLogicalPath);
	if (canonical.length === 0) {
		throw new EmptyLogicalPathError(newLogicalPath);
	}
	const current = state.diskToLogical.get(id);
	if (current === undefined) {
		throw new Error(`Unknown disk id: ${id}`);
	}
	if (current === canonical) {
		// Same path → identity return so callers can detect a no-op via reference equality.
		return state;
	}
	// Past this point `current !== canonical` and the maps are bidirectionally
	// consistent, so any occupant of `canonical` is by definition another id.
	const occupant = state.logicalToDisk.get(canonical);
	if (occupant !== undefined) {
		throw new PathConflictError([{ logicalPath: canonical, diskFiles: [occupant, id] }]);
	}
	const diskToLogical = new Map(state.diskToLogical);
	const logicalToDisk = new Map(state.logicalToDisk);
	logicalToDisk.delete(current);
	diskToLogical.set(id, canonical);
	logicalToDisk.set(canonical, id);
	return { diskToLogical, logicalToDisk };
}

/**
 * Remove the entry for `id`. Returns the original `state` reference if `id`
 * was not registered (no-op fast path), so callers can detect "nothing to do"
 * via `next === state`.
 * @param state
 * @param id disk filename
 * @returns a new state without the entry, or the original `state` if no-op
 */
export function deleteEntry(state: ResolverState, id: string): ResolverState {
	const current = state.diskToLogical.get(id);
	if (current === undefined) {
		return state;
	}
	const diskToLogical = new Map(state.diskToLogical);
	const logicalToDisk = new Map(state.logicalToDisk);
	diskToLogical.delete(id);
	logicalToDisk.delete(current);
	return { diskToLogical, logicalToDisk };
}

/**
 * Scan `documentRoot` (non-recursively) for `*.html` files, parse each Front
 * Matter, and build the bidirectional mapping. Used at server start when
 * `virtualTree.enabled` is true.
 * @param documentRoot directory containing the flat `<id>.html` files
 * @param pathKey Front Matter key to read as the logical path (e.g. `'path'`, `'slug'`)
 * @returns a fully populated `ResolverState`
 * @throws {PathConflictError} if any logical path is claimed by more than one file (all conflicts are reported in a single error)
 * @throws {Error} if a file is missing the `pathKey` or its value is not a non-empty string (the message names the offending file)
 * @throws {Error} if `documentRoot` does not exist (propagates `fs.readdir` ENOENT)
 */
export async function loadResolverState(
	documentRoot: string,
	pathKey: string,
): Promise<ResolverState> {
	const entries = await fs.readdir(documentRoot, { withFileTypes: true });

	const claims = new Map<string, string[]>();
	const diskToLogical = new Map<string, string>();

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.html')) {
			continue;
		}
		const filePath = path.join(documentRoot, entry.name);
		const fileContent = await fs.readFile(filePath, 'utf8');
		const parsed = parseFrontMatter(fileContent);

		const raw = parsed.data[pathKey];
		if (typeof raw !== 'string' || raw.length === 0) {
			throw new Error(
				`Front matter "${pathKey}" missing or not a string in ${entry.name}`,
			);
		}

		const logicalPath = normalizeLogicalPath(raw);
		if (logicalPath.length === 0) {
			throw new Error(
				`Front matter "${pathKey}" normalizes to empty string in ${entry.name}`,
			);
		}
		diskToLogical.set(entry.name, logicalPath);
		const list = claims.get(logicalPath) ?? [];
		list.push(entry.name);
		claims.set(logicalPath, list);
	}

	const conflicts: PathConflict[] = [];
	for (const [logicalPath, diskFiles] of claims) {
		if (diskFiles.length > 1) {
			conflicts.push({ logicalPath, diskFiles });
		}
	}
	if (conflicts.length > 0) {
		throw new PathConflictError(conflicts);
	}

	const logicalToDisk = new Map<string, string>();
	for (const [diskFile, logicalPath] of diskToLogical) {
		logicalToDisk.set(logicalPath, diskFile);
	}

	return { diskToLogical, logicalToDisk };
}
