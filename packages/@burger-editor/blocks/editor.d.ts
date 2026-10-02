import type { ItemSeed } from '@burger-editor/core';

/**
 * 標準アイテムの定義に React の `Editor` を合成したもの。ブラウザ専用。
 *
 * `react` / `react-dom`（peerDependencies）と `@burger-editor/client/ui` を
 * 必要とするため、Node.js 側（`file-io` / `cli` や設定ファイル）からは
 * import しない。そちらは `@burger-editor/blocks` の `items` を使う。
 * @example
 * ```ts
 * import { generalCSS } from '@burger-editor/blocks';
 * import { items } from '@burger-editor/blocks/editor';
 * import { createBurgerEditorClient } from '@burger-editor/client';
 *
 * const { engine } = await createBurgerEditorClient({
 * 	root: '#editor',
 * 	config,
 * 	catalog,
 * 	items,
 * 	generalCSS,
 * });
 * ```
 */
declare const items: Record<string, ItemSeed>;
