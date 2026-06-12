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

## 主要ツール — CLI と MCP の対応表

CLI（kebab-case）と MCP ツール（snake_case）は **同じ機能の表記違い** です。同じ行同士が同一機能。

| CLI（`npx @burger-editor/cli ...`） | MCP ツール               | 種別                                                      |
| ----------------------------------- | ------------------------ | --------------------------------------------------------- |
| `page-list`                         | `page_list`              | 読み — `invalidPages` も返す                              |
| `page-get <path>`                   | `page_get`               | 読み                                                      |
| `page-create <path>`                | `page_create`            | 書き — atomic、初期ブロック可                             |
| `page-delete <path>`                | `page_delete`            | 書き                                                      |
| `page-rename <from> <to>`           | `page_rename`            | 書き                                                      |
| `page-copy <from> <to>`             | `page_copy`              | 書き                                                      |
| `page-concat <target> <source...>`  | `page_concat`            | 書き — source は 1 つ以上必須                             |
| `front-matter-get <path>`           | `front_matter_get`       | 読み                                                      |
| `front-matter-set <path>`           | `front_matter_set`       | 書き — `--replace` で全置換                               |
| `block-list <path>`                 | `block_list`             | 読み — `{index, data, html}[]`                            |
| `block-get <path> <index>`          | `block_get`              | 読み                                                      |
| `block-insert <path> <atIndex>`     | `block_insert`           | 書き — `--dry-run` 可                                     |
| `block-replace <path> <index>`      | `block_replace`          | 書き — `--dry-run` 可                                     |
| `block-delete <path> <index>`       | `block_delete`           | 書き — `--dry-run` 可                                     |
| `block-move <path> <from> <to>`     | `block_move`             | 書き — `--dry-run` 可 / `to` は最終配列 index             |
| `catalog-list`                      | `catalog_list`           | 読み                                                      |
| `catalog-get <name>`                | `catalog_get`            | 読み — `template` 付き（spec として直渡し可）             |
| `item-list`                         | `item_list`              | 読み                                                      |
| `item-schema <name>`                | `item_schema`            | 読み — `dataKeys: [camelCase, ...]` 付き                  |
| `style-options-list`                | `style_options_list`     | 読み                                                      |
| `container-options-list`            | `container_options_list` | 読み                                                      |
| `config-resolve`                    | `config_resolve`         | 読み                                                      |
| （CLI 単独）                        | `duplicate_block`        | 書き — `block_get` + `block_insert` の合成。`dryRun` 対応 |
| （CLI 単独）                        | `update_page`            | 書き — operations[] バッチ。**`dryRun` 非対応**           |

高レベル MCP ツール: `update_page` は複数の `block_*` 操作を一気に流せます。`page_create` は初期ブロックの配列を任意で受けます。

## dry-run（書き込み系のプレビュー）

`block-insert` / `block-replace` / `block-delete` / `block-move` / `duplicate_block`（CLI / MCP 双方）は `--dry-run` / `dryRun: true` を受け付けます。書き込みを行わず、書き込まれるはずの編集可能領域 HTML を `previewContent` に入れて返します。CI でのレビュー、差分プレビューに使ってください。

レスポンス形（dryRun=true 時）:

```jsonc
// block_delete dryRun の例
{ "path": "about.html", "index": 0, "dryRun": true, "previewContent": "<...>" }
// 注意: `deleted` / `moved` フィールドは v4.0.0-alpha.68 以降 含まれない
// （旧仕様 `deleted: !dryRun` が dryRun 成功を「失敗」と誤読させたため削除）
```

`update_page`（バッチ）は dryRun **非対応**。各 op が前 op の書き込み結果に依存するため。プレビューしたければ個別 `block_*` ツールで分割実行。

dryRun は副作用なし — 対象ページが存在しないと `Cannot dry-run mutation on a non-existent page` エラーを返します。

## invalidPages（壊れた / 移行待ちページ）

`virtualTree.enabled: true` のプロジェクトで `pathKey` Front Matter を持たないファイル（移行待ちのレガシースタブ等）があると、4.0.0-alpha.68 以降は **CLI/MCP は停止せずスキップ**します。`page_list` の戻り値 `invalidPages: [{file, reason, message}]` で確認できます。strict 挙動が必要なら（local server のブート時など）`loadResolverState(..., { strict: true })` を直接呼びます。

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
