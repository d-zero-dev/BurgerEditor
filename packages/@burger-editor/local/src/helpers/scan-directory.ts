import fs from 'node:fs/promises';
import path from 'node:path';

import { parseName } from './file-name.js';

export const EXCLUDE_FILE_NAMES = [/^\..+/, 'Thumbs.db', 'desktop.ini', '$RECYCLE.BIN'];

export type ScannedFile = {
	serverPath: string;
	fileId: string;
	name: string;
	size: string;
	ext: string;
};

/**
 * Scan directory and return filtered file list
 * @param destDir - Directory to scan
 * @param excludePaths - Additional paths to exclude (optional)
 */
export async function scanDirectory(
	destDir: string,
	excludePaths: string[] = [],
): Promise<ScannedFile[]> {
	const fileNames = await fs.readdir(destDir).catch(() => []);
	const filePaths = fileNames.map((name) => path.resolve(destDir, name));

	const excludes = EXCLUDE_FILE_NAMES.map((name) =>
		typeof name === 'string' ? path.join(destDir, name) : name,
	);

	const scannedFiles: ScannedFile[] = [];

	for (const serverPath of filePaths) {
		// Check if file should be excluded
		const shouldExclude = excludes.some((exclude) => {
			if (exclude instanceof RegExp) {
				return exclude.test(path.basename(serverPath));
			}
			return exclude === serverPath;
		});

		if (shouldExclude || excludePaths.includes(serverPath)) {
			continue;
		}

		const { fileId, name, size, ext } = parseName(serverPath);

		scannedFiles.push({
			serverPath,
			fileId: fileId ?? 'N/A',
			name,
			size,
			ext,
		});
	}

	return scannedFiles;
}
