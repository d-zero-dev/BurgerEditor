import type { LocalServerConfig } from './types.js';
import type { FileListResult } from '@burger-editor/core';
import type { Hono } from 'hono';

import fs from 'node:fs/promises';
import path from 'node:path';

import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import { log } from './helpers/debug.js';
import { loadContent, saveContent } from './helpers/edit-content.js';
import { defaultConfig } from './model/default-config.js';
import { FileListManager } from './model/file-list-manager.js';
import { App } from './view/app.js';

const clientFileDir = path.resolve(import.meta.dirname, '..', 'dist');

const apiSchema = z.object({
	path: z.string(),
	content: z.string(),
});

/**
 *
 * @param app
 * @param userConfig
 */
export function setRoute(app: Hono, userConfig: LocalServerConfig) {
	const fileListManger = {
		image: new FileListManager(
			userConfig.filesDir.image.serverPath,
			userConfig.filesDir.image.clientPath,
		),
		pdf: new FileListManager(
			userConfig.filesDir.pdf.serverPath,
			userConfig.filesDir.pdf.clientPath,
		),
		video: new FileListManager(
			userConfig.filesDir.video.serverPath,
			userConfig.filesDir.video.clientPath,
		),
		audio: new FileListManager(
			userConfig.filesDir.audio.serverPath,
			userConfig.filesDir.audio.clientPath,
		),
		other: new FileListManager(
			userConfig.filesDir.other.serverPath,
			userConfig.filesDir.other.clientPath,
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
		.post('/api/content', zValidator('json', apiSchema), async (c) => {
			const data = c.req.valid('json');
			const targetFilePath = path.join(userConfig.documentRoot, data.path);
			await saveContent(targetFilePath, data.content, userConfig.editableArea);
			log('Saved: %s', targetFilePath);
			return c.json({
				saved: true,
				path: targetFilePath,
			});
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
					rootDir={userConfig.documentRoot}
					lang={userConfig.lang}
				/>,
			);
		})
		.get('/:page{.+\\.html$|.+\\/$}', async (c) => {
			const page = c.req.param('page');

			let targetFilePath = path.join(userConfig.documentRoot, page);

			if (targetFilePath.endsWith('/')) {
				targetFilePath += 'index.html';
			}

			const content = await loadContent(targetFilePath, userConfig.editableArea);

			return c.html(
				<App
					path={page}
					content={content}
					rootDir={userConfig.documentRoot}
					lang={userConfig.lang}
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
			const targetFilePath = path.resolve(userConfig.documentRoot, file);
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
			.slice(0) as ArrayBuffer
	);
}

export type AppType = ReturnType<typeof setRoute>;
