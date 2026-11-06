import type { AppContext } from '../app-context.js';
import type { ResolverState } from '../model/virtual-path-resolver.js';

import path from 'node:path';

import { computeContentHash } from '@burger-editor/cli';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { contentHashOrMissing } from '../helpers/content-hash-or-missing.js';
import { log } from '../helpers/debug.js';
import { FileNotFoundError, saveContent } from '../helpers/edit-content.js';
import { NoEditableAreaError } from '../helpers/no-editable-area-error.js';
import { normalizeLogicalPath } from '../helpers/normalize-logical-path.js';
import { buildFileTreeFromLogicalPaths, generateFileTree } from '../model/file-tree.js';
import {
	EmptyLogicalPathError,
	IdAlreadyExistsError,
	PathConflictError,
	listEntries,
	registerEntry,
	setLogicalPath,
	toDiskPath,
} from '../model/virtual-path-resolver.js';

import { rejectInvalid } from './reject-invalid.js';

const LOGICAL_PATH_INVALID_MESSAGE =
	'logical path must not contain "." or ".." segments or NUL bytes';

/**
 * Reject logical paths that would canonicalize to a key the browser silently
 * normalizes away (e.g. `../foo.html` → `/foo.html` in `<a href>` clicks),
 * orphaning the disk file from the editor UI. See issue #755.
 *
 * Empty strings and "/"-only inputs are still accepted here; they are caught
 * downstream by `EmptyLogicalPathError` to keep error surfaces consistent.
 * @param input
 */
function isSafeLogicalPath(input: string): boolean {
	if (input.includes('\0')) {
		return false;
	}
	const stripped = input.replace(/^\/+/, '');
	if (stripped.length === 0) {
		return true;
	}
	return !stripped.split('/').some((seg) => seg === '.' || seg === '..');
}

const apiSchema = z.object({
	path: z.string().refine(isSafeLogicalPath, { message: LOGICAL_PATH_INVALID_MESSAGE }),
	content: z.string(),
	frontMatter: z.record(z.string(), z.unknown()).optional(),
	originalFrontMatter: z.string().optional(),
	createIfMissing: z.boolean().optional(),
	/** The saving tab's Agent Hub session (its `welcome` `sessionId`), when it has one. */
	sessionId: z.string().optional(),
	/**
	 * The hash of the file content the edit started from (the page's
	 * `#content-hash`, then each save's `contentHash`). Checked only when the
	 * Agent Hub is disabled. With it enabled, the server's own record of the tab
	 * named by `sessionId` is checked instead, because it also follows the
	 * agent's writes the tab applied, which the tab's own hash does not.
	 * Why not fall back to it when the session is unknown (a tab reconnecting):
	 * after an agent write applied in the tab it would refuse a save from
	 * current content, and editing while the agent writes is not supported.
	 */
	baseHash: z.string().optional(),
});

// `id` becomes part of the on-disk filename, so we forbid anything that could
// break out of documentRoot. The handler additionally re-checks the resolved
// path as a defense in depth.
const createApiSchema = z.object({
	id: z
		.string()
		.min(1)
		.refine(
			(v) =>
				!/[/\\]/.test(v) &&
				v !== '.' &&
				v !== '..' &&
				!v.startsWith('.') &&
				!v.includes('\0'),
			{
				message:
					'id must not contain path separators, NUL bytes, or be "." / ".." / a dotfile',
			},
		),
	path: z
		.string()
		.min(1)
		.refine(isSafeLogicalPath, { message: LOGICAL_PATH_INVALID_MESSAGE }),
	content: z.string().optional(),
	frontMatter: z.record(z.string(), z.unknown()).optional(),
});

/**
 * `POST /content`, `POST /content/create`, `GET /tree` — mounted at `/api`.
 * Every read-modify-write against the resolver state goes through
 * `ctx.store.withStateLock`, the same lock every agent-invoked disk write
 * uses, so a human save and an agent tool call can never race onto the same
 * file.
 * @param ctx
 */
export function createContentApi(ctx: AppContext) {
	const { config, store } = ctx;
	const virtualTreeEnabled = config.virtualTree.enabled;
	const pathKey = config.virtualTree.pathKey;

	return new Hono()
		.post('/content', zValidator('json', apiSchema, rejectInvalid), async (c) => {
			const data = c.req.valid('json');
			const normalizedPath = normalizeLogicalPath(data.path, config.indexFileName);

			return store.withStateLock(async () => {
				const resolverState = store.getResolverState();
				let targetFilePath: string;
				let nextResolverState: ResolverState | null = resolverState;
				// The page's logical path after this save — another one when the
				// save changes the Front Matter path key (virtual tree)
				let logicalPath = normalizedPath;
				if (virtualTreeEnabled && resolverState) {
					const diskFile = toDiskPath(resolverState, normalizedPath);
					if (!diskFile) {
						return c.json({ error: `Unknown logical path: ${normalizedPath}` }, 404);
					}
					if (data.frontMatter && pathKey in data.frontMatter) {
						const newLogical = data.frontMatter[pathKey];
						if (typeof newLogical !== 'string' || newLogical.length === 0) {
							return c.json(
								{
									error: `Front matter "${pathKey}" must be a non-empty string`,
								},
								400,
							);
						}
						if (!isSafeLogicalPath(newLogical)) {
							return c.json(
								{
									error: `Front matter "${pathKey}" ${LOGICAL_PATH_INVALID_MESSAGE}`,
								},
								400,
							);
						}
						try {
							nextResolverState = setLogicalPath(resolverState, diskFile, newLogical);
							// Front Matter paths carry no leading slash; tabs and agents use one
							logicalPath = normalizeLogicalPath(
								'/' + newLogical.replace(/^\/+/, ''),
								config.indexFileName,
							);
						} catch (error) {
							if (error instanceof PathConflictError) {
								return c.json({ error: error.message }, 409);
							}
							if (error instanceof EmptyLogicalPathError) {
								return c.json({ error: error.message }, 400);
							}
							throw error;
						}
					}
					targetFilePath = path.join(config.documentRoot, diskFile);
				} else {
					targetFilePath = path.join(config.documentRoot, normalizedPath);
				}

				// Defense in depth against path traversal via data.path / resolverState.
				const resolvedRoot = path.resolve(config.documentRoot);
				const resolvedTarget = path.resolve(targetFilePath);
				if (
					resolvedTarget !== resolvedRoot &&
					!resolvedTarget.startsWith(resolvedRoot + path.sep)
				) {
					return c.json(
						{ error: `Resolved path escapes documentRoot: ${normalizedPath}` },
						400,
					);
				}

				// A save made from content older than the file would overwrite what was
				// saved since (another tab, the agent, an external editor), so it is
				// rejected and the tab asks the user to reload. With the Agent Hub, a
				// tab known to be behind (told to reload, or showing other content) is
				// rejected; without it, a `baseHash` that differs from the file is.
				// With the Agent Hub, a save whose session is unknown (a tab before its
				// WS `welcome`) is not checked; without it, a save with no `baseHash`
				// (an older client) is not checked.
				const savingTab =
					ctx.agent && data.sessionId !== undefined
						? ctx.agent.hub.tabHub.get(data.sessionId)
						: undefined;
				// The file is read for the check only when there is something to
				// compare it with
				let behind = false;
				if (savingTab?.page === normalizedPath) {
					behind =
						savingTab.reloadRequested ||
						(savingTab.syncedHash !== null &&
							savingTab.syncedHash !== (await contentHashOrMissing(targetFilePath)));
				} else if (!ctx.agent && data.baseHash !== undefined) {
					behind = data.baseHash !== (await contentHashOrMissing(targetFilePath));
				}
				if (behind) {
					return c.json(
						{
							error: 'conflict',
							message:
								'The page was updated elsewhere (another tab, the agent, or another editor) after this content was loaded. Reload to get the latest content.',
						},
						409,
					);
				}

				try {
					// Opening a page doesn't create it (`routes/pages.tsx`), so the
					// first save of a page that didn't exist when it was opened
					// builds it from `newFileContent`. Any other missing file was
					// deleted or moved after it was opened — report it instead of
					// bringing it back.
					await saveContent(
						targetFilePath,
						data.content,
						config.editableArea,
						data.frontMatter,
						data.originalFrontMatter,
						data.createIfMissing ? { newFileContent: config.newFileContent } : {},
					);
				} catch (error) {
					if (error instanceof NoEditableAreaError) {
						return c.json({ error: error.message }, 400);
					}
					if (error instanceof FileNotFoundError) {
						return c.json({ error: error.message }, 404);
					}
					throw error;
				}

				// 2-phase commit: only advance resolverState after the file write succeeds.
				store.setResolverState(nextResolverState);

				const contentHash = await computeContentHash(targetFilePath);
				if (ctx.agent) {
					// A human's browser save also moves disk state — keep the agent
					// hub's view of it current. Only the tab that saved (named by
					// `sessionId`) shows what is on disk now; every other tab on the
					// page is told to reload and is not marked in step, so an agent's
					// op is never relayed to its older content (agent/route.ts). Without
					// a `sessionId` naming a tab on this page, no tab is known to have
					// saved, so every tab on the page reloads (the saving tab, if it
					// is among them, reloads content it has just saved).
					const { revisions, tabHub } = ctx.agent.hub;
					const bumped = revisions.bump(normalizedPath, contentHash);
					const saver =
						data.sessionId === undefined ? undefined : tabHub.get(data.sessionId);
					const saverId = saver?.page === normalizedPath ? saver.id : null;
					for (const session of tabHub.snapshotAll()) {
						if (session.page !== normalizedPath) {
							continue;
						}
						if (session.id === saverId) {
							tabHub.setSyncedHash(session.id, contentHash);
						} else {
							// Its open-time normalization was built on the file before
							// this save; writing it later would undo the save
							tabHub.discardNormalization(session.id);
						}
					}
					if (logicalPath === normalizedPath) {
						tabHub.reloadOthers(normalizedPath, saverId, bumped.revision, 'other-tab');
					} else {
						// The page moved. Reloading the old path would answer Not Found,
						// so the other tabs there are only marked behind and get the
						// notice an agent's page_rename sends; the saving tab follows the
						// new path itself (client/create-editor.ts), so it is re-keyed
						// there and gets nothing
						tabHub.markBehind(normalizedPath, saverId);
						if (saverId) {
							tabHub.movePage(saverId, logicalPath);
						}
						const target = { from: normalizedPath, to: logicalPath };
						tabHub.broadcast({ type: 'page-event', kind: 'renamed', ...target }, saverId);
						ctx.agent.hub.events.append('page-renamed', target);
					}
				}

				log('Saved: %s (with Front Matter: %s)', targetFilePath, !!data.frontMatter);
				return c.json({
					saved: true,
					path: targetFilePath,
					hasFrontMatter: !!data.frontMatter,
					// The hash of what was written — the tab's next `baseHash`, and what
					// it reports in its next `hello` after a reconnect (client/agent-link.ts)
					contentHash,
					// The page's logical path after the save, so a tab whose save moved
					// the page (virtual tree) can follow it
					logicalPath,
				});
			});
		})
		.post(
			'/content/create',
			zValidator('json', createApiSchema, rejectInvalid),
			async (c) => {
				const data = c.req.valid('json');
				if (!virtualTreeEnabled) {
					return c.json(
						{ error: 'virtualTree mode is disabled; this endpoint is unavailable' },
						400,
					);
				}

				return store.withStateLock(async () => {
					const resolverState = store.getResolverState();
					if (!resolverState) {
						return c.json(
							{ error: 'virtualTree resolver state is not initialized' },
							500,
						);
					}
					const diskFile = data.id.endsWith('.html') ? data.id : `${data.id}.html`;
					const targetFilePath = path.join(config.documentRoot, diskFile);
					// Defense in depth: even if the id schema misses something, refuse
					// any resolved path that escapes documentRoot.
					const resolvedRoot = path.resolve(config.documentRoot);
					const resolvedTarget = path.resolve(targetFilePath);
					if (
						resolvedTarget !== resolvedRoot &&
						!resolvedTarget.startsWith(resolvedRoot + path.sep)
					) {
						return c.json(
							{ error: `Resolved path escapes documentRoot: ${diskFile}` },
							400,
						);
					}

					let nextResolverState: ResolverState;
					try {
						nextResolverState = registerEntry(resolverState, diskFile, data.path);
					} catch (error) {
						if (
							error instanceof PathConflictError ||
							error instanceof IdAlreadyExistsError
						) {
							return c.json({ error: error.message }, 409);
						}
						if (error instanceof EmptyLogicalPathError) {
							return c.json({ error: error.message }, 400);
						}
						throw error;
					}

					const frontMatter = { ...data.frontMatter, [pathKey]: data.path };
					const initialContent = data.content ?? config.newFileContent;
					// New files bypass editableArea: saveContent's editableArea path reads the
					// existing file first, which would ENOENT for a fresh create.
					await saveContent(targetFilePath, initialContent, null, frontMatter);

					// 2-phase commit: only advance resolverState after the file write succeeds.
					store.setResolverState(nextResolverState);

					log('Created: %s -> %s', diskFile, data.path);
					return c.json({
						created: true,
						id: diskFile,
						path: data.path,
					});
				});
			},
		)
		.get('/tree', async (c) => {
			const resolverState = store.getResolverState();
			if (virtualTreeEnabled && resolverState) {
				const tree = buildFileTreeFromLogicalPaths(listEntries(resolverState));
				return c.json({ tree });
			}
			const tree = await generateFileTree(config.documentRoot);
			return c.json({ tree });
		});
}
