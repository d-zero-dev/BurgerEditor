# @burger-editor/mcp-server

[![npm version](https://badge.fury.io/js/@burger-editor%2Fmcp-server.svg)](https://badge.fury.io/js/@burger-editor%2Fmcp-server)

BurgerEditor用のMCP (Model Context Protocol) サーバー実装です。ClaudeなどのAIアシスタントにBurgerEditorの機能を提供します。

## 概要

`@burger-editor/mcp-server`は、MCP (Model Context Protocol)を通じてBurgerEditorの機能をAIアシスタントに提供するサーバーパッケージです。ClaudeがBurgerEditorのブロックを生成したり、ブロック情報を取得したりできるようになります。

## インストール

```bash
npm install -g @burger-editor/mcp-server
```

または

```bash
yarn global add @burger-editor/mcp-server
```

## 設定方法

### Claude Desktop での使用

Claude Desktopの設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS）に以下を追加します：

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

### その他のMCPクライアント

標準入出力（stdio）トランスポートをサポートする任意のMCPクライアントで使用できます。

## 提供される機能

### ツール（Tools）

MCPサーバーは以下のツールを提供します：

#### 1. `get_block_type`

BurgerEditorで使用可能な一般的なブロックタイプの情報を取得します。

**パラメータ:** なし

**戻り値:** ブロックタイプの説明テキスト

**使用例（Claude）:**

```
ブロックタイプの情報を教えて
```

#### 2. `get_block_data_params_v3`

指定されたv3ブロック名のデータパラメータ情報を取得します。

**パラメータ:**

- `blockName` (string): v3のブロック名

**戻り値:** ブロックが必要とするデータパラメータのリスト

**使用例（Claude）:**

```
text-imageブロックに必要なパラメータを教えて
```

#### 3. `create_block_v3`

v3形式のBurgerEditorブロックHTMLを生成します。

**パラメータ:**

- `blockName` (string): v3のブロック名
- `data` (array): ブロックデータの配列

**戻り値:** 生成されたHTMLブロック

**使用例（Claude）:**

```
text-imageブロックを作成して。テキストは「こんにちは」、画像は「/images/hello.jpg」で。
```

## 使用例

### Claude Desktopでの使用

1. 上記の設定を追加
2. Claude Desktopを再起動
3. Claudeに以下のように指示：

```
BurgerEditorのtext-imageブロックを作成してください。
テキスト: "ようこそ"
画像パス: "/images/welcome.jpg"
画像の代替テキスト: "ようこそ画像"
```

Claudeが自動的に`create_block_v3`ツールを使用してHTMLブロックを生成します。

### プログラムからの使用

```typescript
import { run } from '@burger-editor/mcp-server';

// MCPサーバーを起動
await run();
```

## 対応バージョン

- **v3ブロック**: 完全サポート（`create_block_v3` / `get_block_data_params_v3` / `get_block_type`）
- **v4ブロック**: 完全サポート（下記参照）

## v4 ツール（21 個 + 高レベルヘルパー 2 個）

v4 プロジェクト用のツール群は `@burger-editor/cli` のハンドラをラップして提供しています。`burgereditor.config.{js,mjs,ts,cjs,json}` が見つかるディレクトリ階層内で動作します。

### ページ操作

| ツール        | 説明                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `page_list`   | documentRoot 配下のページツリー                                         |
| `page_get`    | Front Matter + 編集可能領域内容                                         |
| `page_create` | 新規ページ作成（atomic、初期ブロックを任意で受ける）                    |
| `page_delete` | ページ削除                                                              |
| `page_rename` | リネーム / 移動（失敗時に作成済みディレクトリを巻き戻す）               |
| `page_copy`   | 複製                                                                    |
| `page_concat` | 複数 source の編集可能領域を target に append（source は 1 つ以上必須） |

### Front Matter

| ツール             | 説明                                                      |
| ------------------ | --------------------------------------------------------- |
| `front_matter_get` | Front Matter 取得                                         |
| `front_matter_set` | Front Matter 更新（既定 merge、`replace: true` で全置換） |

### ブロック操作

| ツール          | 説明                                               |
| --------------- | -------------------------------------------------- |
| `block_list`    | ブロックメタ + 構造化アイテムデータ                |
| `block_get`     | 単一ブロック取得                                   |
| `block_insert`  | 指定 index に挿入                                  |
| `block_replace` | 指定 index を置換                                  |
| `block_delete`  | 指定 index を削除                                  |
| `block_move`    | 移動。`to` は最終配列における index（splice 慣用） |

### スキーマ参照

| ツール                         | 説明                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `catalog_list` / `catalog_get` | プロジェクトのブロックカタログ                                 |
| `item_list` / `item_schema`    | 標準アイテムとテンプレート（データキー推定用）                 |
| `style_options_list`           | プロジェクト CSS から抽出した `--bge-options-*` 軸とバリアント |
| `container_options_list`       | grid / inline / float の静的オプション                         |
| `config_resolve`               | 解決済み config の要約                                         |

### 高レベルヘルパー

| ツール            | 説明                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `duplicate_block` | block-get → block-insert の組み合わせ（id は自動で剥がれる）                        |
| `update_page`     | insert / replace / delete / move をバッチ適用。シーケンシャル実行、ロールバックなし |

### 設計上の不変条件

- **JSON 出力**: すべて MCP の `text` ペイロードに JSON.stringify した内容を入れる
- **context キャッシュ**: `loadContext()`（cosmiconfig + virtualTree resolver scan）は MCP server プロセス内で 1 回だけ実行され、以降の全ツール呼び出しで再利用される。テスト時のリセット用に `__resetV4ContextCache()` を export
- **エラー**: 検証失敗は MCP の `{isError: true}` payload として返る（throw しない）

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

## 依存パッケージ

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - MCP SDK
- [@burger-editor/cli](../cli/) - v4 ツール用ハンドラ
- [@burger-editor/file-io](../file-io/) - Node 側 fs / config 層（cli 経由で間接依存）
- [@burger-editor/core](../core/) - エディタエンジン
- [@burger-editor/legacy](../legacy/) - v3互換性サポート
- [@burger-editor/migrator](../migrator/) - バージョン間移行ツール
- [@burger-editor/utils](../utils/) - ユーティリティ関数

## トラブルシューティング

### サーバーが起動しない

1. Node.jsのバージョンを確認（Node.js 18以上が必要）
2. パッケージが正しくインストールされているか確認

```bash
npx @burger-editor/mcp-server --version
```

### Claudeがツールを認識しない

1. Claude Desktopを完全に再起動
2. 設定ファイルのJSON構文が正しいか確認
3. `disabled: false`になっているか確認

## 開発

### ローカルでのテスト

```bash
# リポジトリをクローン
git clone https://github.com/d-zero-dev/BurgerEditor.git
cd BurgerEditor/packages/@burger-editor/mcp-server

# 依存関係をインストール
yarn install

# ビルド
yarn build

# テスト実行
yarn test
```

## 関連リンク

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)
- [@burger-editor/migrator](../migrator/) - v3ブロック移行ツール

## ライセンス

Dual Licensed under MIT OR Apache-2.0
