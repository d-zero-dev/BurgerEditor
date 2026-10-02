import type { BlockCatalog, ItemSeed } from '@burger-editor/core';

declare const defaultCatalog: BlockCatalog;
declare const legacyCatalog: BlockCatalog;

/**
 * 標準アイテムの定義（`Editor` を含まない）。
 *
 * Node.js（`file-io` / `cli` / `mcp-server`）とユーザーの設定ファイルから
 * 読み込めるよう React に依存しない。エディタ UI（ブラウザ）に渡す、`Editor`
 * 付きの定義は `@burger-editor/blocks/editor` の `items` を使う。
 * @example
 * ```ts
 * import { items } from '@burger-editor/blocks';
 *
 * const names = Object.keys(items); // ['button', 'details', ...]
 * ```
 */
declare const items: Record<string, ItemSeed>;

declare const generalCSS: string;
