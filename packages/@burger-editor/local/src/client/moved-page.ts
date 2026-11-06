import { normalizeLogicalPath } from '../helpers/normalize-logical-path.js';

/**
 * Where the tab should go after a save, when that save moved the page to
 * another logical path (a virtual-tree page whose Front Matter path key
 * changed). The old path no longer resolves, so the tab's next save would fail;
 * reopening the page at its new path keeps it editable (the content was just
 * saved, so nothing is lost).
 * @param logicalPath - The page's logical path after the save (`POST /api/content`'s `logicalPath`)
 * @param currentPathname - `location.pathname`
 * @param indexFileName
 * @returns The URL to open, or `null` when the page did not move
 * @example
 * ```ts
 * movedPageUrl('/company/about.html', '/about.html', 'index.html'); // '/company/about.html'
 * movedPageUrl('/index.html', '/', 'index.html'); // null
 * ```
 */
export function movedPageUrl(
	logicalPath: string | undefined,
	currentPathname: string,
	indexFileName: string,
): string | null {
	if (logicalPath === undefined) {
		return null;
	}
	return normalizeLogicalPath(logicalPath, indexFileName) ===
		normalizeLogicalPath(currentPathname, indexFileName)
		? null
		: logicalPath;
}
