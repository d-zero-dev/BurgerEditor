---
name: building-burger-editor-projects
description: Set up and customize a BurgerEditor v4 project — configure burgereditor.config.js, wire up @burger-editor/mcp-server for an AI client, define custom block catalogs and items, and add CSS custom-property style axes. Use this skill when the user wants to introduce BurgerEditor into a project, connect an AI agent to it, add a custom block or item type, or add a new style axis (margin, width, background color, etc.) that other blocks can select — as distinct from editing content on an already-configured project.
license: (MIT OR Apache-2.0)
metadata:
  author: d-zero-dev
  version: '1.0.0'
---

# BurgerEditor v4 プロジェクト構築

BurgerEditor v4 を新しく導入する、AI クライアントを接続する、独自ブロック/アイテムを追加する、スタイル軸を増やすといった「制作者・開発者としての設定作業」を扱う。**既存サイトのコンテンツを編集するだけなら `editing-burger-editor-pages` スキルを使う**（このスキルは config やカスタムブロックの定義そのものを触るときだけ発火させる）。

## MCP サーバーの接続

```jsonc
{
	"mcpServers": {
		"burger-editor": {
			"command": "npx",
			"args": ["-y", "@burger-editor/mcp-server"],
		},
	},
}
```

- 既定モードは `--mode auto`: 呼び出しごとにローカル開発サーバー（`bge`）への到達を確認し、届けば `local`（ブラウザ連携）、届かなければ `disk`（ファイル直接操作）に自動フォールバックする。`--mode local` / `--mode disk` で固定もできる
- `bge` が非ループバック（LAN IP や `0.0.0.0`）で bind されているときだけ、`BGE_AGENT_TOKEN` 環境変数、または `bge` 起動時に自動生成される `<configDir>/.burgereditor/agent-token` が必要になる。`localhost` / `127.0.0.1` / `::1` に bind している通常の開発フローでは認証不要
- `.burgereditor/` ディレクトリ（起動ごとのトークンファイル置き場）は必ず `.gitignore` に追加する

## `burgereditor.config.{js,mjs,ts,cjs,json}` の主要キー

cosmiconfig が `package.json` を持つ祖先ディレクトリまで遡って探索する。必須は `documentRoot`（HTML の配置先）と `assetsRoot`（画像/CSS/JS の配置先）。

| キー            | 役割                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `editableArea`  | 編集可能領域を指すセレクタ。**これがヒットしないと `no-such-area` エラーになる**（下記「デバッグ」参照）                              |
| `catalog`       | ブロックカタログ。カスタム定義は `references/custom-blocks.md`                                                                        |
| `stylesheets`   | 編集領域にロードする CSS。**`style_options_list` はここに列挙された CSS しか読まない** — 新しい軸を追加したら必ずここにファイルを足す |
| `classList`     | 編集領域ルートに付与するクラス。ブロック側の `classList` に許可リストとして参照されることがある                                       |
| `virtualTree`   | `{ enabled, pathKey }`。有効にすると Front Matter の `pathKey` が論理パスとして扱われる                                               |
| `indexFileName` | `/` で終わるパスに補完されるファイル名（既定 `index.html`）                                                                           |
| `agent`         | `{ enabled }`（既定 `true`）。Agent Hub のエンドポイント自体を無効化するときに `false` にする                                         |

## `no-such-area` のデバッグ

`editableArea` セレクタがページ内でヒットしないとこのエラーになる。エラーメッセージの末尾に近傍の候補セレクタ（`candidates near root: ...`）が出るので、それと `config_resolve` の解決済み config を突き合わせ、セレクタの誤りか、対象ページ側に該当要素が無いかを切り分ける。

## references の読込条件

- カスタムブロック・アイテムを定義する、または `data-bge` 記法で悩んだとき → `references/custom-blocks.md`
- 新しいスタイル軸（余白・幅・背景色等の変種）を追加するとき → `references/style-axes.md`
