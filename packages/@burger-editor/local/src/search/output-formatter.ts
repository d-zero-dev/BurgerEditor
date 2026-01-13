import type { LocalServerConfig } from '../types.js';
import type { SearchMatch } from './html-file-scanner.js';

import path from 'node:path';

export interface OutputOptions {
	readonly showUrl: boolean;
	readonly config: LocalServerConfig;
}

/**
 * Format search match for output
 * @param match Search match result
 * @param options Output options (URL format and config)
 * @returns Formatted output string
 * @example
 * // Default output
 * formatOutput(match, { showUrl: false, config })
 * // => "/absolute/path/to/file.html:89"
 *
 * // URL output
 * formatOutput(match, { showUrl: true, config })
 * // => "http://localhost:5255/relative/path/file.html:89"
 */
export function formatOutput(match: SearchMatch, options: OutputOptions): string {
	const { filePath, lineNumber } = match;
	const { showUrl, config } = options;

	if (showUrl) {
		const relativePath = path.relative(config.documentRoot, filePath);
		// Normalize path separators for URLs (Windows compatibility)
		const normalizedPath = relativePath.replaceAll('\\', '/');
		const url = `http://${config.host}:${config.port}/${normalizedPath}`;
		return `${url}:${lineNumber}`;
	}

	return `${filePath}:${lineNumber}`;
}
