import { computeContentHash } from '@burger-editor/cli';

import { MISSING_FILE_CONTENT_HASH } from '../protocol/ws-messages.js';

/**
 * The content hash of `filePath`, or {@link MISSING_FILE_CONTENT_HASH} when the
 * file does not exist. Any other failure (no permission, a directory, …) is
 * thrown: treating it as "missing" would make a save look like it raced
 * another writer (409 `conflict`) and hide the real cause.
 * @param filePath
 * @example
 * ```ts
 * const contentHash = await contentHashOrMissing(targetFilePath);
 * ```
 */
export async function contentHashOrMissing(filePath: string): Promise<string> {
	try {
		return await computeContentHash(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return MISSING_FILE_CONTENT_HASH;
		}
		throw error;
	}
}
