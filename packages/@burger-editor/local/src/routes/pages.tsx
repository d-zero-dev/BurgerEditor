import type { AppContext } from '../app-context.js';
import type { Context } from 'hono';

import path from 'node:path';

import { Hono } from 'hono';

import { log } from '../helpers/debug.js';
import { loadContent } from '../helpers/edit-content.js';
import { NoEditableAreaError } from '../helpers/no-editable-area-error.js';
import { toDiskPath } from '../model/virtual-path-resolver.js';
import { App } from '../view/app.js';

/**
 * Shared by `GET /` and the `GET /:page` wildcard so the site root loads
 * (and, if missing, creates) real file content instead of a blank editor
 * that can never be saved.
 * @param c
 * @param ctx
 * @param page
 * @param logicalPath
 */
async function renderPage(
	c: Context,
	ctx: AppContext,
	page: string,
	logicalPath: string,
) {
	const { config, store } = ctx;
	let targetFilePath: string;
	const resolverState = store.getResolverState();
	if (config.virtualTree.enabled && resolverState) {
		const diskFile = toDiskPath(resolverState, logicalPath);
		if (!diskFile) {
			return c.text('Not Found', 404);
		}
		targetFilePath = path.join(config.documentRoot, diskFile);
	} else {
		targetFilePath = path.join(config.documentRoot, logicalPath);
	}

	const loadResult = await loadContent(
		targetFilePath,
		config.editableArea,
		config.newFileContent,
	);

	if (loadResult instanceof NoEditableAreaError) {
		return c.html(
			<App
				path={page}
				content={loadResult}
				lang={config.lang}
				virtualTreeEnabled={config.virtualTree.enabled}
				serverSession={ctx.agent?.hub.serverSession}
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
			lang={config.lang}
			virtualTreeEnabled={config.virtualTree.enabled}
			frontMatter={loadResult.frontMatter}
			hasFrontMatter={loadResult.hasFrontMatter}
			serverSession={ctx.agent?.hub.serverSession}
		/>,
	);
}

/**
 * `GET /` and `GET /:page{.+\.html$|.+\/$}` — mounted at `/`.
 * @param ctx
 */
export function createPageRoutes(ctx: AppContext) {
	return new Hono()
		.get('/', async (c) => {
			return renderPage(c, ctx, '/', ctx.config.indexFileName);
		})
		.get('/:page{.+\\.html$|.+\\/$}', async (c) => {
			const page = c.req.param('page');

			let logicalPath = page;
			if (logicalPath.endsWith('/')) {
				logicalPath += ctx.config.indexFileName;
			}

			return renderPage(c, ctx, page, logicalPath);
		});
}
