import type { LocalServerConfig } from '../types.js';
import type { FileListResult } from '@burger-editor/core';

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { FileListManager } from '../model/file-list-manager.js';

const fileTypeSchema = z.enum(['image', 'pdf', 'video', 'audio', 'other']);

const listSchema = z.object({
	type: fileTypeSchema,
	filter: z.string().optional(),
	page: z.number().int().min(0).optional(),
	selected: z.string().optional(),
});

const uploadSchema = z.object({
	file: z.instanceof(File),
	type: fileTypeSchema,
});

const deleteSchema = z.object({
	type: fileTypeSchema,
	url: z.string(),
});

/**
 * `POST /list`, `POST /upload`, `DELETE /` — mounted at `/api/file`, so
 * `DELETE /` becomes `DELETE /api/file` (matching the browser's
 * `client.api.file.$delete`).
 * @param config
 */
export function createFileApi(config: LocalServerConfig) {
	const fileListManger = {
		image: new FileListManager(
			config.filesDir.image.serverPath,
			config.filesDir.image.clientPath,
			config.sampleImagePath,
		),
		pdf: new FileListManager(
			config.filesDir.pdf.serverPath,
			config.filesDir.pdf.clientPath,
			config.sampleFilePath,
		),
		video: new FileListManager(
			config.filesDir.video.serverPath,
			config.filesDir.video.clientPath,
			config.sampleFilePath,
		),
		audio: new FileListManager(
			config.filesDir.audio.serverPath,
			config.filesDir.audio.clientPath,
			config.sampleFilePath,
		),
		other: new FileListManager(
			config.filesDir.other.serverPath,
			config.filesDir.other.clientPath,
			config.sampleFilePath,
		),
	} as const;

	return new Hono()
		.post('/list', zValidator('json', listSchema), async (c) => {
			const { type, filter, page, selected } = c.req.valid('json');
			const result = await fileListManger[type].getList({ filter, page, selected });
			return c.json<FileListResult>(result);
		})
		.post('/upload', zValidator('form', uploadSchema), async (c) => {
			const { file, type } = c.req.valid('form');
			const res = await fileListManger[type].add(file);
			return c.json({ error: false, ...res });
		})
		.delete('/', zValidator('json', deleteSchema), async (c) => {
			const { type, url } = c.req.valid('json');
			const success = await fileListManger[type].delete(url);
			return c.json({ error: !success });
		});
}
