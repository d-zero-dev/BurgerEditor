import type { BurgerEditorEngineOptions } from '@burger-editor/core';

import { BurgerEditorEngine } from '@burger-editor/core';

import BlockCatalog from './block-catalog.svelte';
import BlockMenu from './block-menu.svelte';
import BlockOptions from './block-options.svelte';
import DraftSwitcher from './draft-switcher.svelte';
import FileList from './file-list.svelte';
import FileUploader from './file-uploader.svelte';
import Preview from './preview.svelte';
import { svelteMount } from './svelte-mount.js';
import TableEditor from './table-editor.svelte';

import './style/ui.scss';

export const version = __VERSION__;

/**
 *
 * @param engine
 */
export function attachDraftSwitcher(engine: BurgerEditorEngine) {
	if (engine.hasDraft()) {
		const container = document.createElement('div');
		container.dataset.bgeComponent = 'draft-switcher';
		engine.viewArea.insertAdjacentElement('beforebegin', container);
		return svelteMount(DraftSwitcher, {
			target: container,
			props: {
				engine,
			},
		});
	}

	return null;
}

/**
 *
 * @param options
 */
export async function createBurgerEditorClient(
	options: Omit<BurgerEditorEngineOptions, 'ui' | 'blockMenu'>,
) {
	const engine = await BurgerEditorEngine.new({
		...options,
		blockMenu: (el, engine) => {
			return svelteMount(BlockMenu, {
				target: el,
				props: {
					engine,
				},
			});
		},
		ui: {
			blockCatalog: (el, engine) => {
				return svelteMount(BlockCatalog, {
					target: el,
					props: {
						engine,
					},
				});
			},
			blockOptions: (el, engine) => {
				return svelteMount(BlockOptions, {
					target: el,
					props: {
						engine,
					},
				});
			},
			imageList: (el, engine) => {
				return svelteMount(FileList, {
					target: el,
					props: {
						engine,
						fileType: 'image',
					},
				});
			},
			fileList: (el, engine) => {
				return svelteMount(FileList, {
					target: el,
					props: {
						engine,
						fileType: 'other',
					},
				});
			},
			imageUploader: (el, engine) => {
				return svelteMount(FileUploader, {
					target: el,
					props: {
						engine,
						fileType: 'image',
					},
				});
			},
			fileUploader: (el, engine) => {
				return svelteMount(FileUploader, {
					target: el,
					props: {
						engine,
						fileType: 'other',
					},
				});
			},
			preview: (el, engine) => {
				return svelteMount(Preview, {
					target: el,
					props: {
						engine,
					},
				});
			},
			tableEditor: (el, engine) => {
				return svelteMount(TableEditor, {
					target: el,
					props: {
						engine,
					},
				});
			},
		},
	});

	return {
		engine,
	};
}

export { Migrator } from '@burger-editor/migrator';
export { getConfig } from './get-config.js';
