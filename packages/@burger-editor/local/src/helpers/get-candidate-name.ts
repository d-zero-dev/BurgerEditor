import path from 'node:path';

import { encode } from './file-name.js';
import { getMaxFileId } from './get-max-file-id.js';

/**
 * Encoded file name format: {fileId}__{encodedName}{ext}
 * Example: "12345__encoded.jpg"
 */
export type EncodedFileName = `${number}__${string}`;

/**
 * Generate a candidate file name for upload
 * @param name - Original file name (with extension)
 * @param destDir - Destination directory path
 * @returns Candidate file name (e.g., "12345__encoded.jpg")
 */
export async function getCandidateName(
	name: string,
	destDir: string,
): Promise<EncodedFileName> {
	const maxId = await getMaxFileId(destDir);
	const nextId = maxId + 1;

	const ext = path.extname(name);
	const baseName = path.basename(name, ext);
	const encodedName = encode(baseName);

	return `${nextId}__${encodedName}${ext}`;
}
