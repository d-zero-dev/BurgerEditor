# @burger-editor/file-io

Node.js 側のファイル I/O 集約パッケージです。`@burger-editor/local`（ブラウザ UI を伴う CMS サーバー）と `@burger-editor/cli` / `@burger-editor/mcp-server`（AI エージェント向けの非対話レイヤー）の双方が共有して使います。

## 何が入っているか

| 機能                                                                                            | エントリ                                                                                                         |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `burgereditor.config.*` ローダー（cosmiconfig ラッパー、親ディレクトリへ walk-up）              | `resolveConfig(searchFrom?)` / `clearConfigCache()`                                                              |
| ページ HTML の読み書き（Front Matter + 編集可能領域 + prettier フォーマット）                   | `loadContent(...)` / `saveContent(...)` / `FileNotFoundError`                                                    |
| ディスク上のディレクトリツリーから HTML ファイルツリーを構築                                    | `generateFileTree(dir)` / `buildFileTreeFromLogicalPaths(input)`                                                 |
| 仮想（論理）パス ↔ 実ファイル名のリゾルバ（`virtualTree.enabled: true` 時）                     | `loadResolverState(documentRoot, pathKey)` 他、`registerEntry` / `setLogicalPath` / `toDiskPath` / `listEntries` |
| ユーザー入力（実パス / 仮想パス / 末尾スラッシュ等）を documentRoot 配下の絶対パスに正規化      | `resolvePathInput(input, config, resolverState)`                                                                 |
| jsdom-backed DOM の **遅延** インストール（`@burger-editor/core` を Node から使えるようにする） | side-effect import + `ensureDom()`                                                                               |

## インストール

```bash
yarn add @burger-editor/file-io
```

`@burger-editor/core` と `@burger-editor/blocks` を peer 的に必要とします（同モノレポでは workspace 解決）。

## 使用例

### 設定の解決

```ts
import { resolveConfig } from '@burger-editor/file-io';

const { config, configPath } = await resolveConfig();
// config: BurgerEditorConfig（documentRoot, editableArea, catalog, virtualTree, ...）
// configPath: 解決された burgereditor.config.{js,mjs,ts,cjs,json} の絶対パス、なければ null
```

`resolveConfig()` は cosmiconfig の `searchStrategy: 'project'` を使い、`searchFrom`（既定: `process.cwd()`）から親方向に walk-up します。サブディレクトリから CLI / MCP を起動しても、プロジェクトルートの設定が見つかります。

### ページの読み書き

```ts
import {
	loadContent,
	saveContent,
	FileNotFoundError,
	NoEditableAreaError,
} from '@burger-editor/file-io';
import { NoEditableAreaError as _CoreErr } from '@burger-editor/core'; // 同一クラスを core 経由でも import 可

const result = await loadContent(filePath, '.content', '<div class="content"></div>');
if (result instanceof NoEditableAreaError) {
	// editableArea が selector としてマッチしなかった
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

**注意**：

- `loadContent` はファイルが存在しないとき `newFileContent`（第 3 引数）で新規作成します。**source 側でこの自動生成が望ましくないケースでは、呼び出し前に `fs.access` で存在を確認してください**（例：`pageConcat` の source path）。
- `saveContent` は外部でファイルが削除されていた場合 `FileNotFoundError` を投げます（race 検知）。
- 編集可能領域セレクターがマッチしないとき `saveContent` は `NoEditableAreaError` を投げます。**フルドキュメント / fragment の双方で同じ挙動**です（v4.0.0-alpha.65 から。それ以前のフルドキュメントは body に silent fallback していました）。

### 仮想ツリー

```ts
import { loadResolverState, toDiskPath } from '@burger-editor/file-io';

const state = await loadResolverState(documentRoot, 'path');
// state.diskToLogical: Map<'42.html', 'foo/bar/about.html'>
// state.logicalToDisk: 逆引き

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

リーディングスラッシュ `/` は **OS ルートではなく** documentRoot 直下として扱われます。AI エージェントが `/about.html` と書いたとき「about ページ」を意図することがほぼ確実なため。

## dom-shim — 遅延 DOM

`./index.js` を import すると副作用として `globalThis` に jsdom-backed `document` / `DOMParser` / `HTMLElement` 等のアクセサが**遅延**インストールされます。最初にこれらにアクセスがあった時点で初めて JSDOM が構築されるため、DOM を触らない CLI コマンド（`catalog-list` 等）は JSDOM のセットアップコストを払いません。

vitest の `jsdom` 環境下では `globalThis.document` が既に存在するため shim は no-op になります（テスト環境の DOM を壊しません）。

## 開発

```bash
# このパッケージのビルドのみ
npx lerna run build --scope @burger-editor/file-io

# モノレポ全体のビルド（推奨）
yarn build

# テスト（vitest default project）
npx vitest run --project default packages/@burger-editor/file-io/
```

## 関連パッケージ

- [@burger-editor/core](../core/) — block-ops と Front Matter / HTML detection の本体（platform-agnostic）
- [@burger-editor/blocks](../blocks/) — `resolveConfig()` の `catalog` フォールバックに使う `defaultCatalog` の供給元
- [@burger-editor/local](../local/) — Hono ベースの CMS サーバーが file-io をフロントエンドにする
- [@burger-editor/cli](../cli/) — AI エージェント向け CLI が file-io を使う
- [@burger-editor/mcp-server](../mcp-server/) — MCP ツールが CLI 経由で file-io を使う

## 参照

- cosmiconfig: https://github.com/cosmiconfig/cosmiconfig — `searchStrategy: 'project'` の挙動は v9 から
- jsdom: https://github.com/jsdom/jsdom — DOM 実装
- gray-matter: https://github.com/jonschlinkert/gray-matter — Front Matter パーサー（core 経由）
- prettier: https://prettier.io/docs/options — `saveContent` で HTML 整形に使用

**検索キーワード**：「cosmiconfig searchStrategy project not found」「jsdom DOMParser ESM」「prettier html parser」

## メンテナンス責任

- 設定スキーマ（`BurgerEditorConfig`）の追加 → `src/types.ts` を更新し、`local/src/types.ts` の `LocalKeys` も明示追加
- 新 fs 操作の追加 → 必ず `edit-content.spec.ts` か新規 spec でカバー
- DOMParser / jsdom の差し替え検討時は dom-shim のテストを起点に互換性確認

## License

Dual Licensed under MIT OR Apache-2.0
