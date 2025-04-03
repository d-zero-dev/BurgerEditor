import fs from 'node:fs/promises';
import path from 'node:path';

export type FileInfo = {
	readonly name: string;
	readonly path: string;
};

export type DirInfo = {
	readonly name: string;
	readonly path: string;
	readonly files: Tree;
};

export type Tree = readonly (FileInfo | DirInfo)[];

/**
 *
 * @param dirPath
 * @param rootPath
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
