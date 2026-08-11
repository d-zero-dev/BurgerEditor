# `@burger-editor/mcp-server`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fmcp-server.svg)](https://badge.fury.io/js/@burger-editor%2Fmcp-server)

AI クライアント（Claude Desktop / Claude Code / Cursor / Cline 等）から自然言語で BurgerEditor v4 プロジェクトを操作するための MCP (Model Context Protocol) サーバー。stdio トランスポートで起動し、`burgereditor.config.{js,mjs,ts,cjs,json}` が見つかるディレクトリ階層内のページ・ブロック・Front Matter を読み書きする v4 ツール 24 個と v3 互換ツール 3 個を公開する。

v4 ツールは [`@burger-editor/cli`](../cli/) のハンドラを直接ラップして公開している（CLI と MCP で同じパス）。

## Quick Start

3 行で接続:

1. プロジェクトに `burgereditor.config.js` が存在することを確認（[`@burger-editor/local`](../local/#quick-start) の最小例で十分）
2. AI クライアントの MCP 設定に下記スニペット（クライアント別は後述）を追加
3. AI クライアントを再起動して「`about.html` のページツリーを見せて」と話しかける

最小設定（Claude Desktop の場合）:

```json
{
	"mcpServers": {
		"burger-editor": {
			"command": "npx",
			"args": ["-y", "@burger-editor/mcp-server"]
		}
	}
}
```

**バイナリ名**: 4.0.0-alpha.68 以降、bin は **`bge-mcp-server` のみ** 公開しています。汎用名の `mcp-server` を bin 化すると `node_modules/.bin/` や global PATH 上で他の MCP server パッケージと衝突するため、独自プレフィクス付きの 1 名のみに絞っています。`npx @burger-editor/mcp-server` でこの bin が呼ばれます（npm は single-bin パッケージを名前不問で実行する仕様）。global install 後に `bge-mcp-server` コマンドとしても叩けます。

## Related Packages

| パッケージ                                             | 役割                                              | CLI vs MCP の使い分け                                                         |
| ------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`@burger-editor/mcp-server`](./) **（本パッケージ）** | MCP サーバー（AI クライアント向けインタフェース） | 自然言語で操作したいとき / AI クライアントから叩くとき                        |
| [`@burger-editor/cli`](../cli/)                        | 非対話 CLI（JSON-only stdout）                    | パイプライン・スクリプト統合・人間が直接叩く・CI 組み込み                     |
| [`@burger-editor/local`](../local/)                    | ブラウザ UI + HTTP サーバー                       | 編集者が GUI で操作するとき。MCP / CLI と同じ `burgereditor.config.js` を共有 |
| [`@burger-editor/core`](../core/)                      | エディタエンジン本体・カスタムアイテム実装基盤    | 独自ブロック / アイテムを実装するとき                                         |

## Installation

グローバルか npx 経由で使う:

```sh
yarn global add @burger-editor/mcp-server
# または npx -y @burger-editor/mcp-server
```

## AI クライアント別の接続設定

stdio トランスポートをサポートする任意の MCP クライアントで使用可能。代表例:

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`（macOS） / `%APPDATA%\Claude\claude_desktop_config.json`（Windows）:

```json
{
	"mcpServers": {
		"burger-editor": {
			"command": "npx",
			"args": ["-y", "@burger-editor/mcp-server"],
			"disabled": false,
			"autoApprove": []
		}
	}
}
```

### Claude Code

```sh
claude mcp add burger-editor -- npx -y @burger-editor/mcp-server
```

または `.claude/settings.json` に直接追記:

```json
{
	"mcpServers": {
		"burger-editor": {
			"command": "npx",
			"args": ["-y", "@burger-editor/mcp-server"]
		}
	}
}
```

### Cursor

`.cursor/mcp.json`（プロジェクトルート、なければ作成）:

```json
{
	"mcpServers": {
		"burger-editor": {
			"command": "npx",
			"args": ["-y", "@burger-editor/mcp-server"]
		}
	}
}
```

### Cline

VS Code 設定の `cline.mcpServers` に同じ shape で追記:

```json
{
	"burger-editor": {
		"command": "npx",
		"args": ["-y", "@burger-editor/mcp-server"]
	}
}
```

## プログラムからの起動

```ts
import { run } from '@burger-editor/mcp-server';

await run();
```

## v3 互換ツール（3 個）

| ツール                     | パラメータ                         | 戻り値                                       |
| -------------------------- | ---------------------------------- | -------------------------------------------- |
| `get_block_type`           | なし                               | 一般的な v3 ブロックタイプの説明テキスト     |
| `get_block_data_params_v3` | `blockName: string`                | 指定ブロックが必要とするデータパラメータ一覧 |
| `create_block_v3`          | `blockName: string`, `data: array` | 生成済みの v3 ブロック HTML                  |

呼び出し例（Claude への自然言語指示）:

```
text-image ブロックを作成して。テキストは「ようこそ」、画像は「/images/welcome.jpg」、alt は「ようこそ画像」で。
```

Claude は自動的に `create_block_v3` を呼び出す。

## v4 ツール（24 個、うち高レベルヘルパー 2 個）

`burgereditor.config.{js,mjs,ts,cjs,json}` が見つかるディレクトリ階層内で動作する。実装本体は [`@burger-editor/cli`](../cli/) の `src/handlers.ts`。

### ページ操作（7）

| ツール        | 説明                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `page_list`   | documentRoot 配下のページツリー                                         |
| `page_get`    | Front Matter + 編集可能領域内容                                         |
| `page_create` | 新規ページ作成（atomic、初期ブロックを任意で受ける）                    |
| `page_delete` | ページ削除                                                              |
| `page_rename` | リネーム / 移動（失敗時に作成済みディレクトリを巻き戻す）               |
| `page_copy`   | 複製                                                                    |
| `page_concat` | 複数 source の編集可能領域を target に append（source は 1 つ以上必須） |

### Front Matter（2）

| ツール             | 説明                                                      |
| ------------------ | --------------------------------------------------------- |
| `front_matter_get` | Front Matter 取得                                         |
| `front_matter_set` | Front Matter 更新（既定 merge、`replace: true` で全置換） |

### ブロック操作（6）

書き込み系（`insert` / `replace` / `delete` / `move` / `duplicate_block`）は **`dryRun: true`** を受け付けます。ファイルを更新せず、`previewContent` に書き込まれるはずの HTML を入れて返します。

| ツール          | 説明                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `block_list`    | ブロックメタ + 構造化アイテムデータ                                                             |
| `block_get`     | 単一ブロック取得                                                                                |
| `block_insert`  | 指定 index に挿入。`dryRun` 対応                                                                |
| `block_replace` | 指定 index を置換。`dryRun` 対応                                                                |
| `block_delete`  | 指定 index を削除。`dryRun` 対応。**`deleted` フィールドは廃止**（v4.0.0-alpha.68 以降）        |
| `block_move`    | 移動。`to` は最終配列における index（splice 慣用）。`dryRun` 対応。**`moved` フィールドは廃止** |

### スキーマ参照（7）

| ツール                   | 説明                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `catalog_list`           | プロジェクトのブロックカタログ一覧                             |
| `catalog_get`            | 個別カタログエントリ取得                                       |
| `item_list`              | 標準アイテムとテンプレート一覧                                 |
| `item_schema`            | 個別アイテムのスキーマ（データキー推定用）                     |
| `style_options_list`     | プロジェクト CSS から抽出した `--bge-options-*` 軸とバリアント |
| `container_options_list` | grid / inline / float の静的オプション                         |
| `config_resolve`         | 解決済み `config` の要約                                       |

### 高レベルヘルパー（2）

| ツール            | 説明                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `duplicate_block` | block-get → block-insert の組み合わせ（id は自動で剥がれる）。`dryRun` 対応                                                                                                                                              |
| `update_page`     | insert / replace / delete / move をバッチ適用。シーケンシャル実行、ロールバックなし。**`dryRun` は非対応** — 各 op が前 op の書き込みに依存するため。プレビューしたければ個別の `block_*` ツールを `dryRun: true` で叩く |

### 起動時のログ（トラブルシューティング）

起動時に **stderr** に以下のフォーマットでログを出します（stdout は MCP プロトコル専用なので汚さない）:

```
[burger-editor mcp] starting (pid 12345)
[burger-editor mcp] ready on stdio (boot 8ms) — v3 + v4 tools registered
```

Claude Code / Claude Desktop / Cursor などの MCP host はサーバの stderr を自分のログに転送するので、ここを見ればサーバが立ち上がったか / どこで落ちたかを特定できます。起動失敗（モジュール読み込みエラー、ツール登録失敗、transport connect 失敗）は次の形で出ます:

```
[burger-editor mcp] FATAL: <message>
<stack trace>
```

`tools/list` が空になる症状（feedback #7）の主な原因は alpha.67 時点では bin path mismatch でした（`bge-mcp-server` の bin が指していたファイルが存在しなかった）。alpha.68 で `bge-mcp-server` の bin を実在ファイル `./bin/index.js` に向け、汎用名 `mcp-server` は他パッケージとの衝突を避けるため意図的に公開していません。`npx @burger-editor/mcp-server` は single-bin 仕様によりこの `bge-mcp-server` bin を実行します。

## 設計上の不変条件

- **JSON は text ペイロード内**: すべてのレスポンスは MCP の `text` content として返り、その文字列の中に `JSON.stringify` 済みデータが入る。MCP クライアント側で `JSON.parse` が必要
- **context は 1 回ロード**: `loadContext()`（cosmiconfig + virtualTree resolver scan）は MCP サーバープロセス内で初回呼び出し時に 1 回だけ実行され、以降の全ツール呼び出しで再利用される。テスト時のリセット用に `__resetV4ContextCache()` を export
- **エラーは throw しない**: 検証失敗・I/O 失敗は MCP の `{ isError: true }` payload として返る。throw して MCP セッションを落とさない
- **dryRun 契約**: dryRun=true のレスポンスは `{ ...args, dryRun: true, previewContent: "..." }` のみを含む。`deleted` / `moved` 等の imperative-tense フィールドは含まれない（旧 API では `deleted: !dryRun` が dryRun 成功を「失敗」と誤読させた）
- **NoEditableAreaError**: `editableArea` セレクタが外れた場合、エラーメッセージに「near root: #site-header, .content, .sidebar」のような candidate selector hint が付く（typo 復旧用）

## アーキテクチャ

```
┌─────────────────┐
│  AI Assistant   │  (Claude, etc.)
│   (MCP Client)  │
└────────┬────────┘
         │ MCP Protocol (stdio)
         │
┌────────▼────────┐
│  @burger-editor │
│   /mcp-server   │
└────────┬────────┘
         │
         ├─► @burger-editor/cli      (v4 tools の本体 — handlers を直接呼ぶ)
         │       │
         │       ├─► @burger-editor/file-io  (config / fs / virtual-path)
         │       └─► @burger-editor/core     (block-ops / Front Matter / HTML detection)
         │
         ├─► @burger-editor/core      (v3 互換)
         ├─► @burger-editor/legacy    (v3 互換)
         └─► @burger-editor/migrator  (v3 互換)
```

## トラブルシューティング

### サーバーが起動しない

1. Node.js のバージョンが本リポジトリ標準（`package.json` の `volta.node` を参照、Node 24.x 系）と一致しているか確認
2. パッケージが正しくインストールされているか確認:

```sh
npx @burger-editor/mcp-server --version
```

### AI クライアントがツールを認識しない

1. クライアントを完全に終了して再起動（Claude Desktop はメニューから Quit、Dock からも消えていることを確認）
2. 設定 JSON の構文が正しいか確認
3. `disabled: false` になっているか確認（Claude Desktop の場合）
4. プロジェクトルートに `burgereditor.config.{js,mjs,ts,cjs,json}` が存在するか確認

## 検索キーワード

トラブルシューティング / 仕様確認時に役立つ検索語:

- 「BurgerEditor MCP server dryRun preview」
- 「bge-mcp-server PATH collision」 — alpha.68 で汎用名 `mcp-server` の公開を取りやめ、`bge-mcp-server` のみに統一
- 「MCP catalog_get template field」
- 「BurgerEditor item_schema dataKeys」

## License

Dual Licensed under MIT OR Apache-2.0
