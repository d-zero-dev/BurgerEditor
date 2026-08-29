---
name: editing-burger-editor-pages
description: Edit existing BurgerEditor v4 pages through the Agent Hub — insert, replace, move, or delete blocks; update item data; adjust Front Matter; create, rename, copy, or delete pages. Use this skill whenever the workspace has a burgereditor.config.{js,mjs,ts,cjs,json} file or @burger-editor/* dependencies, and the user talks about pages, blocks, headings, Front Matter, or editing an HTML page built with BurgerEditor — even if they don't say "BurgerEditor" explicitly.
license: (MIT OR Apache-2.0)
metadata:
  author: d-zero-dev
  version: '1.0.0'
---

# BurgerEditor v4 ページ編集

BurgerEditor v4 のページは Front Matter + 編集可能領域（`editableArea`）の組で、編集可能領域には `[data-bge-container]` ブロックが並ぶ。ブロックの中身は「アイテム」という最小単位（見出し・wysiwyg・画像など）でできている。**このスキルは MCP サーバー（`@burger-editor/mcp-server`）経由の操作を前提にする。** ツールの引数の型・スキーマはツール定義自体（`page_blocks` `block_insert` 等）が持っているので、ここでは書かない。ここに書くのは「ツール定義を読むだけでは分からない、この実装固有の事実」だけ。

## 中核ループ

1. **読む** — 対象ページを `page_blocks` で読む（下記「ハマりどころ」の1番を参照）。ただし、そのページの `page_blocks` 結果が直前の会話に既に出ているなら、読み直さず使い回してよい（書き込みに使う `readToken` だけは直前レスポンスのものを使う）
2. **絞る** — ユーザーの指示と `text` / `headings` / `itemNames` を照合し、対象ブロックを 1 つに絞る。**絞れないときは推測せずユーザーに聞く**
3. **書く** — `block_*` / `item_update` / `page_update` などで書き込む。**書く前の承認は不要。取り消しはユーザーの git 操作に任せる**（このプロジェクトの `documentRoot` は git 管理下にある前提。AI は `git checkout` 等の破壊的操作を行わない）
4. **確かめる** — 書いた後にもう一度 `page_blocks`（または `page_get`）で読み戻し、意図通りかを見てからユーザーに結果を報告する

## ハマりどころ（推測すると必ず外す）

1. **`page_blocks` は必ず 2 回呼ぶ。** 1 回目は `readToken` と `blockCount` だけを返し、ブロック本体は絶対に返らない（ブロックが 1 個でも 2 個でも同じ）。2 回目に 1 回目の `readToken` を渡して初めて `blocks[]`（`text` は可視テキスト先頭 200 文字、`headings`、`itemNames` 等の要約）が返る。詳細な `data` / `html` が要るときだけ `block_get` を追加で呼ぶ。
2. **`block_get` は読み取り専用ツールだが `readToken` が必須。** 「読むだけだからトークン不要」という直感は外れる。
3. **`readToken` は直前のレスポンスのものを使い、使い回さない。** `read-required` や `stale` で失敗しても、そのエラー応答自体に新しい `readToken` と `currentBlocks`（先頭ブロックの index/id/text）が同梱されているので、`page_blocks` を再実行せずそのまま再試行できる。
4. **item の data キーは推測しない。** `catalog_get({ name })` の戻り値の `template` は、そのカタログブロックの全アイテムの全データキーが空文字で埋まった雛形で、**そのまま `block_insert` / `block_replace` の `spec` に渡せる**。値だけ差し替えれば済む。個別アイテムのキーが知りたいときは `item_schema({ name })` の `dataKeys`（camelCase 確定済み）を見る。テンプレート HTML の `data-bge="xxx-yyy"` を自分でパースして `xxxYyy` に変換する必要はない。
5. **`block_move` の `to` は「移動後の最終配列における index」**（`Array.prototype.splice` と同じ慣用）。`[A,B,C,D]` で `move({index:0}, 2)` は `[B,C,A,D]` になる。「現在 index 2 の要素の手前に置く」ではない。
6. **`page_update` の `ops` は `spec` ではなく、レンダリング済みの `blockHtml` 文字列を要求する。** `block_get` の戻り値や `dryRun` の `diff.after` のように、すでに HTML を持っている場合以外は、`block_insert` / `block_replace` を個別に順番に呼ぶ方が単純。`page_update` は **all-or-nothing**（1 つでも op が失敗すると何も保存されない）。
7. **`item_update` の `itemIndex` は DOM 順の通し番号。** `[data-bge-item]` を数えるが、`[data-bgi]` ラッパーの無いアイテムも 1 つとして数える。`page_blocks` の `itemNames` と対応する。
8. **`style_options_list` の戻りが空でも「このプロジェクトにスタイル軸が無い」とは限らない。** `config.stylesheets` に指定された CSS が読めなかっただけの可能性がある。実在する軸・変種名は必ず `style_options_list` を読んで確認し、推測で `--bge-options-<軸>--<変種>` を書かない。
9. **`page_create` / `page_rename` / `page_copy` は絶対に上書きしない。** 宛先が既に存在すると `exists` エラーになる。上書きしたいなら先に `page_delete` する。
10. **`.html` ファイルを `Edit` / `Write` で直接書き換えない。** 必ず CLI/MCP のツールを経由する。
11. **`dryRun: true` はページが実在する場合のみ使える。** 存在しないパスに対して dry-run すると `Cannot dry-run mutation on a non-existent page` のようなエラーになる。まだ無いページの内容をプレビューしたいときは dry-run できない。

## エラー → 次の一手

| エラーコード                           | 意味                                                                                        | 次にすること                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read-required`                        | 変更系ツールに `readToken` を渡していない                                                   | 応答に同梱される `readToken` を使って即再試行                                                                                                                                       |
| `stale`                                | `readToken` がページの現在の内容と食い違う（別プロセス／人間の IDE 編集で外部変更された等） | 応答の `readToken` と `currentBlocks` で再試行。index がずれた疑いがあれば `target.id` に切り替える                                                                                 |
| `exists`                               | `page_create` / `page_rename` / `page_copy` の宛先が既に存在する                            | 上書きしたいなら先に `page_delete`。設計上 clobber しない                                                                                                                           |
| `user-editing`                         | ブラウザで開いているタブを人間が操作中（ダイアログを開いている／ソースモード中）            | `references/live-editing.md` を読み、`editor_wait_for_event({ types: ['ui-idle'] })` で待ってから再試行する                                                                         |
| `range`                                | index が範囲外・非整数、または `target.id` が見つからない                                   | `page_blocks` を読み直して正しい `index`/`id` を確認する                                                                                                                            |
| `not-found`                            | ページが存在しない、または未知のツール名                                                    | `page_list` でパスの綴りを確認する                                                                                                                                                  |
| `invalid`                              | 入力スキーマ違反、正規表現エラー、`documentRoot` 外パス等                                   | エラーメッセージが具体的な原因を述べているので、それに従って入力を直す                                                                                                              |
| `no-such-area`                         | 設定の `editableArea` セレクタがページ内でヒットしない                                      | エラーメッセージ末尾の候補セレクタと `config_resolve` の結果を突き合わせる。config 自体の修正はこのスキルの範囲外（`building-burger-editor-projects` スキル）なのでユーザーに伝える |
| `local-unreachable` / `local-required` | ローカル開発サーバー（`bge`）に届かない、または disk モードで local 専用ツールを呼んだ      | ユーザーに状況を伝えるだけでよい。**自分で `bge` を起動しようとしない**                                                                                                             |

## references の読込条件

- ブラウザで開いているページをその場で編集する、または上表の `user-editing` / `local-*` に当たったとき → `references/live-editing.md`
- ブロックを新規に組み立てる、`spec` の形やアイテムのデータ構造で迷ったとき → `references/blocks-and-items.md`
- 余白・背景色・幅・カラム数などの見た目を触るとき → `references/styling.md`
- ページの作成・改名・複製・結合・削除、または `virtualTree` プロジェクトを扱うとき → `references/page-operations.md`
- 既存の非ブロック生 HTML をブロック構造に変換するとき → `references/convert-raw-html.md`
- MCP サーバーが使えない環境（CI やシェルスクリプトなど）から操作するとき → `references/cli-fallback.md`
