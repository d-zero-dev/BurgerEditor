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

- **v3ブロック**: 完全サポート
- **v4ブロック**: 計画中

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
         ├─► @burger-editor/core
         ├─► @burger-editor/legacy
         ├─► @burger-editor/migrator
         └─► @burger-editor/utils
```

## 依存パッケージ

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - MCP SDK
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
