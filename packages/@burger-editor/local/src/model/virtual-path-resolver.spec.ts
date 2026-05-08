import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
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
	type ResolverState,
} from './virtual-path-resolver.js';

/**
 * Build a state by replaying registerEntry, so tests exercise the public API
 * rather than depending on the internal Map shape.
 * @param entries
 */
function makeState(
	entries: readonly { id: string; logicalPath: string }[],
): ResolverState {
	let state = createEmptyState();
	for (const { id, logicalPath } of entries) {
		state = registerEntry(state, id, logicalPath);
	}
	return state;
}

describe('toDiskPath / toLogicalPath', () => {
	const state = makeState([
		{ id: '1.html', logicalPath: 'about.html' },
		{ id: '2.html', logicalPath: 'foo/bar.html' },
	]);

	test('toDiskPath maps logical to disk', () => {
		expect(toDiskPath(state, 'about.html')).toBe('1.html');
		expect(toDiskPath(state, 'foo/bar.html')).toBe('2.html');
	});

	test('toDiskPath returns null for unknown logical path', () => {
		expect(toDiskPath(state, 'missing.html')).toBeNull();
	});

	test('toLogicalPath maps disk to logical', () => {
		expect(toLogicalPath(state, '1.html')).toBe('about.html');
		expect(toLogicalPath(state, '2.html')).toBe('foo/bar.html');
	});

	test('toLogicalPath returns null for unknown disk file', () => {
		expect(toLogicalPath(state, '99.html')).toBeNull();
	});
});

describe('listLogicalPaths', () => {
	test('returns all logical paths', () => {
		const state = makeState([
			{ id: '1.html', logicalPath: 'about.html' },
			{ id: '2.html', logicalPath: 'foo/bar.html' },
		]);
		expect(listLogicalPaths(state).toSorted()).toEqual(['about.html', 'foo/bar.html']);
	});

	test('returns empty for empty state', () => {
		expect(listLogicalPaths(makeState([]))).toEqual([]);
	});
});

describe('listEntries', () => {
	test('returns id+logicalPath pairs for every registered file', () => {
		const state = makeState([
			{ id: '1.html', logicalPath: 'about.html' },
			{ id: '2.html', logicalPath: 'foo/bar.html' },
		]);
		const entries = [...listEntries(state)].toSorted((a, b) => a.id.localeCompare(b.id));
		expect(entries).toEqual([
			{ id: '1.html', logicalPath: 'about.html' },
			{ id: '2.html', logicalPath: 'foo/bar.html' },
		]);
	});

	test('returns empty for empty state', () => {
		expect(listEntries(makeState([]))).toEqual([]);
	});
});

describe('registerEntry', () => {
	test('adds a new entry and returns new state', () => {
		const state = makeState([{ id: '1.html', logicalPath: 'about.html' }]);
		const next = registerEntry(state, '2.html', 'foo/bar.html');
		expect(toDiskPath(next, 'foo/bar.html')).toBe('2.html');
		expect(toDiskPath(next, 'about.html')).toBe('1.html');
		// original state must not be mutated
		expect(toDiskPath(state, 'foo/bar.html')).toBeNull();
	});

	test('throws PathConflictError when logical path already taken, naming both ids', () => {
		const state = makeState([{ id: '1.html', logicalPath: 'about.html' }]);
		try {
			registerEntry(state, '2.html', 'about.html');
			throw new Error('expected throw');
		} catch (error) {
			expect(error).toBeInstanceOf(PathConflictError);
			const conflicts = (error as PathConflictError).conflicts;
			expect(conflicts).toEqual([
				{ logicalPath: 'about.html', diskFiles: ['1.html', '2.html'] },
			]);
		}
	});

	test('throws IdAlreadyExistsError naming the requested id and its current logical path', () => {
		const state = makeState([{ id: '1.html', logicalPath: 'about.html' }]);
		try {
			registerEntry(state, '1.html', 'other.html');
			throw new Error('expected throw');
		} catch (error) {
			expect(error).toBeInstanceOf(IdAlreadyExistsError);
			expect(error).not.toBeInstanceOf(PathConflictError);
			const e = error as IdAlreadyExistsError;
			expect(e.id).toBe('1.html');
			expect(e.existingLogicalPath).toBe('about.html');
			expect(e.message).toContain('1.html');
			expect(e.message).toContain('about.html');
		}
	});
});

describe('setLogicalPath', () => {
	test('updates logical path for existing id', () => {
		const state = makeState([
			{ id: '1.html', logicalPath: 'about.html' },
			{ id: '2.html', logicalPath: 'foo/bar.html' },
		]);
		const next = setLogicalPath(state, '1.html', 'company/about.html');
		expect(toDiskPath(next, 'company/about.html')).toBe('1.html');
		expect(toDiskPath(next, 'about.html')).toBeNull();
		expect(toLogicalPath(next, '1.html')).toBe('company/about.html');
		// other entry unchanged
		expect(toDiskPath(next, 'foo/bar.html')).toBe('2.html');
	});

	test('returns the same state reference when the path is unchanged (no-op fast path)', () => {
		const state = makeState([{ id: '1.html', logicalPath: 'about.html' }]);
		const next = setLogicalPath(state, '1.html', 'about.html');
		expect(next).toBe(state);
	});

	test('throws Error (not PathConflictError) when id is unknown, with id in message', () => {
		const state = makeState([{ id: '1.html', logicalPath: 'about.html' }]);
		try {
			setLogicalPath(state, '99.html', 'foo.html');
			throw new Error('expected throw');
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(PathConflictError);
			expect((error as Error).message).toContain('99.html');
		}
	});

	test('throws PathConflictError when new logical path is taken by another id', () => {
		const state = makeState([
			{ id: '1.html', logicalPath: 'about.html' },
			{ id: '2.html', logicalPath: 'foo/bar.html' },
		]);
		expect(() => setLogicalPath(state, '1.html', 'foo/bar.html')).toThrow(
			PathConflictError,
		);
	});
});

describe('deleteEntry', () => {
	test('removes the entry', () => {
		const state = makeState([
			{ id: '1.html', logicalPath: 'about.html' },
			{ id: '2.html', logicalPath: 'foo/bar.html' },
		]);
		const next = deleteEntry(state, '1.html');
		expect(toDiskPath(next, 'about.html')).toBeNull();
		expect(toLogicalPath(next, '1.html')).toBeNull();
		// remaining entry intact
		expect(toDiskPath(next, 'foo/bar.html')).toBe('2.html');
	});

	test('returns the same state reference when the id is unknown (no-op fast path)', () => {
		const state = makeState([{ id: '1.html', logicalPath: 'about.html' }]);
		const next = deleteEntry(state, '99.html');
		expect(next).toBe(state);
	});
});

describe('loadResolverState', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bge-resolver-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	/**
	 *
	 * @param name
	 * @param body
	 */
	async function writeFile(name: string, body: string) {
		await fs.writeFile(path.join(tmpDir, name), body, 'utf8');
	}

	test('builds state from flat <id>.html files with frontmatter path', async () => {
		await writeFile('1.html', '---\npath: about.html\n---\n<h1>About</h1>\n');
		await writeFile('2.html', '---\npath: foo/bar.html\n---\n<h1>Bar</h1>\n');

		const state = await loadResolverState(tmpDir, 'path');

		expect(toDiskPath(state, 'about.html')).toBe('1.html');
		expect(toDiskPath(state, 'foo/bar.html')).toBe('2.html');
		expect(listLogicalPaths(state).toSorted()).toEqual(['about.html', 'foo/bar.html']);
	});

	test('honors a custom pathKey', async () => {
		await writeFile('1.html', '---\nslug: about.html\n---\n<h1>About</h1>\n');
		const state = await loadResolverState(tmpDir, 'slug');
		expect(toDiskPath(state, 'about.html')).toBe('1.html');
	});

	test('throws PathConflictError listing both files that share a logical path', async () => {
		await writeFile('1.html', '---\npath: about.html\n---\n<h1>One</h1>\n');
		await writeFile('2.html', '---\npath: about.html\n---\n<h1>Two</h1>\n');

		const error = await loadResolverState(tmpDir, 'path').then(
			() => null,
			(error_: unknown) => error_,
		);
		expect(error).toBeInstanceOf(PathConflictError);
		const conflicts = (error as PathConflictError).conflicts;
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]?.logicalPath).toBe('about.html');
		expect([...(conflicts[0]?.diskFiles ?? [])].toSorted()).toEqual(['1.html', '2.html']);
	});

	test('throws with a message naming the file when frontmatter pathKey is missing', async () => {
		await writeFile('1.html', '<h1>No frontmatter</h1>\n');

		await expect(loadResolverState(tmpDir, 'path')).rejects.toThrow(/1\.html/);
	});

	test('throws when frontmatter has the key but it is not a string (number)', async () => {
		await writeFile('1.html', '---\npath: 42\n---\n<h1>Bad</h1>\n');

		await expect(loadResolverState(tmpDir, 'path')).rejects.toThrow(/1\.html/);
	});

	test('ignores non-html files', async () => {
		await writeFile('1.html', '---\npath: about.html\n---\n<h1>About</h1>\n');
		await writeFile('readme.md', '# readme');
		await writeFile('.DS_Store', '');

		const state = await loadResolverState(tmpDir, 'path');
		expect([...listLogicalPaths(state)]).toEqual(['about.html']);
	});

	test('does not recurse into subdirectories', async () => {
		await fs.mkdir(path.join(tmpDir, 'sub'));
		await fs.writeFile(
			path.join(tmpDir, 'sub', '99.html'),
			'---\npath: should/be-ignored.html\n---\n',
			'utf8',
		);
		await writeFile('1.html', '---\npath: about.html\n---\n<h1>About</h1>\n');

		const state = await loadResolverState(tmpDir, 'path');
		expect([...listLogicalPaths(state)]).toEqual(['about.html']);
	});

	test('returns an empty state when the directory has no html files', async () => {
		const state = await loadResolverState(tmpDir, 'path');
		expect(listLogicalPaths(state)).toEqual([]);
	});

	test('rejects with ENOENT-style error when documentRoot does not exist', async () => {
		const missing = path.join(tmpDir, 'missing-dir');
		await expect(loadResolverState(missing, 'path')).rejects.toThrow();
	});

	test('normalizes leading slashes in frontmatter path so /foo.html and foo.html resolve to the same entry', async () => {
		// Regression: production data sets often write `path: /foo.html` while
		// Hono's `c.req.param('page')` strips the leading slash. Without
		// normalization, every link click on the editor 404'd.
		await writeFile('1.html', '---\npath: /maintenance.html\n---\n<h1>m</h1>\n');

		const state = await loadResolverState(tmpDir, 'path');

		expect(toDiskPath(state, '/maintenance.html')).toBe('1.html');
		expect(toDiskPath(state, 'maintenance.html')).toBe('1.html');
		expect(listLogicalPaths(state)).toEqual(['maintenance.html']);
	});

	test('rejects when frontmatter path is just a slash (normalizes to empty string)', async () => {
		await writeFile('1.html', '---\npath: /\n---\n<h1>x</h1>\n');
		await expect(loadResolverState(tmpDir, 'path')).rejects.toThrow(/1\.html/);
	});

	test('detects conflicts after normalization (/foo.html vs foo.html on different ids)', async () => {
		await writeFile('1.html', '---\npath: /shared.html\n---\n<h1>a</h1>\n');
		await writeFile('2.html', '---\npath: shared.html\n---\n<h1>b</h1>\n');
		await expect(loadResolverState(tmpDir, 'path')).rejects.toBeInstanceOf(
			PathConflictError,
		);
	});
});
