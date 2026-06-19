# `@burger-editor/file-io`

Node 側のファイル I/O 集約パッケージ。`@burger-editor/local`（ブラウザ UI 付き CMS サーバー）と `@burger-editor/cli` / `@burger-editor/mcp-server`（AI エージェント向け非対話レイヤー）が**共有**して使う。

## Installation

```sh
yarn add @burger-editor/file-io
```

`@burger-editor/core` と `@burger-editor/blocks` を peer 依存。

## Related Packages

| パッケージ                                    | 関係                                                | 使い分け                                       |
| --------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| [`@burger-editor/core`](../core/)             | ブロック仕様の定義元（peer 依存）                   | file-io 単独不可                               |
| [`@burger-editor/blocks`](../blocks/)         | 標準カタログ（peer 依存）                           | file-io 単独不可                               |
| [`@burger-editor/local`](../local/)           | ブラウザ UI 付き CMS サーバー。file-io を利用       | 通常の編集はこちら経由（file-io は内包される） |
| [`@burger-editor/cli`](../cli/)               | AI エージェント／スクリプト向け CLI。file-io を利用 | スクリプト経由のバッチ編集はこちら経由         |
| [`@burger-editor/mcp-server`](../mcp-server/) | MCP プロトコル経由の操作。file-io を利用            | AI エージェント統合はこちら経由                |

## 提供する機能

| 機能                                                                                            | エントリ                                                                                                         |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `burgereditor.config.*` ローダー（cosmiconfig ラッパー、親ディレクトリへ walk-up）              | `resolveConfig(searchFrom?)` / `clearConfigCache()`                                                              |
| ページ HTML の読み書き（Front Matter + editableArea + prettier）                                | `loadContent(...)` / `saveContent(...)` / `FileNotFoundError` / `NoEditableAreaError`                            |
| ディスク上のディレクトリツリーから HTML ファイルツリーを構築                                    | `generateFileTree(dir)` / `buildFileTreeFromLogicalPaths(input)`                                                 |
| 仮想（論理）パス ↔ 実ファイル名のリゾルバ（`virtualTree.enabled: true` 時）                     | `loadResolverState(documentRoot, pathKey)` 他、`registerEntry` / `setLogicalPath` / `toDiskPath` / `listEntries` |
| ユーザー入力（実パス / 仮想パス / 末尾スラッシュ等）を documentRoot 配下の絶対パスに正規化      | `resolvePathInput(input, config, resolverState)`                                                                 |
| jsdom-backed DOM の **遅延** インストール（`@burger-editor/core` を Node から使えるようにする） | side-effect import + `ensureDom()`                                                                               |

## 使用例

### 設定の解決

```ts
import { resolveConfig } from '@burger-editor/file-io';

const { config, configPath } = await resolveConfig();
// config: BurgerEditorConfig（documentRoot, editableArea, catalog, virtualTree, ...）
// configPath: 解決された burgereditor.config.{js,mjs,ts,cjs,json} の絶対パス、なければ null
```

### ページの読み書き

```ts
import { loadContent, saveContent, FileNotFoundError } from '@burger-editor/file-io';
import { NoEditableAreaError } from '@burger-editor/core';

const result = await loadContent(filePath, '.content', '<div class="content"></div>');
if (result instanceof NoEditableAreaError) {
	// editableArea セレクタが一致しなかった
} else {
	// result: { editableContent, frontMatter, originalFrontMatter, hasFrontMatter }
	await saveContent(
		filePath,
		'<p>updated</p>',
		'.content',
		result.frontMatter,
		result.originalFrontMatter,
	);
}
```

### 仮想ツリー

```ts
import { loadResolverState, toDiskPath } from '@burger-editor/file-io';

const state = await loadResolverState(documentRoot, 'path');
// state.diskToLogical: Map<'42.html', 'foo/bar/about.html'>
// state.logicalToDisk: 逆引き Map

const diskFile = toDiskPath(state, 'foo/bar/about.html'); // → '42.html' or null
```

### パス正規化

```ts
import { resolvePathInput } from '@burger-editor/file-io';

resolvePathInput('about.html', config, null); // → <documentRoot>/about.html
resolvePathInput('/about.html', config, null); // → <documentRoot>/about.html（web-style）
resolvePathInput('/foo/', config, null); // → <documentRoot>/foo/index.html
resolvePathInput('foo/bar.html', config, state); // virtualTree 有効時は state を引いて実ファイル名へ
```

## 重要な設計判断

### Shared by local / cli / mcp-server

fs を触る全パッケージの共通フロントエンド。**同じ config / 同じパス解釈 / 同じ Front Matter パーサ**を共有することで、ブラウザ UI 経由の編集と AI エージェント経由の編集が必ず一致する。

### 遅延 DOM インストール

`./index.js` を import すると `globalThis.document` / `DOMParser` 等の**アクセサだけ**が置かれる。最初のアクセスで初めて JSDOM を構築するため、DOM 不要な CLI コマンド（`catalog-list` 等）は JSDOM コストを払わない。vitest の `jsdom` 環境下では `globalThis.document` が既に存在するため shim は no-op。

### cosmiconfig `searchStrategy: 'project'`

サブディレクトリから CLI / MCP を起動しても、プロジェクトルートの設定が見つかる（cosmiconfig v9+ の挙動）。

### Leading `/` は documentRoot 直下

`resolvePathInput('/about.html', ...)` は OS ルートではなく documentRoot 直下を返す。AI エージェントが `/about.html` と書いたとき「about ページ」を意図することがほぼ確実なため。

### `loadContent` / `saveContent` の挙動

- `loadContent` はファイル不在時 `newFileContent` で新規作成する。自動生成が望ましくないケース（例: `pageConcat` の source path）では呼び出し前に `fs.access` で確認する
- `saveContent` は外部削除を `FileNotFoundError` で検知（race）
- editableArea セレクタ不一致時は `NoEditableAreaError`。**フルドキュメント / fragment 共通の挙動**

## メンテナンス責任

- 設定スキーマ追加 → `src/types.ts` を更新し、`local/src/types.ts` の `LocalKeys` も明示追加
- 新 fs 操作 → `edit-content.spec.ts` か新規 spec でカバー
- DOMParser / jsdom 差し替え検討時は dom-shim テストを起点に互換性確認

## License

Dual Licensed under MIT OR Apache-2.0
