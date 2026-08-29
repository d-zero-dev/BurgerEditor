/**
 * Canonicalize a logical page path the same way `/api/content` does before
 * using it as an Agent Hub key (`TabSession.page`, `RevisionRegistry`
 * entries) — `/` and `/index.html` address the same file, but a browser tab
 * sends its own `location.pathname` (`/`) while an agent tool call passes
 * whatever path string it read from `page_list`/`page_blocks` (typically
 * the full file name). Without this, `TabHub.primaryTabFor` never matches
 * an open root-page tab against an agent's `/index.html`, and every mutation
 * silently falls back to the disk path instead of relaying to the browser.
 *
 * No Node.js APIs — safe to import from both the server (`route.tsx`,
 * `agent/route.ts`) and the browser bundle (`client/create-editor.ts`).
 * @param logicalPath
 * @param indexFileName
 * @example
 * ```ts
 * normalizeLogicalPath('/', 'index.html'); // '/index.html'
 * normalizeLogicalPath('/about.html', 'index.html'); // '/about.html'
 * ```
 */
export function normalizeLogicalPath(logicalPath: string, indexFileName: string): string {
	if (logicalPath.endsWith('/')) {
		return logicalPath + indexFileName;
	}
	return logicalPath;
}
