import { scanDirectory } from './scan-directory.js';

/**
 * Get the maximum file ID from files in the directory
 * @param destDir - Target directory path
 */
export async function getMaxFileId(destDir: string): Promise<number> {
	const scannedFiles = await scanDirectory(destDir);

	const ids: number[] = [];

	for (const file of scannedFiles) {
		const id = Number.parseInt(file.fileId);
		if (!Number.isNaN(id)) {
			ids.push(id);
		}
	}

	return ids.length > 0 ? Math.max(...ids) : 0;
}
