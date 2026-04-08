import fs from 'node:fs/promises';
import path from 'node:path';

import { parseName } from './file-name.js';
import { type EncodedFileName } from './get-candidate-name.js';

export type UploadResult = {
	filePath: string;
	fileName: string;
	fileId: number;
	name: string;
	size: number;
	timestamp: number;
};

/**
 * Upload a file to the destination directory
 * @param fileName - File name to save (e.g., "12345__encoded.jpg" from getCandidateName)
 * @param destDir - Destination directory path
 * @param file - File object or ArrayBuffer
 * @returns Upload result with file metadata
 */
export async function upload(
	fileName: EncodedFileName,
	destDir: string,
	file: File | ArrayBuffer,
): Promise<UploadResult> {
	const filePath = path.join(destDir, fileName);

	// Get file buffer
	const buffer = file instanceof File ? await file.arrayBuffer() : file;

	// Ensure directory exists
	await fs.mkdir(path.dirname(filePath), { recursive: true });

	// Write file
	await fs.writeFile(filePath, Buffer.from(buffer));

	// Get file stats
	const stats = await fs.stat(filePath);

	// Parse file name to get metadata
	const { fileId, name: decodedName } = parseName(filePath);
	const id = Number.parseInt(fileId ?? '0');

	return {
		filePath,
		fileName,
		fileId: id,
		name: decodedName,
		size: stats.size,
		timestamp: stats.mtime.valueOf(),
	};
}
