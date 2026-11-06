import type { SaveContentLog } from './save-content-request.js';
import type { SaveFailureReason } from './save-failure-banner.js';

import { movedPageUrl } from './moved-page.js';
import { saveContentRequest } from './save-content-request.js';

type ContentPost = Parameters<typeof saveContentRequest>[0];

/** What a page saver needs from the editor page. */
export interface PageSaverOptions {
	/** `client.api.content.$post` */
	readonly post: ContentPost;
	/**
	 * The hash of the file content the page was served from (`#content-hash`).
	 * Each confirmed save replaces it with the hash of what it wrote.
	 */
	readonly baseHash: string | undefined;
	readonly indexFileName: string;
	/** `location.pathname` — the page's path for the request */
	getPathname(): string;
	/** This tab's Agent Hub session (`AgentLink.sessionId`), or `null` */
	getSessionId(): string | null;
	/** Whether this save should create the file (`createSaveGate().createIfMissing`) */
	createIfMissing(): boolean;
	/** Called with every save's outcome (`createSaveGate().recordSave`) */
	onSaveResult(saved: boolean): void;
	/** Called after a confirmed save with the hash it wrote (`AgentLink.notifyHumanSave`) */
	onHumanSave(contentHash: string | undefined): void;
	/** Shows that a save did not reach disk (`showSaveFailureBanner`) */
	showFailure(reason: SaveFailureReason): void;
	/** Removes that notice once a save succeeds (`clearSaveFailureBanner`) */
	clearFailure(): void;
	/**
	 * Makes the tab follow a page its save moved (a virtual-tree page whose Front
	 * Matter path changed): the tab's URL and the page its Agent Hub link reports.
	 * It must not reload — Front Matter is saved while the user is still typing
	 */
	followMovedPage(url: string): void;
	readonly log: SaveContentLog;
}

/**
 * The editor page's human saves (`POST /api/content`), with what each save
 * must carry and do around it:
 * - every save sends the hash the edit started from (`baseHash`) and the tab's
 *   Agent Hub session, so the server refuses a save made from older content and
 *   marks only this tab in step with disk
 * - a confirmed save advances the base hash, clears a failure notice and tells
 *   the Agent Hub link; a save that moved the page (virtual tree) makes the tab
 *   follow its new path, since the old one no longer resolves
 * - a save that did not reach disk shows why, so it never looks saved
 *
 * Kept apart from `create-editor.ts` so this wiring is tested without the
 * editor DOM.
 * @param options
 * @example
 * ```ts
 * const saver = createPageSaver({ post: client.api.content.$post, baseHash, ... });
 * await saver.save(mainInput.value, frontMatter, originalFrontMatter);
 * ```
 */
export function createPageSaver(options: PageSaverOptions) {
	let baseHash = options.baseHash;
	// Saves are sent one after another: a save started while another is in
	// flight must carry the hash that one writes, or the server would refuse it
	// as made from older content
	let queue: Promise<unknown> = Promise.resolve();
	return {
		/**
		 * @param content
		 * @param frontMatter
		 * @param originalFrontMatter
		 * @returns whether the server confirmed the write
		 */
		save(
			content: string,
			frontMatter?: Record<string, unknown>,
			originalFrontMatter?: string,
		): Promise<boolean> {
			const result = queue.then(() => send(content, frontMatter, originalFrontMatter));
			queue = result.catch(() => {});
			return result;
		},
	};

	/**
	 * @param content
	 * @param frontMatter
	 * @param originalFrontMatter
	 */
	async function send(
		content: string,
		frontMatter?: Record<string, unknown>,
		originalFrontMatter?: string,
	): Promise<boolean> {
		let savedHash: string | undefined;
		let movedTo: string | null = null;
		const pathname = options.getPathname();
		const saved = await saveContentRequest(
			options.post,
			{
				path: pathname,
				content,
				frontMatter,
				originalFrontMatter,
				createIfMissing: options.createIfMissing(),
				sessionId: options.getSessionId() ?? undefined,
				baseHash,
			},
			options.log,
			{
				onSaved: (info) => {
					savedHash = info.contentHash;
					baseHash = info.contentHash ?? baseHash;
					movedTo = movedPageUrl(info.logicalPath, pathname, options.indexFileName);
				},
				onFailed: (reason) => options.showFailure(reason),
			},
		);
		options.onSaveResult(saved);
		if (saved) {
			options.clearFailure();
			options.onHumanSave(savedHash);
		}
		if (movedTo) {
			options.followMovedPage(movedTo);
		}
		return saved;
	}
}
