# blocks-and-items — ブロックの組み立て方

## spec は「テンプレートを引いて値だけ差し替える」が基本

`block_insert` / `block_replace` / `page_create` の `blocks` に渡す spec の形:

```ts
{
  catalog?: string;               // カタログ名でテンプレートを引く（推奨）
  name?: string;                  // catalog を使わずブロック名を直指定
  containerProps?: {...};         // 省略時テンプレート値、指定時は丸ごと上書き（マージではない）
  classList?: string[];
  style?: Record<string, string>;
  items?: [[{ name, data }, ...], ...];  // 2次元配列。外側=グループ、内側=アイテム
}
```

最も安全な作り方は、この spec を自分で組み立てず **`catalog_get({ name })` の `template` をそのまま使う**こと。`template` は該当カタログブロックの `items` を `{name, data}` 形式に展開済みで、**全データキーが空文字で埋まっている**ので、値を差し替えるだけで済む。

```jsonc
// catalog_get({ name: "h2" }).template の例
{
  "catalog": "h2",
  "containerProps": { "type": "grid", ... },
  "items": [[{ "name": "title-h2", "data": { "titleH2": "" } }]]
}
```

## `data-bge` → camelCase 変換規則

アイテムの data キーは、そのアイテムの template HTML にある `data-bge="xxx-yyy"` を **frozen-patty が camelCase 化した文字列**（`xxx-yyy` → `xxxYyy`、`abc` → `abc`）。**レンダリング済みのテキストから推測しない** — 同じ見た目でも、プロジェクトによって別のアイテム型・別のデータ形が使われていることがある。

確認する方法は 2 つ:

- 既に類似ブロックがページにあるなら、`block_get({ path, target, readToken })` で `data.items[グループ][アイテム].data` の実キーを読む
- なければ `item_schema({ name })` → `dataKeys`（確定済み camelCase 配列）

| アイテム名 | データキー例                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `title-h2` | `titleH2`                                                                                                              |
| `title-h3` | `titleH3`                                                                                                              |
| `wysiwyg`  | `wysiwyg`（値は HTML 文字列）                                                                                          |
| `image`    | `alt, aspectRatio, caption, command, height, href, loading, media, node, path, scale, scaleType, style, target, width` |
| `button`   | `link, target, kind, beforeIcon, afterIcon, text, subtext`                                                             |

`button` のように見た目が単純でもデータの形が非自明なアイテムがあるため、迷ったら必ず `item_schema` で確認する。

## このプロジェクトの既定カタログ名（差し替え可能）

`h2` `h3` `wysiwyg` `image` `disclosure` `table` `youtube` `image-text` `text-image-text` `text-float-image-end` `text-float-image-start` `text-start-image-end` `image-start-text-end` `button` `file` `content-navigation` `google-maps` `hr` は組み込みの既定値であり、プロジェクトが差し替えている場合がある。**必ず `catalog_list` で実在するカタログを確認する。** `catalog_list` の戻りはカテゴリ名を含む — カテゴリ名は日本語（「見出し」「基本ブロック」等）で定義されていることが多い。

## `page_blocks` 2 回目の絞り込み

2 回目の呼び出しは任意で `filter: { text, regex, blockName, itemName, headingLevel }` と `range: { from, to }` を受け付ける。これ以外の検索手段は無いので、複数候補が残る場合は自分で一覧を読んで判断するか、ユーザーに選ばせる。1 回目のレスポンスの `recommendation` が `filter-first`（ブロック数が多いページ）なら、素の一覧取得より先にこれらの絞り込みを使うことを検討する。

`blocks[]` の各要素（`BlockSummary`）:

```ts
{ index, id: string | null, name, itemNames: string[],
  text: string,          // 可視テキスト先頭200字、空白は詰められる
  truncated: boolean,
  headings: [{ level, text }],
  hasImage: boolean, hasLink: boolean }
```

`id` が `null` のブロックを `target: { id }` で指したいときは、先に `block_ensure_id` を呼んで安定 id（`bge-<n>`）を付与する。**`block_duplicate` で複製したブロックには id が付かない**ので、複製後にそれを id で指すなら追加で `block_ensure_id` を呼ぶ。
