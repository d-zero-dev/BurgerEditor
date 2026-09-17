import type { BurgerEditorEngineOptions } from '@burger-editor/core';

import { BurgerEditorEngine } from '@burger-editor/core';
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { BurgerEditorRoot } from './burger-editor-root.js';
import { registerEngineCommands } from './commands/register-engine-commands.js';
import { DraftSwitcher } from './components/draft-switcher.js';
import { EngineProvider } from './engine-context.js';
import { reactMount } from './mount.js';
import { RootErrorBoundary } from './root-error-boundary.js';
import { createReactView } from './view/create-react-view.js';

import './style/ui.css';

export const version = __VERSION__;

/**
 * 本稿⇄下書き切替UIをビューエリアの直前にマウントする
 *
 * `createBurgerEditorClient` に含めず分離しているのは、配置位置
 * （エディタの外側のどこに置くか）がアプリケーション側の判断のため。
 * 単一rootの対象外（`engine.viewArea`の外側、任意のDOM位置に置かれる
 * ため）: `createReactView()`が持つ単一rootとは別の独立したReact root
 * を持つが、`EngineProvider`で包むため`DraftSwitcher`自体は
 * `useEngine()`で取得する（propsは受け取らない）。
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
		return reactMount(
			<EngineProvider engine={engine}>
				<RootErrorBoundary>
					<DraftSwitcher />
				</RootErrorBoundary>
			</EngineProvider>,
			container,
		);
	}

	return null;
}

/**
 * BurgerEditorのクライアントUIを組み立てるメインエントリ
 *
 * headlessなエンジンを生成し、React製のUI（編集エリア・ブロックメニュー・
 * 初期挿入ボタン・ダイアログ群）とエンジン操作コマンドのディスパッチ
 * テーブルを配線する。エンジンへのUI注入点は `view` ひとつで、この関数が
 * React実装を供給するためオプションから除外している。
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
	options: Omit<BurgerEditorEngineOptions, 'view'>,
) {
	// `view`への参照を保持し、engine構築後に同じrootへダイアログ群を
	// 追い足す（`ReactView.mountChrome`）。`createAreaHost`は
	// `BurgerEditorEngine.new()`の内部（engineがこの関数に返る前）で
	// 呼ばれるため、単一rootの生成自体はそちら側が担う
	const view = createReactView();
	const engine = await BurgerEditorEngine.new({
		...options,
		view,
		// wrapperElement/experimental.textOnlyModeがdocument単位で共有される
		// 前提のWhy notはdefineBgeWysiwygEditorElementのJSDoc参照
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

	// ダイアログ群をエンジンのUI状態ストアから宣言的にレンダリングする。
	// `view`の単一rootが`EngineProvider`/`RootErrorBoundary`で既に包んで
	// いるため、ここではchrome本体のみ渡す。破棄は`view`
	// （`engine.#disposables`が既に所有）に任せてよい
	view.mountChrome(<BurgerEditorRoot />);

	return {
		engine,
	};
}

export { Migrator } from '@burger-editor/migrator';
export { getConfig } from './get-config.js';
