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
 * @returns whether the server confirmed the write
 */
export async function saveContentRequest(
	post: ContentPost,
	params: SaveContentParams,
	log: SaveContentLog,
): Promise<boolean> {
	const res = await post({
		json: {
			path: params.path,
			content: params.content,
			frontMatter: params.frontMatter,
			originalFrontMatter: params.originalFrontMatter,
			createIfMissing: params.createIfMissing,
		},
	});

	if (!res.ok) {
		const errorBody = (await res.json().catch(() => ({}))) as {
			error?: string;
		};
		log.error(`Failed to save: ${errorBody.error ?? res.statusText}`);
		return false;
	}

	const json = await res.json();
	if (!('saved' in json) || !json.saved) {
		log.error('Save did not complete');
		return false;
	}

	log.info(`Saved: ${json.path}${json.hasFrontMatter ? ' (with Front Matter)' : ''}`);
	return true;
}
