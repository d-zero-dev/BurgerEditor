# `@burger-editor/file-io`

Node 側のファイル I/O 集約パッケージ。`@burger-editor/local`（ブラウザ UI 付き CMS サーバー）と `@burger-editor/cli` / `@burger-editor/mcp-server`（AI エージェント向け非対話レイヤー）が**共有**して使う。

## Installation

```sh
yarn add @burger-editor/file-io
```

`@burger-editor/core` と `@burger-editor/blocks` を peer 依存。

## 提供する機能

- `resolveConfig(searchFrom?)` / `clearConfigCache()` — `burgereditor.config.*` の解決
- `loadContent(...)` / `saveContent(...)` / `FileNotFoundError` — ページ HTML の読み書き（Front Matter + editableArea + prettier）
- `generateFileTree(dir)` / `buildFileTreeFromLogicalPaths(input)` — HTML ファイルツリー構築
- `loadResolverState(...)` 他 — 仮想（論理）パス ↔ 実ファイル名のリゾルバ（`virtualTree.enabled: true` 時）
- `resolvePathInput(input, config, resolverState)` — ユーザー入力（実 / 仮想パス）を documentRoot 配下の絶対パスに正規化
- side-effect import + `ensureDom()` — jsdom-backed DOM の遅延インストール

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
- editableArea セレクタ不一致時は `NoEditableAreaError`。**フルドキュメント / fragment 共通の挙動**（v4.0.0-alpha.65 以降、それ以前はフルドキュメントは body に silent fallback していた）

## メンテナンス責任

- 設定スキーマ追加 → `src/types.ts` を更新し、`local/src/types.ts` の `LocalKeys` も明示追加
- 新 fs 操作 → `edit-content.spec.ts` か新規 spec でカバー
- DOMParser / jsdom 差し替え検討時は dom-shim テストを起点に互換性確認

## License

Dual Licensed under MIT OR Apache-2.0
