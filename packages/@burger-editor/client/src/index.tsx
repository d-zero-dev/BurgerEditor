import type { BurgerEditorEngineOptions } from '@burger-editor/core';

import { BurgerEditorEngine } from '@burger-editor/core';
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { BurgerEditorRoot } from './react/burger-editor-root.js';
import { registerEngineCommands } from './react/commands/register-engine-commands.js';
import { BlockMenu } from './react/components/block-menu.js';
import { DraftSwitcher } from './react/components/draft-switcher.js';
import { InitialInsertionButton } from './react/components/initial-insertion-button.js';
import { reactMount } from './react/mount.js';

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
		return reactMount(<DraftSwitcher engine={engine} />, container);
	}

	return null;
}

/**
 *
 * @param options
 */
export async function createBurgerEditorClient(
	options: Omit<BurgerEditorEngineOptions, 'blockMenu' | 'initialInsertionButton'>,
) {
	const engine = await BurgerEditorEngine.new({
		...options,
		initialInsertionButton: (container) => {
			return reactMount(<InitialInsertionButton />, container);
		},
		blockMenu: (container, engine) => {
			const { cleanUp } = reactMount(
				<BlockMenu
					engine={engine}
					container={container}
					onHide={() => engine.clearCurrentBlock()}
				/>,
				container,
			);

			return {
				hide: () => engine.clearCurrentBlock(),
				cleanUp,
			};
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

	// エンジン操作コマンドの中央ディスパッチテーブルを登録する
	registerEngineCommands(engine, options.catalog);

	// ダイアログ群をエンジンのUI状態ストアから宣言的にレンダリングする
	const dialogHost = document.createElement('div');
	dialogHost.dataset.bgeComponent = 'dialog-host';
	engine.el.append(dialogHost);
	reactMount(<BurgerEditorRoot engine={engine} />, dialogHost);

	return {
		engine,
	};
}

export { Migrator } from '@burger-editor/migrator';
export { getConfig } from './get-config.js';
