import type { AppType } from '../route.js';

import { generalCSS, items } from '@burger-editor/blocks';
import { createBurgerEditorClient } from '@burger-editor/client';
import { CSS_LAYER } from '@burger-editor/core';
import '@burger-editor/client/style';
import { hc } from 'hono/client';

import { $upload } from '../helpers/$upload.js';

const client = hc<AppType>(location.origin);

/**
 *
 */
export async function createEditor() {
	const configRes = await client['config.json'].$get();
	const config = await configRes.json();

	if (__DEBUG__) {
		// eslint-disable-next-line no-console
		console.log('config', config);
	}

	const mainInput = document.getElementById('main') as HTMLInputElement | null;

	if (mainInput === null) {
		// eslint-disable-next-line no-console
		console.warn('Editable area not found');
		return;
	}

	await createBurgerEditorClient({
		root: '.editor',
		config: {
			...config,
			stylesheets: [
				{
					path: '/client.css',
					layer: CSS_LAYER.ui,
				},
				...config.stylesheets.map((stylesheet) => ({
					path: stylesheet,
				})),
			],
		},
		items,
		catalog: config.catalog,
		initialContents: mainInput.value,
		generalCSS,
		healthCheck: config.healthCheck
			? {
					...config.healthCheck,
					async checkHealth() {
						const response = await client.api.health.$get().catch((error) => error);
						if (response instanceof Error) {
							return false;
						}
						return response.ok;
					},
				}
			: undefined,
		async onUpdated(content) {
			if (mainInput.value === content) {
				return;
			}

			mainInput.value = content;

			const res = await client.api.content.$post({
				json: {
					path: location.pathname,
					content,
				},
			});

			const json = await res.json();
			if (!json.saved) {
				// eslint-disable-next-line no-console
				console.error(`Failed to save: ${json.path}`);
				return;
			}

			// eslint-disable-next-line no-console
			console.log(`Saved: ${json.path}`);
		},
		fileIO: {
			async getFileList(fileType, options) {
				const res = await client.api.file.list.$post({
					json: {
						type: fileType,
						filter: options.filter,
						page: options.page,
						selected: options.selected,
					},
				});
				return await res.json();
			},
			async postFile(fileType, file, progress) {
				const res = await $upload(client.api.file.upload)(
					{
						type: fileType,
						file,
					},
					progress,
				);
				return res;
			},
			async deleteFile(fileType, url) {
				const res = await client.api.file.$delete({
					json: {
						type: fileType,
						url,
					},
				});
				return await res.json();
			},
		},
	});
}
