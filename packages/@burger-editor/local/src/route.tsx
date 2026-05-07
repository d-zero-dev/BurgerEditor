import type { LocalServerConfig } from './types.js';
import type { FileListResult } from '@burger-editor/core';
import type { Hono } from 'hono';

import fs from 'node:fs/promises';
import path from 'node:path';

import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import { HEALTH_CHECK_END_POINT } from './constants.js';
import { log } from './helpers/debug.js';
import { loadContent, saveContent } from './helpers/edit-content.js';
import { NoEditableAreaError } from './helpers/no-editable-area-error.js';
import { defaultConfig } from './model/default-config.js';
import { FileListManager } from './model/file-list-manager.js';
import { buildFileTreeFromLogicalPaths, generateFileTree } from './model/file-tree.js';
import {
	IdAlreadyExistsError,
	PathConflictError,
	listLogicalPaths,
	registerEntry,
	setLogicalPath,
	toDiskPath,
	type ResolverState,
} from './model/virtual-path-resolver.js';
import { App } from './view/app.js';

const clientFileDir = path.resolve(import.meta.dirname, '..', 'dist');

const apiSchema = z.object({
	path: z.string(),
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
	path: z.string().min(1),
	content: z.string().optional(),
	frontMatter: z.record(z.string(), z.unknown()).optional(),
});

/**
 *
 * @param app
 * @param userConfig
 * @param initialResolverState Pre-loaded resolver state (null when virtualTree is disabled)
 */
export function setRoute(
	app: Hono,
	userConfig: LocalServerConfig,
	initialResolverState: ResolverState | null = null,
) {
	const virtualTreeEnabled = userConfig.virtualTree.enabled;
	const pathKey = userConfig.virtualTree.pathKey;
	let resolverState: ResolverState | null = initialResolverState;

	// Serialize all resolverState read-modify-write operations to avoid races
	// where two concurrent saves both observe the same starting state and the
	// later write clobbers the earlier one.
	let stateLock: Promise<unknown> = Promise.resolve();
	/**
	 *
	 * @param work
	 */
	function withStateLock<T>(work: () => Promise<T>): Promise<T> {
		const next = stateLock.then(work, work);
		stateLock = next.catch(() => {});
		return next;
	}
	const fileListManger = {
		image: new FileListManager(
			userConfig.filesDir.image.serverPath,
			userConfig.filesDir.image.clientPath,
			userConfig.sampleImagePath,
		),
		pdf: new FileListManager(
			userConfig.filesDir.pdf.serverPath,
			userConfig.filesDir.pdf.clientPath,
			userConfig.sampleFilePath,
		),
		video: new FileListManager(
			userConfig.filesDir.video.serverPath,
			userConfig.filesDir.video.clientPath,
			userConfig.sampleFilePath,
		),
		audio: new FileListManager(
			userConfig.filesDir.audio.serverPath,
			userConfig.filesDir.audio.clientPath,
			userConfig.sampleFilePath,
		),
		other: new FileListManager(
			userConfig.filesDir.other.serverPath,
			userConfig.filesDir.other.clientPath,
			userConfig.sampleFilePath,
		),
	} as const;

	const routes = app
		// ------------------------------------------------------------------------------------------
		//
		// Store Files
		//
		// ------------------------------------------------------------------------------------------
		.get(`${userConfig.filesDir.image.clientPath}/:file{.+$}`, async (c) => {
			const file = c.req.param('file');
			const targetFilePath = path.resolve(userConfig.filesDir.image.serverPath, file);
			const buffer = await readFile(targetFilePath).catch(() => null);
			if (!buffer) {
				return c.text('Not Found', 404);
			}
			if (file.toLowerCase().endsWith('.svg')) {
				c.header('Content-Type', 'image/svg+xml');
			}
			return c.body(buffer);
		})
		.get(`${userConfig.filesDir.pdf.clientPath}/:file{.+$}`, async (c) => {
			const file = c.req.param('file');
			const targetFilePath = path.resolve(userConfig.filesDir.pdf.serverPath, file);
			const buffer = await readFile(targetFilePath).catch(() => null);
			if (!buffer) {
				return c.text('Not Found', 404);
			}
			return c.body(buffer);
		})
		.get(`${userConfig.filesDir.video.clientPath}/:file{.+$}`, async (c) => {
			const file = c.req.param('file');
			const targetFilePath = path.resolve(userConfig.filesDir.video.serverPath, file);
			const buffer = await readFile(targetFilePath).catch(() => null);
			if (!buffer) {
				return c.text('Not Found', 404);
			}
			return c.body(buffer);
		})
		.get(`${userConfig.filesDir.audio.clientPath}/:file{.+$}`, async (c) => {
			const file = c.req.param('file');
			const targetFilePath = path.resolve(userConfig.filesDir.audio.serverPath, file);
			const buffer = await readFile(targetFilePath).catch(() => null);
			if (!buffer) {
				return c.text('Not Found', 404);
			}
			return c.body(buffer);
		})
		.get(`${userConfig.filesDir.other.clientPath}/:file{.+$}`, async (c) => {
			const file = c.req.param('file');
			const targetFilePath = path.resolve(userConfig.filesDir.other.serverPath, file);
			const buffer = await readFile(targetFilePath).catch(() => null);
			if (!buffer) {
				return c.text('Not Found', 404);
			}
			return c.body(buffer);
		})
		// ------------------------------------------------------------------------------------------
		//
		// App Specific Files
		//
		// ------------------------------------------------------------------------------------------
		.get('/app.css', async (c) => {
			const targetFilePath = path.resolve(import.meta.dirname, '..', 'style', 'app.css');
			const content = await fs.readFile(targetFilePath, 'utf8');
			c.header('Content-Type', 'text/css');
			return c.body(content);
		})
		.get('/client.js', async (c) => {
			const targetFilePath = path.resolve(clientFileDir, 'client.js');
			const content = await fs.readFile(targetFilePath, 'utf8');
			c.header('Content-Type', 'text/javascript');
			return c.body(content);
		})
		.get('/client.js.map', async (c) => {
			const targetFilePath = path.resolve(clientFileDir, 'client.js.map');
			const content = await fs.readFile(targetFilePath, 'utf8');
			return c.body(content);
		})
		.get('/client.css', async (c) => {
			const targetFilePath = path.resolve(clientFileDir, 'local.css');
			const content = await fs.readFile(targetFilePath, 'utf8');
			c.header('Content-Type', 'text/css');
			return c.body(content);
		})
		.get('/config.json', (c) => {
			return c.json({
				...defaultConfig,
				...userConfig,
			});
		})
		// ------------------------------------------------------------------------------------------
		//
		// API
		//
		// ------------------------------------------------------------------------------------------
		.get(HEALTH_CHECK_END_POINT, (c) => {
			return c.json({
				status: 'ok',
				timestamp: Date.now(),
			});
		})
		.post('/api/content', zValidator('json', apiSchema), async (c) => {
			const data = c.req.valid('json');
			let normalizedPath = data.path;
			if (normalizedPath.endsWith('/')) {
				normalizedPath += userConfig.indexFileName;
			}

			return withStateLock(async () => {
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
						try {
							nextResolverState = setLogicalPath(resolverState, diskFile, newLogical);
						} catch (error) {
							if (error instanceof PathConflictError) {
								return c.json({ error: error.message }, 409);
							}
							throw error;
						}
					}
					targetFilePath = path.join(userConfig.documentRoot, diskFile);
				} else {
					targetFilePath = path.join(userConfig.documentRoot, normalizedPath);
				}

				// Defense in depth against path traversal via data.path / resolverState.
				const resolvedRoot = path.resolve(userConfig.documentRoot);
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

				await saveContent(
					targetFilePath,
					data.content,
					userConfig.editableArea,
					data.frontMatter,
					data.originalFrontMatter,
				);

				// 2-phase commit: only advance resolverState after the file write succeeds.
				resolverState = nextResolverState;

				log('Saved: %s (with Front Matter: %s)', targetFilePath, !!data.frontMatter);
				return c.json({
					saved: true,
					path: targetFilePath,
					hasFrontMatter: !!data.frontMatter,
				});
			});
		})
		.post('/api/content/create', zValidator('json', createApiSchema), async (c) => {
			const data = c.req.valid('json');
			if (!virtualTreeEnabled) {
				return c.json(
					{ error: 'virtualTree mode is disabled; this endpoint is unavailable' },
					400,
				);
			}

			return withStateLock(async () => {
				if (!resolverState) {
					return c.json({ error: 'virtualTree resolver state is not initialized' }, 500);
				}
				const diskFile = data.id.endsWith('.html') ? data.id : `${data.id}.html`;
				const targetFilePath = path.join(userConfig.documentRoot, diskFile);
				// Defense in depth: even if the id schema misses something, refuse
				// any resolved path that escapes documentRoot.
				const resolvedRoot = path.resolve(userConfig.documentRoot);
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
					throw error;
				}

				const frontMatter = { ...data.frontMatter, [pathKey]: data.path };
				const initialContent = data.content ?? userConfig.newFileContent;
				// New files bypass editableArea: saveContent's editableArea path reads the
				// existing file first, which would ENOENT for a fresh create.
				await saveContent(targetFilePath, initialContent, null, frontMatter);

				// 2-phase commit: only advance resolverState after the file write succeeds.
				resolverState = nextResolverState;

				log('Created: %s -> %s', diskFile, data.path);
				return c.json({
					created: true,
					id: diskFile,
					path: data.path,
				});
			});
		})
		.get('/api/tree', async (c) => {
			if (virtualTreeEnabled && resolverState) {
				const tree = buildFileTreeFromLogicalPaths(listLogicalPaths(resolverState));
				return c.json({ tree });
			}
			const tree = await generateFileTree(userConfig.documentRoot);
			return c.json({ tree });
		})
		.post(
			'/api/file/list',
			zValidator(
				'json',
				z.object({
					type: z.enum(['image', 'pdf', 'video', 'audio', 'other']),
					filter: z.string().optional(),
					page: z.number().int().min(0).optional(),
					selected: z.string().optional(),
				}),
			),
			async (c) => {
				const { type, filter, page, selected } = c.req.valid('json');
				const result = await fileListManger[type].getList({
					filter,
					page,
					selected,
				});
				return c.json<FileListResult>(result);
			},
		)
		.post(
			'/api/file/upload',
			zValidator(
				'form',
				z.object({
					file: z.instanceof(File),
					type: z.enum(['image', 'pdf', 'video', 'audio', 'other']),
				}),
			),
			async (c) => {
				const { file, type } = c.req.valid('form');
				const res = await fileListManger[type].add(file);
				return c.json({
					error: false,
					...res,
				});
			},
		)
		.delete(
			'/api/file',
			zValidator(
				'json',
				z.object({
					type: z.enum(['image', 'pdf', 'video', 'audio', 'other']),
					url: z.string(),
				}),
			),
			async (c) => {
				const { type, url } = c.req.valid('json');
				const success = await fileListManger[type].delete(url);
				return c.json({
					error: !success,
				});
			},
		)
		// ------------------------------------------------------------------------------------------
		//
		// Page
		//
		// ------------------------------------------------------------------------------------------
		.get('/', (c) => {
			return c.html(
				<App
					path={'/'}
					content={''}
					lang={userConfig.lang}
					virtualTreeEnabled={virtualTreeEnabled}
				/>,
			);
		})
		.get('/:page{.+\\.html$|.+\\/$}', async (c) => {
			const page = c.req.param('page');

			let logicalPath = page;
			if (logicalPath.endsWith('/')) {
				logicalPath += userConfig.indexFileName;
			}

			let targetFilePath: string;
			if (virtualTreeEnabled && resolverState) {
				const diskFile = toDiskPath(resolverState, logicalPath);
				if (!diskFile) {
					return c.text('Not Found', 404);
				}
				targetFilePath = path.join(userConfig.documentRoot, diskFile);
			} else {
				targetFilePath = path.join(userConfig.documentRoot, logicalPath);
			}

			const loadResult = await loadContent(
				targetFilePath,
				userConfig.editableArea,
				userConfig.newFileContent,
			);

			if (loadResult instanceof NoEditableAreaError) {
				return c.html(
					<App
						path={page}
						content={loadResult}
						lang={userConfig.lang}
						virtualTreeEnabled={virtualTreeEnabled}
					/>,
				);
			}
			log(
				'Loaded page with Front Matter: %s (keys: %o)',
				loadResult.hasFrontMatter,
				Object.keys(loadResult.frontMatter),
			);

			return c.html(
				<App
					path={page}
					content={loadResult.editableContent}
					lang={userConfig.lang}
					virtualTreeEnabled={virtualTreeEnabled}
					frontMatter={loadResult.frontMatter}
					hasFrontMatter={loadResult.hasFrontMatter}
				/>,
			);
		})
		// ------------------------------------------------------------------------------------------
		//
		// Static Files
		//
		// ------------------------------------------------------------------------------------------
		.get('/:file{.+$}', async (c) => {
			const file = c.req.param('file');
			const targetFilePath = path.resolve(userConfig.assetsRoot, file);
			const buf = await readFile(targetFilePath).catch(() => null);
			log('Access(/:file): %s => ', file, buf ? targetFilePath : 'Not found');
			if (!buf) {
				return c.text('Not Found', 404);
			}
			const ext = path.extname(file).toLowerCase();
			switch (ext) {
				case '.css': {
					c.header('Content-Type', 'text/css');
					break;
				}
				case '.js': {
					c.header('Content-Type', 'text/javascript');
					break;
				}
				case '.json': {
					c.header('Content-Type', 'application/json');
					break;
				}
				case '.svg': {
					c.header('Content-Type', 'image/svg+xml');
					break;
				}
			}
			return c.body(buf);
		});

	return routes;
}

/**
 *
 * @param filePath
 */
async function readFile(filePath: string): Promise<ArrayBuffer | null> {
	const buffer = await fs.readFile(filePath).catch(() => null);
	if (!buffer) {
		return null;
	}
	return (
		buffer.buffer
			.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
			// eslint-disable-next-line unicorn/prefer-spread
			.slice(0)
	);
}

/**
 * Strongly-typed route schema produced by {@link setRoute}. Used by the client
 * via `hc<AppType>(origin)` so that endpoint paths, request bodies, and
 * response shapes stay in sync between server and browser.
 */
export type AppType = ReturnType<typeof setRoute>;
