# `@burger-editor/mcp-server`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fmcp-server.svg)](https://badge.fury.io/js/@burger-editor%2Fmcp-server)

BurgerEditor 用の MCP (Model Context Protocol) サーバー。Claude などの AI アシスタントから BurgerEditor を操作するために使う。

v4 ツールは [`@burger-editor/cli`](../cli/) のハンドラを直接ラップして公開している（CLI と MCP で同じパス）。v3 互換ツール（`get_block_type` / `get_block_data_params_v3` / `create_block_v3` 等）も併せて提供。

## Installation

グローバルか npx 経由で使う:

```sh
yarn global add @burger-editor/mcp-server
# または npx -y @burger-editor/mcp-server
```

## Claude Desktop での設定

`~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）:

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

stdio トランスポートをサポートする任意の MCP クライアントで使用可能。

## 提供ツール

ツール一覧と引数仕様は `src/tools/v3.ts` / `src/tools/v4.ts` の JSDoc を参照。v4 ツールの実装本体は [`@burger-editor/cli`](../cli/) の `src/handlers.ts` にある。

## License

Dual Licensed under MIT OR Apache-2.0
