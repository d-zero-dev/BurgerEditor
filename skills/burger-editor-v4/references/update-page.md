# update-page ワークフロー（最重要）

特定ページの**部分更新**は BurgerEditor v4 で最もよくあるタスクです。下記の手順を厳守してください。

## 標準手順

### 1. ページ特定

ユーザーが `about.html` のような明示パスを示していないなら、`page_list` を読んでから「どのページを編集しますか？」と質問。ヒット候補が複数あるときは候補をユーザーに提示して選ばせる。

### 2. ブロック特定

```
page_blocks { path: "<page>" }
// → { blockCount, readToken, next, ... }（1 回目はブロック本体を返さない）

page_blocks { path: "<page>", readToken: "<1回目のreadToken>" }
// → { readToken, blocks: [{ index, id, name, itemNames, text, headings, ... }] }
```

戻り `blocks[]`：

- `index` … 並び順（0 始まり、挿入・削除で滑る）。`id` … 安定 id（未設定なら `null`。`block_ensure_id` で付与できる）
- `name` … カタログ名（h2 / wysiwyg / image / image-text 等）
- `text` … ブロックの可視テキスト先頭 200 文字。`itemNames` … アイテム名の並び

2 回目の `readToken` を、この後の `block_*` 呼び出しにそのまま使う。

ユーザーの指示と照合して **対象を 1 つに絞る**（`target: { index: N }` または `target: { id: "bge-…" }`）。**絞れないときは絞れるまで質問**：

- 「会社概要のセクションを更新して」 → `text` に「会社概要」を含むブロックを探す。複数候補があれば「2 番目（『…』）と 4 番目（『…』）どちらですか？」と聞く
- 「2 番目の見出し」 → `name === 'h2'` のブロックだけ列挙して 2 番目を選ぶ
- 詳細な `data`/`html` が要るときは `block_get { path, target, readToken }` を追加で呼ぶ

### 3. 計画を提示してユーザー承認を取る

Markdown 短文で：

```
更新計画：
- index 3 の h2 ブロックの見出し文字列を「会社概要」から「弊社について」に変更します。
- 他のブロックは触りません。
よろしいですか？
```

ユーザーが OK と返したらだけ次へ。

### 4. 必要な追加情報を取得

- 別カタログのブロックに差し替えるなら `catalog_list` で利用可能ブロックを確認
- 個別ブロックの定義が必要なら `catalog_get { name }` — **戻り値の `template` フィールドがそのまま `block_insert` の `spec` に渡せる雛形**（containerProps デフォルト fill 済み + items を `{name, data}` 形式に展開済み）
- アイテムのデータキーが不明なら `item_schema { name }` — **戻り値の `dataKeys` 配列が確定した camelCase キー一覧**（`editor` HTML を自分でパースする必要なし）
- スタイル軸を触るなら `style_options_list` を必ず読む

### 5. 書き込み

**1 操作で済むケース**：

```
block_replace { path: "<page>", target: { index: 3 }, spec: { catalog: "h2", items: [[{ name: "title-h2", data: { titleH2: "弊社について" } }]] }, readToken: "<page_blocksのreadToken>" }
```

**重要：データキーは camelCase**。アイテムテンプレートの `data-bge="title-h2"` のスロット名は frozen-patty によって camelCase に変換されるため、データ書式は `titleH2: ...` です（`title-h2` でも `bge-title-h2` でもない）。確実な確認方法は **`page_blocks` / `block_get` でそのページの既存アイテムを読む** か **`item_schema` で template を見る**。

**アイテム 1 個だけ直したいケース**：ブロックごと差し替えず `item_update` を使う。

```
item_update { path: "<page>", target: { index: 3 }, itemIndex: 0, data: { titleH2: "弊社について" }, readToken: "..." }
```

`data` は現在値と shallow マージされる（変更しないキーは省略してよい）。

**複数操作をまとめるケース**：`page_update` を使う。

```
page_update {
  path: "<page>",
  ops: [
    { op: "delete", index: 8 },
    { op: "move", from: 5, to: 0 }
  ],
  readToken: "..."
}
```

**注意**：

- `ops` は順次適用される。`delete` や `insert` を挟むと **以降の index は変化** する。ユーザーが「2 つ削除して 1 つ足す」と言ったとき、後段の index を再計算するか、より単純な順序に並べ替える
- `ops` の `insert` / `replace` は **レンダリング済み HTML 文字列**（`blockHtml`）を要求する、`spec` とは別の低レベルな形。すでに HTML を持っている場合（`block_get` の戻り値の再利用等）以外は、`block_insert` / `block_replace` を個別に順番に呼ぶ方が単純
- 途中の op が失敗すると **それまでの変更は一切ディスクへ書き込まれない**（全 op 成功して初めて 1 回で保存される all-or-nothing）。失敗は `page_update op N (<op>) failed: … page_update is all-or-nothing — nothing from this call was persisted.` という `message` を持つエラーとして返り、`N`（0 始まり）が失敗した op の位置

**move の意味**：`block_move { target, to }` の `to` は **移動後の最終配列における index**（Array.prototype.splice と同じ慣用）。例：`[A,B,C,D]` で `move({index:0}, 2)` は `[B,C,A,D]` になり A は最終 index 2 に着地する。「現在 index 2 の要素（C）の手前に置く」と解釈してはいけない。

**dry-run でプレビュー**：書き込み前にプレビューしたいときは `dryRun: true`（MCP）/ `--dry-run`（CLI）。中立なツールであり必須の手順ではない。適用せず、変更前後の該当ブロック HTML が `diff: { before, after }` に入って返るので、人間レビューや CI 差分確認に使える。

```
block_replace { path: "<page>", target: { index: 3 }, spec: {...}, readToken: "...", dryRun: true }
// → { path, target, dryRun: true, diff: { before: "<...元のブロックHTML...>", after: "<...新しいブロックHTML...>" } }
```

### 6. 検証

書き込み後、再度 `page_blocks` を呼んで変更が意図通りか確認し、ユーザーに「更新しました（block 3 → 弊社について）」と報告。取り消したい場合はエディタではなく `git diff` / `git checkout` 等、利用者自身の git 操作で行う（AI は git の破壊的操作を実行しない）。

## してはいけないこと

- ❌ `Edit` / `Write` で `.html` ファイルを直接編集する
- ❌ `page_blocks` を読まずに index を推測する
- ❌ ユーザーが対象を曖昧にしたまま書き込む
- ❌ スタイル軸を `style_options_list` で確認せずに `style: {}` を書く
- ❌ 計画提示・承認なしに書き込みを実行する

## アイテムデータキーの調べ方

**確定ルール**：item の template HTML 内の `data-bge="xxx-yyy"` という属性の値を、**frozen-patty が camelCase に変換した文字列**がデータキー。`xxx-yyy` → `xxxYyy`、`abc` → `abc`。

| アイテム名 | スロット例（template 内） | データキー       |
| ---------- | ------------------------- | ---------------- |
| `title-h2` | `data-bge="title-h2"`     | `titleH2`        |
| `title-h3` | `data-bge="title-h3"`     | `titleH3`        |
| `wysiwyg`  | `data-bge="wysiwyg"`      | `wysiwyg`        |
| その他     | `data-bge="..."` を確認   | 該当の camelCase |

**わからないときは絶対に推測しない**。次のどちらかで確認：

- `page_blocks` + `block_get { path, target, readToken }` でそのページの同種ブロックを読み、`block.data.items[g][i].data` の実キーを見る
- `item_schema { name }` で template HTML を取得し、`data-bge="..."` 値を camelCase に変換

不明な場合は **`item_schema { name }` を呼んで editor HTML を見る**のが最も確実。
