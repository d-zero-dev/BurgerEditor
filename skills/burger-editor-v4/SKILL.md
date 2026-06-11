---
name: burger-editor-v4
description: Drive a BurgerEditor v4 project (page/block edits, front matter, style options) via @burger-editor/cli or @burger-editor/mcp-server. Use whenever the workspace has burgereditor.config.{js,mjs,ts,cjs,json} and @burger-editor/* dependencies.
---

# BurgerEditor v4 編集スキル

このプロジェクトは「BurgerEditor v4」のブロックエディタを使ったページを管理しています。HTMLファイルは Front Matter + 編集可能領域（`burgereditor.config.js` の `editableArea`）の組で構成され、編集可能領域内には `[data-bge-container]` ブロックが並びます。**ブロックの直接 HTML 書き換えを推測で行わず、必ず CLI / MCP を経由してください。**

## 起動条件（このスキルを使うべきとき）

- ワークスペース直下から `burgereditor.config.{js,mjs,ts,cjs,json}` を探索でヒットする
- `package.json` に `@burger-editor/*` 系の依存がある
- ユーザーが「ページ」「ブロック」「Front Matter」「見出し追加」「画像差し替え」など、このリポの編集に関連する語を使った

## セットアップ手順（最初の1回だけ）

### MCP（推奨）

ユーザーの MCP 設定（Claude Code なら `.mcp.json` あるいはユーザー設定）に追加：

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

### CLI（MCP が使えない環境向け）

```bash
npx @burger-editor/cli <subcommand>
```

すべて JSON を stdout に出します。エラーは stderr に JSON で出ます。

## 中核概念

| 用語                        | 意味                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **ページ**                  | HTML ファイル。Front Matter + 編集可能領域の組。`editableArea` セレクター内にブロックが並ぶ                     |
| **ブロック**                | `[data-bge-container]` を root とする一塊。ページ内では先頭から `0, 1, 2…` のインデックスで指す                 |
| **アイテム**                | ブロック内の最小コンテンツ単位（`wysiwyg` `image` `title-h2` 等）                                               |
| **カタログ**                | プロジェクトで使える「ブロックの種類」のリスト。`catalog_list` で取得                                           |
| **Front Matter**            | ページ先頭の YAML。`title`, `path` などプロジェクト依存                                                         |
| **実パス / バーチャルパス** | `virtualTree.enabled: true` 時は Front Matter の `path` で論理パスを使う。CLI/MCP はどちらも受ける              |
| **スタイル軸**              | `--bge-options-<軸>--<バリアント>` というプロジェクト CSS カスタムプロパティで定義。`style_options_list` で取得 |

## 主要 MCP ツール（CLI と 1:1）

- 読み: `page_list`, `page_get`, `block_list`, `block_get`, `catalog_list`, `catalog_get`, `item_list`, `item_schema`, `style_options_list`, `container_options_list`, `config_resolve`, `front_matter_get`
- 書き: `page_create`, `page_delete`, `page_rename`, `page_copy`, `page_concat`, `front_matter_set`, `block_insert`, `block_replace`, `block_delete`, `block_move`, `duplicate_block`, `update_page`

高レベル: `update_page` は複数の `block_*` 操作を一気に流せます。`page_create` は初期ブロックの配列を任意で受けます。

## 操作プロトコル（**毎回守る**）

1. **読んでから書く**。`block_list` で現状を JSON で取り、ユーザー指示と照合
2. **対象を曖昧にしたまま書かない**。ブロックの index を特定できなければ **ユーザーに質問**
3. **書く前に計画を提示し承認を取る**。「ブロック 3 を h3 に置き換えます」「末尾に画像ブロックを足します」など Markdown で明示してから書き込み
4. **スタイル指示は推測しない**。「余白広めで」「青系背景で」と言われたら `style_options_list` を読み、実在する軸とバリアントだけを使う
5. **生 HTML を `Edit` / `Write` で直接書かない**。必ず CLI/MCP を経由する

## サブワークフロー

タスク種別ごとに該当する参考ドキュメントを `references/` から **必要時のみ** 読み込みます：

- 新規ページを作るとき → `references/create-page.md`
- 既存ページを更新するとき（**最頻**）→ `references/update-page.md`
- 既存の非ブロック生 HTML をブロック化するとき → `references/convert-from-raw-html.md`
- ブロックのスタイル/クラス/レイアウトをいじるとき → `references/block-style.md`

## レスポンス契約

- CLI/MCP の戻りは常に JSON。エラーは stderr に `{error: {name, message}}`
- ブロック特定のために `block_list` をまず叩く前に、すでに `block_list` の結果が会話に出ているか確認しトークン浪費を避ける
- ユーザーが日本語で指示した場合、応答も日本語で返す
