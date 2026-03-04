import type { BurgerEditorEngineOptions } from '@burger-editor/core';

import { BurgerEditorEngine } from '@burger-editor/core';
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

import BlockCatalog from './block-catalog.svelte';
import BlockMenu from './block-menu.svelte';
import BlockOptions from './block-options.svelte';
import DraftSwitcher from './draft-switcher.svelte';
import FileList from './file-list.svelte';
import FileUploader from './file-uploader.svelte';
import InitialInsertionButton from './initial-insertion-button.svelte';
import Preview from './preview.svelte';
import { svelteMount } from './svelte-mount.js';
import TableEditor from './table-editor.svelte';
import Tabs from './tabs.svelte';

import './style/ui.css';

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
		initialInsertionButton: (container, onInsert) => {
			return svelteMount(InitialInsertionButton, {
				target: container,
				props: {
					onInsert,
				},
			});
		},
		blockMenu: (container, engine) => {
			const { cleanUp } = svelteMount(BlockMenu, {
				target: container,
				props: {
					engine,
					onHide: () => engine.clearCurrentBlock(),
				},
			});

			return {
				hide: () => engine.clearCurrentBlock(),
				cleanUp,
			};
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
			tabs: (el, engine) => {
				const contentId = el.dataset.bgeEditorUiFor;
				if (!contentId) {
					throw new Error('Tab UI component requires contentId attribute');
				}

				return svelteMount(Tabs, {
					target: el,
					props: {
						engine,
						contentId,
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
		defineCustomElement(context) {
			defineBgeWysiwygEditorElement({
				wrapperElement: {
					className: context.className ?? '',
				},
				experimental: context.experimental?.itemOptions?.wysiwyg?.enableTextOnlyMode
					? {
							textOnlyMode: context.experimental.itemOptions.wysiwyg.enableTextOnlyMode,
						}
					: undefined,
			});
		},
	});

	return {
		engine,
	};
}

export { Migrator } from '@burger-editor/migrator';
export { getConfig } from './get-config.js';
