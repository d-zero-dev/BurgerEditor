# update-page ワークフロー（最重要）

特定ページの**部分更新**は BurgerEditor v4 で最もよくあるタスクです。下記の手順を厳守してください。

## 標準手順

### 1. ページ特定

ユーザーが `about.html` のような明示パスを示していないなら、`page_list` を読んでから「どのページを編集しますか？」と質問。ヒット候補が複数あるときは候補をユーザーに提示して選ばせる。

### 2. ブロック特定

```
block_list { path: "<page>" }
```

戻り `blocks: [{ index, data, html }]`：

- `index` … 0 始まり、ページ内ブロックの並び順
- `data.name` … カタログ名（h2 / wysiwyg / image / image-text 等）
- `data.items[g][i].data` … アイテム内の実データ（タイトル文字列、画像 URL 等）

ユーザーの指示と照合して **対象 index を 1 つに絞る**。**絞れないときは絞れるまで質問**：

- 「会社概要のセクションを更新して」 → `data` 内に「会社概要」を含むブロックを探す。複数候補があれば「2 番目（『…』）と 4 番目（『…』）どちらですか？」と聞く
- 「2 番目の見出し」 → `data.name === 'h2'` のブロックだけ列挙して 2 番目を選ぶ

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
block_replace { path: "<page>", index: 3, spec: { catalog: "h2", items: [[{ name: "title-h2", data: { titleH2: "弊社について" } }]] } }
```

**重要：データキーは camelCase**。アイテムテンプレートの `data-bge="title-h2"` のスロット名は frozen-patty によって camelCase に変換されるため、データ書式は `titleH2: ...` です（`title-h2` でも `bge-title-h2` でもない）。確実な確認方法は **`block_list` でそのページの既存アイテムを読む** か **`item_schema` で template を見る**。

**複数操作をまとめるケース**：`update_page` を使う。

```
update_page {
  path: "<page>",
  operations: [
    { op: "replace", index: 3, spec: { ... } },
    { op: "insert", atIndex: 5, spec: { ... } },
    { op: "delete", index: 8 }
  ]
}
```

**注意**：operations は順次適用される。`delete` や `insert` を挟むと **以降の index は変化** する。ユーザーが「2 つ削除して 1 つ足す」と言ったとき、後段の index を再計算するか、より単純な順序に並べ替える。

**move の意味**：`block_move { from, to }` の `to` は **移動後の最終配列における index**（Array.prototype.splice と同じ慣用）。例：`[A,B,C,D]` で `move(0, 2)` は `[B,C,A,D]` になり A は最終 index 2 に着地する。「現在 index 2 の要素（C）の手前に置く」と解釈してはいけない。

**dry-run でプレビュー**：書き込み前にプレビューしたいときは `dryRun: true`（MCP）/ `--dry-run`（CLI）。書き込まれるはずの編集可能領域 HTML が `previewContent` に入って返るので、人間レビューや CI 差分確認に使える。

```
block_replace { path: "<page>", index: 3, spec: {...}, dryRun: true }
// → { path, index, dryRun: true, previewContent: "<...新しい編集可能領域HTML...>" }
```

### 6. 検証

書き込み後、再度 `block_list` を呼んで `data` の変更が意図通りか確認し、ユーザーに「更新しました（block 3 → 弊社について）」と報告。

## してはいけないこと

- ❌ `Edit` / `Write` で `.html` ファイルを直接編集する
- ❌ `block_list` を読まずに index を推測する
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

- `block_list { path }` でそのページの同種ブロックを読み、`block.data.items[g][i].data` の実キーを見る
- `item_schema { name }` で template HTML を取得し、`data-bge="..."` 値を camelCase に変換

不明な場合は **`item_schema { name }` を呼んで editor HTML を見る**のが最も確実。
