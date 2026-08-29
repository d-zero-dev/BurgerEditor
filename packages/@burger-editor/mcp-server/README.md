# `@burger-editor/mcp-server`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fmcp-server.svg)](https://badge.fury.io/js/@burger-editor%2Fmcp-server)

AI クライアント（Claude Desktop / Claude Code / Cursor / Cline 等）から自然言語で BurgerEditor v4 プロジェクトを操作するための MCP (Model Context Protocol) サーバー。stdio トランスポートで起動し、`burgereditor.config.{js,mjs,ts,cjs,json}` が見つかるディレクトリ階層内のページ・ブロック・Front Matter を読み書きする AI エージェント向けツール 28 個と v3 互換ツール 3 個を公開する。

エージェント向けツールの定義は [`@burger-editor/cli`](../cli/) の `src/agent-tools/tools/*.ts` に一本化されており、mcp-server はその `agentTools` 配列を登録するだけ（`src/register-agent-tools.ts`）。`@burger-editor/local` の開発サーバーが起きていればツール呼び出しをそこへ転送し、開いているブラウザタブに直接適用する。起きていなければディスクに直接適用する（後述の `--mode`）。

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

## 起動オプション

| フラグ   | 環境変数          | 既定値                  | 説明                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ----------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--mode` | `BGE_MCP_MODE`    | `auto`                  | `auto` … `local` の `GET /api/agent/status` を探索し、応答があれば転送、無ければディスクに直接適用（セッション中の起動・停止にも追従）。`local` … 転送のみ（到達不能なら `local-unreachable` エラー）。`disk` … 探索せず常にディスク                                                                                                                  |
| `--url`  | `BGE_LOCAL_URL`   | `http://localhost:5255` | 転送先の `@burger-editor/local` の URL                                                                                                                                                                                                                                                                                                                |
| —        | `BGE_AGENT_TOKEN` | なし                    | `local` が非ループバックアドレス（LAN IP / `0.0.0.0`）に bind されているときだけ意味を持つ。未設定なら `<configDir>/.burgereditor/agent-token`（`local` が書く起動ごとのトークン）を自動で読むので、同一マシンなら設定不要。別マシンの `local` に繋ぐときや値を明示したいときに起動バナーのトークンを設定する。`Authorization: Bearer` として送られる |

CLI フラグは環境変数より優先される。ループバック（`localhost` / `127.0.0.1` / `::1`）に bind された `local` にはトークン不要。

```json
{
	"mcpServers": {
		"burger-editor": {
			"command": "npx",
			"args": ["-y", "@burger-editor/mcp-server", "--mode", "local"],
			"env": { "BGE_LOCAL_URL": "http://localhost:5255" }
		}
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

## AI エージェント向けツール（28 個）

`burgereditor.config.{js,mjs,ts,cjs,json}` が見つかるディレクトリ階層内で動作する。定義の正は [`@burger-editor/cli`](../cli/) の `src/agent-tools/tools/*.ts`（説明・入力スキーマ・annotations）。「readToken」列が✓のツールは、直前にそのページを読んだときの `readToken` を渡さないと `read-required` / `stale` で失敗する（契約の詳細は [`skills/burger-editor-v4/SKILL.md`](../../../skills/burger-editor-v4/SKILL.md) と `cli/src/agent-tools/read-token.ts` の JSDoc）。

### ページ操作

| ツール        | 説明                                                                                                          | readToken |
| ------------- | ------------------------------------------------------------------------------------------------------------- | :-------: |
| `page_list`   | documentRoot 配下のページツリー（`invalidPages` 付き）                                                        |           |
| `page_get`    | Front Matter + 編集可能領域の生コンテンツ                                                                     |           |
| `page_blocks` | 全ブロックの要約一覧。1 回目は件数 + `readToken`、同じ `readToken` を渡した 2 回目で一覧を返す 2 段プロトコル |     ✓     |
| `page_create` | 新規ページ作成（atomic、初期ブロック任意）。対象が未存在なので readToken 不要。宛先が既存なら `exists`        |           |
| `page_delete` | ページ削除                                                                                                    |     ✓     |
| `page_rename` | リネーム / 移動。宛先が既存なら `exists`（上書きしない）                                                      |     ✓     |
| `page_copy`   | 複製。宛先が既存なら `exists`                                                                                 |     ✓     |
| `page_concat` | 複数 source の編集可能領域を `to` に append。source は 1 つ以上必須、各 source（と既存の `to`）に readToken   |     ✓     |

### Front Matter

| ツール             | 説明                                                      | readToken |
| ------------------ | --------------------------------------------------------- | :-------: |
| `front_matter_get` | Front Matter 取得                                         |           |
| `front_matter_set` | Front Matter 更新（既定 merge、`replace: true` で全置換） |     ✓     |

### ブロック操作

ブロックは `target: { index }`（並び順）または `target: { id }`（`block_ensure_id` で付与した安定 id）で指す。書き込み系は `dryRun: true` を受け付け、書き込まずに `diff: { before, after }` を返す。

| ツール            | 説明                                                                                                       | readToken |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | :-------: |
| `block_get`       | 単一ブロック（`data` / `html`）取得                                                                        |     ✓     |
| `block_insert`    | 指定 index に spec から生成したブロックを挿入                                                              |     ✓     |
| `block_replace`   | target のブロックを spec で置換                                                                            |     ✓     |
| `block_delete`    | target のブロックを削除                                                                                    |     ✓     |
| `block_move`      | 移動。`to` は最終配列における index（splice 慣用）                                                         |     ✓     |
| `block_duplicate` | target の複製を直後に挿入（複製側の id は付かない）                                                        |     ✓     |
| `block_ensure_id` | id を持たないブロックに `bge-<n>` を付与（idempotent）                                                     |     ✓     |
| `item_update`     | ブロック内の 1 アイテムのデータにマージ（省略フィールドは維持）                                            |     ✓     |
| `page_update`     | レンダリング済み `blockHtml` を使う `BlockOp[]` を順次適用。全 op 成功時のみ 1 回で保存する all-or-nothing |     ✓     |

### スキーマ参照

| ツール                   | 説明                                                           | readToken |
| ------------------------ | -------------------------------------------------------------- | :-------: |
| `catalog_list`           | プロジェクトのブロックカタログ一覧                             |           |
| `catalog_get`            | 個別カタログエントリ（そのまま spec に渡せる `template` 付き） |           |
| `item_list`              | 標準アイテム名一覧                                             |           |
| `item_schema`            | 個別アイテムの template + camelCase `dataKeys`                 |           |
| `style_options_list`     | プロジェクト CSS から抽出した `--bge-options-*` 軸とバリアント |           |
| `container_options_list` | grid / inline / float の静的オプション                         |           |
| `config_resolve`         | 解決済み `config` の要約                                       |           |

### エディタ状態（`local` 連携）

| ツール                  | 説明                                                                                                                | readToken |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | :-------: |
| `editor_state_get`      | 開いているエディタタブとその状態（mode / revision / uiState）。`local` に到達できないときは空の `sessions` を返す   |           |
| `editor_wait_for_event` | エディタイベント（ui-state 変化・保存・ページイベント）を long-poll。`local` 必須 — 到達できないと `local-required` |           |

### 起動時のログ（トラブルシューティング）

起動時に **stderr** に以下のフォーマットでログを出します（stdout は MCP プロトコル専用なので汚さない）:

```
[burger-editor mcp] starting (pid 12345, mode=auto, url=http://localhost:5255)
[burger-editor mcp] ready on stdio (boot 8ms) — v3 + agent tools registered
```

Claude Code / Claude Desktop / Cursor などの MCP host はサーバの stderr を自分のログに転送するので、ここを見ればサーバが立ち上がったか / どこで落ちたかを特定できます。起動失敗（不正な `--mode`、モジュール読み込みエラー、ツール登録失敗、transport connect 失敗）は次の形で出ます:

```
[burger-editor mcp] FATAL during startup: <message>
<stack trace>
```

`tools/list` が空になる場合は、`bge-mcp-server` bin が実在ファイルを指しているか（`npx @burger-editor/mcp-server --version`）を確認してください。汎用名 `mcp-server` は他パッケージとの衝突を避けるため意図的に公開していません。

## 設計上の不変条件

- **JSON は text ペイロード内**: すべてのレスポンスは MCP の `text` content として返り、その文字列の中に `JSON.stringify` 済みデータが入る。MCP クライアント側で `JSON.parse` が必要
- **context は 1 回ロード**: `loadContext()`（cosmiconfig + virtualTree resolver scan）は MCP サーバープロセス内で初回呼び出し時に 1 回だけ実行され、以降の全ツール呼び出しで再利用される。テスト時のリセット用に `__resetV4ContextCache()` を export
- **エラーは throw しない**: 検証失敗・I/O 失敗・`readToken` 不一致・`local` 到達不能はすべて MCP の `{ isError: true }` payload として返る。throw して MCP セッションを落とさない。payload はフラットな `{ error, message, next?, readToken?, currentBlocks? }`（`@burger-editor/cli` の `agentErrorSchema`）で、CLI の stderr や `local` の `POST /api/agent/invoke` と同じ shape
- **`appliedTo`**: 書き込み系ツールの成功応答には `appliedTo: 'browser' | 'disk'` が付く（読み取り専用ツールには付かない）。情報提供のみで、契約はどちらでも同一
- **dryRun 契約**: dryRun=true のレスポンスは書き込みを行わず `diff: { before, after }` を返す。`deleted` / `moved` 等の imperative-tense フィールドは含まれない
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
         ├─► @burger-editor/cli      (agentTools 定義 — disk mode ではその run() を直接呼ぶ)
         │       │
         │       ├─► @burger-editor/file-io  (config / fs / virtual-path)
         │       └─► @burger-editor/core     (block-ops / Front Matter / HTML detection)
         │
         ├─► @burger-editor/local    (HTTP: POST /api/agent/invoke — 到達可能なとき転送)
         │
         ├─► @burger-editor/core      (v3 互換)
         ├─► @burger-editor/legacy    (v3 互換)
         └─► @burger-editor/migrator  (v3 互換)
```

## トラブルシューティング

### サーバーが起動しない

1. Node.js のバージョンが本リポジトリ標準（`package.json` の `volta.node` を参照）と一致しているか確認
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

- 「BurgerEditor MCP server dryRun diff」
- 「BurgerEditor MCP --mode auto local disk」
- 「BGE_AGENT_TOKEN unauthorized」
- 「bge-mcp-server PATH collision」 — 汎用名 `mcp-server` は公開せず、`bge-mcp-server` のみ
- 「MCP catalog_get template field」
- 「BurgerEditor item_schema dataKeys」

## License

Dual Licensed under MIT OR Apache-2.0
