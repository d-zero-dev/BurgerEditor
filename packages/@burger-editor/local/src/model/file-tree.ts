import fs from 'node:fs/promises';
import path from 'node:path';

/** A single file entry in a navigation tree. `path` is rooted with a leading slash. */
export type FileInfo = {
	readonly name: string;
	readonly path: string;
	/**
	 * On-disk id for this entry. Set only in virtualTree mode where the disk
	 * filename differs from the logical path; absent in directory mode.
	 */
	readonly id?: string;
};

/** A directory entry containing a recursive subtree. */
export type DirInfo = {
	readonly name: string;
	readonly path: string;
	readonly files: Tree;
};

/** Ordered list of file or directory entries forming a navigation tree. */
export type Tree = readonly (FileInfo | DirInfo)[];

/**
 * Walk a directory recursively and build a navigation tree of `*.html` files.
 * Used in non-virtualTree mode to mirror the on-disk layout into the editor UI.
 * @param dirPath the directory to scan
 * @param rootPath the root used to compute each entry's `path` field; defaults to `dirPath` for top-level calls
 * @returns a tree describing the directory structure
 */
export async function generateFileTree(
	dirPath: string,
	rootPath = dirPath,
): Promise<Tree> {
	const files = await fs.readdir(dirPath, { withFileTypes: true });
	const tree: (FileInfo | DirInfo)[] = [];

	for (const file of files) {
		const filePath = path.join(dirPath, file.name);
		const relativePath =
			'/' + path.relative(rootPath, filePath).replaceAll(/^\.?\//g, '');

		if (file.isDirectory()) {
			const subTree = await generateFileTree(filePath, rootPath);
			if (subTree.length === 0) {
				continue;
			}
			tree.push({
				name: file.name,
				path: relativePath,
				files: subTree,
			});
			continue;
		}

		if (file.isFile() && file.name.endsWith('.html')) {
			tree.push({
				name: file.name,
				path: relativePath,
			});
		}
	}

	return tree;
}

type MutableDir = {
	name: string;
	path: string;
	files: (FileInfo | MutableDir)[];
};

/**
 * Recursively convert a mutable working node into the readonly `DirInfo`
 * shape exposed by this module.
 * @param dir the in-progress mutable directory built up by `buildFileTreeFromLogicalPaths`
 * @returns a frozen `DirInfo` mirroring `dir`
 */
function freezeDir(dir: MutableDir): DirInfo {
	return {
		name: dir.name,
		path: dir.path,
		files: dir.files.map((entry) => ('files' in entry ? freezeDir(entry) : entry)),
	};
}

/** Input shape for {@link buildFileTreeFromLogicalPaths}. */
export type LogicalEntry = {
	readonly logicalPath: string;
	/** Optional on-disk id, surfaced as `FileInfo.id` for the leaf entry. */
	readonly id?: string;
};

/**
 * Build a navigation tree from an unordered list of logical paths (e.g.
 * `['about.html', 'foo/bar.html']`). Used in virtualTree mode where the disk
 * is flat and the tree is reconstructed from Front Matter values.
 *
 * Accepts either bare strings or `{ logicalPath, id }` entries. When entries
 * carry an `id`, it is propagated to the resulting leaf `FileInfo.id` so the
 * client can render `name (id)` style labels.
 *
 * Leading slashes are tolerated; empty segments are skipped. Sibling order
 * follows the input order.
 * @param input logical paths or entries to assemble into a tree
 * @returns a tree mirroring the same shape as `generateFileTree` so the SSR/client view code can render it identically
 */
export function buildFileTreeFromLogicalPaths(
	input: readonly (string | LogicalEntry)[],
): Tree {
	const root: MutableDir = { name: '', path: '/', files: [] };

	for (const item of input) {
		const entry: LogicalEntry = typeof item === 'string' ? { logicalPath: item } : item;
		const segments = entry.logicalPath.split('/').filter((s) => s.length > 0);
		if (segments.length === 0) {
			continue;
		}

		let cursor = root;
		for (let i = 0; i < segments.length - 1; i++) {
			const segment = segments[i]!;
			const dirPath = '/' + segments.slice(0, i + 1).join('/');
			let next = cursor.files.find(
				(node): node is MutableDir => 'files' in node && node.name === segment,
			);
			if (!next) {
				next = { name: segment, path: dirPath, files: [] };
				cursor.files.push(next);
			}
			cursor = next;
		}

		const fileName = segments.at(-1)!;
		const leaf: FileInfo =
			entry.id === undefined
				? { name: fileName, path: '/' + segments.join('/') }
				: { name: fileName, path: '/' + segments.join('/'), id: entry.id };
		cursor.files.push(leaf);
	}

	return root.files.map((entry) => ('files' in entry ? freezeDir(entry) : entry));
}
