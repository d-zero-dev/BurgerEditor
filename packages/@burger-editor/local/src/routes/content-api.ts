import type { AppContext } from '../app-context.js';
import type { ResolverState } from '../model/virtual-path-resolver.js';

import path from 'node:path';

import { computeContentHash } from '@burger-editor/cli';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

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
		.post('/content', zValidator('json', apiSchema), async (c) => {
			const data = c.req.valid('json');
			const normalizedPath = normalizeLogicalPath(data.path, config.indexFileName);

			return store.withStateLock(async () => {
				const resolverState = store.getResolverState();
				let targetFilePath: string;
				let nextResolverState: ResolverState | null = resolverState;
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

				try {
					await saveContent(
						targetFilePath,
						data.content,
						config.editableArea,
						data.frontMatter,
						data.originalFrontMatter,
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

				if (ctx.agent) {
					// A human's browser save also moves disk state — keep the agent
					// hub's view of it current so the next agent invoke's staleness
					// check (agent/route.ts) doesn't compare against a stale hash.
					// The saving tab isn't identified here (no session header), so
					// every tab with this page open is treated as caught up; a tab
					// that's actually behind still gets a `reload` from the normal
					// disk-write path further down agent/route.ts on the NEXT invoke.
					const newHash = await computeContentHash(targetFilePath);
					ctx.agent.hub.revisions.bump(normalizedPath, newHash);
					for (const session of ctx.agent.hub.tabHub.snapshotAll()) {
						if (session.page === normalizedPath) {
							ctx.agent.hub.tabHub.setSyncedHash(session.id, newHash);
						}
					}
				}

				log('Saved: %s (with Front Matter: %s)', targetFilePath, !!data.frontMatter);
				return c.json({
					saved: true,
					path: targetFilePath,
					hasFrontMatter: !!data.frontMatter,
				});
			});
		})
		.post('/content/create', zValidator('json', createApiSchema), async (c) => {
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
					return c.json({ error: 'virtualTree resolver state is not initialized' }, 500);
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
		})
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
