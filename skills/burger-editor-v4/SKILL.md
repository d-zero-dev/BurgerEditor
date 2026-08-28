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

| 用語                        | 意味                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ページ**                  | HTML ファイル。Front Matter + 編集可能領域の組。`editableArea` セレクター内にブロックが並ぶ                                                      |
| **ブロック**                | `[data-bge-container]` を root とする一塊。`target: { index }`（並び順、0 始まり）か `target: { id }`（安定 id、`block_ensure_id` で付与）で指す |
| **アイテム**                | ブロック内の最小コンテンツ単位（`wysiwyg` `image` `title-h2` 等）                                                                                |
| **カタログ**                | プロジェクトで使える「ブロックの種類」のリスト。`catalog_list` で取得                                                                            |
| **Front Matter**            | ページ先頭の YAML。`title`, `path` などプロジェクト依存                                                                                          |
| **実パス / バーチャルパス** | `virtualTree.enabled: true` 時は Front Matter の `path` で論理パスを使う。CLI/MCP はどちらも受ける                                               |
| **スタイル軸**              | `--bge-options-<軸>--<バリアント>` というプロジェクト CSS カスタムプロパティで定義。`style_options_list` で取得                                  |
| **readToken**               | ページを読んだ時点の内容に束縛されたトークン。既存ページへの書き込み系ツールは（`page_create` を除き）これを要求する。詳細は次節                 |

## readToken — 読んでから書く契約

既存ページに対する書き込み系ツール（`block_*` / `item_update` / `page_update` / `front_matter_set` / `page_delete` / `page_rename` / `page_copy` / `page_concat` の各 source と既存の `to`）は、直前にそのページを読んだときに得た `readToken` を渡さないと失敗します。

- `readToken` を渡さない → `read-required` エラー。渡したトークンがページの現在の内容と食い違う（別プロセスや人間が編集した等） → `stale` エラー。どちらの応答にも新しい `readToken` と `currentBlocks`（先頭ブロックの `index`/`id`/`text`）が同梱されるので、それを使ってそのまま再試行できる
- `readToken` は `page_blocks` の応答、または直前の書き込み系ツールの成功応答に入っている。**新しいページを読むたび／書き込むたびに更新されるので、常に直前のレスポンスの値を使うこと**（使い回さない）
- `page_create` だけは対象がまだ存在しないので `readToken` 不要。宛先が既にあれば `exists` エラーになる
- `page_rename` / `page_copy` は宛先 (`to`) が既に存在する場合も無条件に `exists` エラー（上書きしない）。上書きしたいなら先に `page_delete` する

## 主要ツール — CLI と MCP の対応表

CLI（kebab-case）と MCP ツール（snake_case）は **同じ機能の表記違い** です。同じ行同士が同一機能。「readToken」列が✓のツールは前節の契約が適用されます。

| CLI（`npx @burger-editor/cli ...`）           | MCP ツール               | readToken | 種別                                                                 |
| --------------------------------------------- | ------------------------ | :-------: | -------------------------------------------------------------------- |
| `page-list`                                   | `page_list`              |           | 読み — `invalidPages` も返す                                         |
| `page-get <path>`                             | `page_get`               |           | 読み — 生コンテンツ + Front Matter                                   |
| `page-blocks <path>`                          | `page_blocks`            |     ✓     | 読み — 2 段プロトコル（後述）                                        |
| `page-create <path>`                          | `page_create`            |           | 書き — atomic、初期ブロック可                                        |
| `page-delete <path>`                          | `page_delete`            |     ✓     | 書き                                                                 |
| `page-rename <from> <to>`                     | `page_rename`            |     ✓     | 書き — 宛先が既存なら `exists`                                       |
| `page-copy <from> <to>`                       | `page_copy`              |     ✓     | 書き — 宛先が既存なら `exists`                                       |
| `page-concat <target> <source...>`            | `page_concat`            |     ✓     | 書き — source は 1 つ以上必須。`to` は無ければ新規作成               |
| `front-matter-get <path>`                     | `front_matter_get`       |           | 読み                                                                 |
| `front-matter-set <path>`                     | `front_matter_set`       |     ✓     | 書き — `--replace` で全置換                                          |
| `block-get <path> <index>`                    | `block_get`              |     ✓     | 読み — `target: {index}` または `{id}`                               |
| `block-insert <path> <atIndex>`               | `block_insert`           |     ✓     | 書き — `--dry-run` 可                                                |
| `block-replace <path> <index>`                | `block_replace`          |     ✓     | 書き — `--dry-run` 可                                                |
| `block-delete <path> <index>`                 | `block_delete`           |     ✓     | 書き — `--dry-run` 可                                                |
| `block-move <path> <from> <to>`               | `block_move`             |     ✓     | 書き — `--dry-run` 可 / `to` は最終配列 index                        |
| `block-duplicate <path> <index>`              | `block_duplicate`        |     ✓     | 書き — 直後に複製を挿入（id なし）。`--dry-run` 可                   |
| `block-ensure-id <path> <index>`              | `block_ensure_id`        |     ✓     | 書き — id 未設定のブロックに `bge-<n>` を付与（idempotent）          |
| `item-update <path> <blockIndex> <itemIndex>` | `item_update`            |     ✓     | 書き — アイテム 1 個のデータをマージ。`--dry-run` 可                 |
| （CLI 単独）                                  | `page_update`            |     ✓     | 書き — `ops: BlockOp[]` バッチ。`--dry-run` 可（後述の注意点を参照） |
| `catalog-list`                                | `catalog_list`           |           | 読み                                                                 |
| `catalog-get <name>`                          | `catalog_get`            |           | 読み — `template` 付き（spec として直渡し可）                        |
| `item-list`                                   | `item_list`              |           | 読み                                                                 |
| `item-schema <name>`                          | `item_schema`            |           | 読み — `dataKeys: [camelCase, ...]` 付き                             |
| `style-options-list`                          | `style_options_list`     |           | 読み                                                                 |
| `container-options-list`                      | `container_options_list` |           | 読み                                                                 |
| `config-resolve`                              | `config_resolve`         |           | 読み                                                                 |
| （CLI 単独）                                  | `editor_state_get`       |           | 読み — ローカル開発サーバー起動時のみ意味を持つ（未起動時は空配列）  |
| （CLI 単独）                                  | `editor_wait_for_event`  |           | 読み — ローカル開発サーバー必須。未起動時は `local-required` エラー  |

## ブロックの特定 — `page_blocks`（2 段プロトコル）

`block_list` は廃止されました。ブロック一覧の取得は `page_blocks` を **2 回** 呼びます。

```
// 1 回目: readToken を付けずに呼ぶ
page_blocks { path: "<page>" }
// → { blockCount, approxTokens, recommendation, readToken, next }
//   （この時点ではブロック本体は返らない）

// 2 回目: 1 回目の readToken を渡す
page_blocks { path: "<page>", readToken: "<1回目のreadToken>" }
// → { readToken, blocks: [{ index, id, name, itemNames, text, headings, hasImage, hasLink }] }
```

- 2 回目の `blocks[]` は `data`/`html` を含まない要約（`text` は可視テキストの先頭 200 文字）。ブロックを絞り込んだら **`block_get { path, target, readToken }` で詳細（`data`/`html`）を取得**する
- `filter: { text, regex, blockName, itemName, headingLevel }` と `range: { from, to }` は 2 回目の任意引数。曖昧な絞り込みは自分でこの一覧を読んで判断すること — 別の検索ツールはない
- 2 回目の `readToken` を、続く `block_*` / `item_update` / `page_update` に渡す

## dry-run（書き込み系のプレビュー）

`block_insert` / `block_replace` / `block_delete` / `block_move` / `block_duplicate` / `item_update` / `page_update`（CLI / MCP 双方）は `--dry-run` / `dryRun: true` を受け付けます。書き込みを行わず、`diff: { before, after }` を返します。`block_*` / `item_update` は変更前後の該当ブロック HTML（`insert` は `before: null`、`delete` は `after: null`）、`page_update` は複数ブロックにまたがりうるため変更前後の**編集可能領域全体**の HTML です。CI でのレビュー、差分プレビューに使ってください。

```jsonc
// block_replace dryRun の例
{
	"path": "about.html",
	"target": { "index": 0 },
	"dryRun": true,
	"diff": { "before": "<...>", "after": "<...>" },
}
```

dryRun は必須の事前確認ではありません。中立なツールとして「見せたいときだけ」使ってください。副作用なし — 対象ページが存在しないと `Cannot dry-run mutation on a non-existent page` エラーを返します。

`page_update` の `ops` は各要素が `{ op: 'insert'|'replace', index, blockHtml }` のように **レンダリング済み HTML 文字列** を要求します（`block_insert` 等の `spec` とは異なる、低レベルな形）。すでにレンダリング済みの HTML を持っている場合（`block_get` の戻り値の再利用、`dryRun` の `diff.after` 等）以外は、個別の `block_*` ツールを順番に呼ぶ方が単純です。失敗した op があれば、そこまでの変更は**一切ディスクへ書き込まれません**（全 op 成功時のみ 1 回で保存する all-or-nothing）。

## invalidPages（壊れた / 移行待ちページ）

`virtualTree.enabled: true` のプロジェクトで `pathKey` Front Matter を持たないファイル（移行待ちのレガシースタブ等）があると、4.0.0-alpha.68 以降は **CLI/MCP は停止せずスキップ**します。`page_list` の戻り値 `invalidPages: [{file, reason, message}]` で確認できます。strict 挙動が必要なら（local server のブート時など）`loadResolverState(..., { strict: true })` を直接呼びます。

## 操作プロトコル（**毎回守る**）

1. **読んでから書く**。`page_blocks` で現状を JSON で取り、ユーザー指示と照合。書き込み系ツールはこの `readToken` を要求する
2. **対象を曖昧にしたまま書かない**。ブロックの `target`（`index` または `id`）を特定できなければ **ユーザーに質問**
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

- CLI/MCP の戻りは常に JSON。エラーは stderr に `{error, message, next?, readToken?, currentBlocks?}`（`next`/`readToken`/`currentBlocks` は復旧の手がかり）
- ブロック特定のために `page_blocks` をまず叩く前に、すでに `page_blocks` の結果が会話に出ているか確認しトークン浪費を避ける。ただし書き込みには直前の `readToken` が要るので、古すぎる結果は使い回さない
- ユーザーが日本語で指示した場合、応答も日本語で返す
