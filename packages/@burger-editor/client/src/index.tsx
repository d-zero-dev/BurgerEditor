import type { BurgerEditorEngineOptions } from '@burger-editor/core';

import { BurgerEditorEngine } from '@burger-editor/core';
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { BurgerEditorRoot } from './burger-editor-root.js';
import { registerEngineCommands } from './commands/register-engine-commands.js';
import { BlockMenu } from './components/block-menu.js';
import { DraftSwitcher } from './components/draft-switcher.js';
import { InitialInsertionButton } from './components/initial-insertion-button.js';
import { reactMount } from './mount.js';

import './style/ui.css';

export const version = __VERSION__;

/**
 * 本稿⇄下書き切替UIをビューエリアの直前にマウントする
 *
 * `createBurgerEditorClient` に含めず分離しているのは、配置位置
 * （エディタの外側のどこに置くか）がアプリケーション側の判断のため。
 * @param engine - 対象エンジン。下書きが無い構成では何もしない
 * @returns マウントハンドル（`cleanUp`でアンマウント）。下書きが無い場合はnull
 * @example
 * ```ts
 * const { engine } = await createBurgerEditorClient(options);
 * attachDraftSwitcher(engine);
 * ```
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
 * BurgerEditorのクライアントUIを組み立てるメインエントリ
 *
 * headlessなエンジンを生成し、React製のUI（ブロックメニュー・初期挿入
 * ボタン・ダイアログ群）とエンジン操作コマンドのディスパッチテーブルを
 * 配線する。`blockMenu`/`initialInsertionButton` はこの関数が供給する
 * ためオプションから除外している。
 * @param options - エンジンオプション（UI供給分を除く）
 * @returns 生成済みエンジンを含むハンドル
 * @example
 * ```ts
 * import { createBurgerEditorClient, attachDraftSwitcher } from '@burger-editor/client';
 * import itemSeeds from '@burger-editor/blocks';
 *
 * const { engine } = await createBurgerEditorClient({
 * 	root: '#editor',
 * 	config,
 * 	catalog,
 * 	items: itemSeeds,
 * 	initialContents: { main, draft },
 * 	generalCSS,
 * 	fileIO: serverAPI,
 * });
 * attachDraftSwitcher(engine);
 * ```
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
