import type { SaveFailureReason } from './save-failure-banner.js';
import type { AppType } from '../app.js';
import type { hc } from 'hono/client';

/**
 * Logging surface for {@link saveContentRequest}. Decoupled from `console` so
 * that callers can route saves to a status panel and tests can assert directly.
 */
export type SaveContentLog = {
	info: (message: string) => void;
	error: (message: string) => void;
};

export type SaveContentParams = {
	path: string;
	content: string;
	frontMatter?: Record<string, unknown>;
	originalFrontMatter?: string;
	/**
	 * Ask the server to create the file from `newFileContent` when it doesn't
	 * exist. Only for a page that didn't exist when it was opened — otherwise a
	 * missing file means it was deleted or moved elsewhere, and the server
	 * reports that as a 404 instead of bringing it back.
	 */
	createIfMissing?: boolean;
	/**
	 * This tab's Agent Hub session, so the server marks only the saving tab in
	 * step with disk and reloads the other tabs on the page (`AgentLink.sessionId`).
	 */
	sessionId?: string;
	/**
	 * The hash of the file content the edit started from (the page's
	 * `#content-hash`, then each save's `contentHash`). The server rejects the
	 * save with 409 `conflict` when the file has changed since.
	 */
	baseHash?: string;
};

/** Callbacks for the outcome of a save. */
export type SaveContentHandlers = {
	/** Called once the server confirmed the write. */
	readonly onSaved?: (info: SavedInfo) => void;
	/**
	 * Called when the save did not reach disk, with the reason: `conflict` (409
	 * `conflict`: the page changed after the content was loaded), `not-found`
	 * (404: the page moved or was deleted elsewhere), `path-taken` (another 409:
	 * the Front Matter path is used by another page) or `failed` (anything else,
	 * including a request that never reached the server).
	 */
	readonly onFailed?: (reason: SaveFailureReason) => void;
};

/** What a confirmed save reports back. */
export type SavedInfo = {
	/** The hash of what was written. */
	contentHash: string | undefined;
	/**
	 * The page's logical path after the save — another one when the save moved
	 * the page (a virtual-tree page whose Front Matter path key changed).
	 */
	logicalPath: string | undefined;
};

type ContentPost = ReturnType<typeof hc<AppType>>['api']['content']['$post'];

/**
 * POST `/api/content` with the supplied payload and translate the response
 * into one of three log events: "saved", "save failed" (4xx with structured
 * `{error}` body), or "save did not complete" (200 but the server signalled
 * the write didn't land).
 *
 * Why this is a separate module rather than inline in `create-editor.ts`:
 * - The `$post` client returns a discriminated union (success | `{error}`),
 *   and the error/non-saved branches are easy to typo. A focused spec exercises
 *   all four cases without spinning up the editor DOM.
 * - `create-editor.ts` already pulls in `@burger-editor/client`, the block
 *   catalog, the Front Matter editor, and DOM lookups — costs we don't want
 *   to pay for a request-shape regression test.
 * @param post the Hono client's `client.api.content.$post`; injectable so tests
 *             can substitute a `Response`-returning fake.
 * @param params
 * @param log
 * @param handlers
 * @returns whether the server confirmed the write
 */
export async function saveContentRequest(
	post: ContentPost,
	params: SaveContentParams,
	log: SaveContentLog,
	handlers: SaveContentHandlers = {},
): Promise<boolean> {
	let res: Awaited<ReturnType<ContentPost>>;
	try {
		res = await post({
			json: {
				path: params.path,
				content: params.content,
				frontMatter: params.frontMatter,
				originalFrontMatter: params.originalFrontMatter,
				createIfMissing: params.createIfMissing,
				...(params.sessionId === undefined ? {} : { sessionId: params.sessionId }),
				...(params.baseHash === undefined ? {} : { baseHash: params.baseHash }),
			},
		});
	} catch (error) {
		// The server is unreachable (stopped, network down): report it like any
		// other failed save instead of rejecting, so the editor can tell the user
		log.error(
			`Failed to save: ${error instanceof Error ? error.message : String(error)}`,
		);
		handlers.onFailed?.('failed');
		return false;
	}

	if (!res.ok) {
		const errorBody = (await res.json().catch(() => ({}))) as {
			error?: string;
		};
		log.error(`Failed to save: ${errorBody.error ?? res.statusText}`);
		// `POST /api/content` answers 409 for two things: a save from older
		// content (`error: 'conflict'`) and a Front Matter path another page uses
		// (`PathConflictError`, whose message is the error)
		handlers.onFailed?.(
			res.status === 409
				? errorBody.error === 'conflict'
					? 'conflict'
					: 'path-taken'
				: res.status === 404
					? 'not-found'
					: 'failed',
		);
		return false;
	}

	const json = await res.json();
	if (!('saved' in json) || !json.saved) {
		log.error('Save did not complete');
		handlers.onFailed?.('failed');
		return false;
	}

	log.info(`Saved: ${json.path}${json.hasFrontMatter ? ' (with Front Matter)' : ''}`);
	handlers.onSaved?.({
		contentHash: 'contentHash' in json ? json.contentHash : undefined,
		logicalPath: 'logicalPath' in json ? json.logicalPath : undefined,
	});
	return true;
}
