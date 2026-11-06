# blocks-and-items — ブロックの組み立て方

## spec は「テンプレートを引いて値だけ差し替える」が基本

`block_insert`/`block_replace`/`page_create`の`blocks`に渡す spec の形:

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

最も安全な作り方は、この spec を自分で組み立てず **`catalog_get({ name })`の`template`をそのまま使う**こと。`template`は該当カタログブロックの`items`を`{name, data}`形式に展開済みで、**全データキーが空文字で埋まっている**ので、値を差し替えるだけで済む。

```jsonc
// catalog_get({ name: "h2" }).template の例
{
  "catalog": "h2",
  "containerProps": { "type": "grid", ... },
  "items": [[{ "name": "title-h2", "data": { "titleH2": "" } }]]
}
```

## `data-bge` → camelCase 変換規則

アイテムの data キーは、そのアイテムの template HTML にある`data-bge="xxx-yyy"`を **frozen-patty が camelCase 化した文字列**（`xxx-yyy` → `xxxYyy`、`abc` → `abc`）。**レンダリング済みのテキストから推測しない** — 同じ見た目でも、プロジェクトによって別のアイテム型・別のデータ形が使われていることがある。

確認する方法は 2 つ:

- 既に類似ブロックがページにあるなら、`block_get({ path, target, readToken })`で`data.items[グループ][アイテム].data`の実キーを読む
- なければ`item_schema({ name })` → `dataKeys`（確定済み camelCase 配列）

| アイテム名 | データキー例                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `title-h2` | `titleH2`                                                                                                              |
| `title-h3` | `titleH3`                                                                                                              |
| `wysiwyg`  | `wysiwyg`（値は HTML 文字列）                                                                                          |
| `image`    | `alt, aspectRatio, caption, command, height, href, loading, media, node, path, scale, scaleType, style, target, width` |
| `button`   | `link, target, kind, beforeIcon, afterIcon, text, subtext`                                                             |

`button`のように見た目が単純でもデータの形が非自明なアイテムがあるため、迷ったら必ず`item_schema`で確認する。

`carousel`はスライド 1 枚につき、`caption` `style` `node` `href`などのスライドごとのキーが 1 要素ずつ並ぶ配列になる。画像のキー（`path` `alt` `width` `height` `loading` `media`）は、スライドの`<picture>`が`image`と同じリストなので、スライドごとに**さらに配列**になる（`image`と同じ並びで、0 番目が`<img>`、1 番目以降が`<source>`）。例: `path: [["/pc1.png", "/sp1.png"], ["/pc2.png"]]`、`alt: [["説明1"], ["説明2"]]`。平らな`path: ["/a.png", "/b.png"]`は「スライド 2 枚にそれぞれ画像 1 枚」として包み直されるので、2 枚目の画像を SP 用にするつもりなら必ず入れ子で書く。**すべてのキーの外側の配列（スライドの数）を同じ長さにそろえる**。短い配列は、足りない位置が 0 番目の値で埋まり、意図しない複製になる。スライドは最低 1 枚。`item_update`で書く前に`item_schema`（`template`の`data-bge-list`の入れ子）と、現在のデータの各配列の長さを確認する。`slideLabel`はキャプション（空なら`alt`）から導かれる値で、エディタでの保存と公開ページのランタイムが導き直す。ただし`item_update`は導き直さないので、スライドを足すときは`slideLabel`も同じ長さにそろえ、そのスライドのキャプション（空なら`alt`）を書く（短いままだと、足りない位置が 0 番目の名前で埋まる）。

**`alt`は空にしない場合がある。** `alt=""`は装飾的な画像を意味して支援技術に無視されるので、リンクやボタンの中では名前が無くなる。編集画面の「決定」はそのような入力を拒み、`item_update`・`block_insert`・`block_replace`・`page_create`・`page_update`も、同じ理由で`invalid`エラーを返して**書き込まない**（`page_update`は 1 つでも拒まれると全体を書かない）。エラーメッセージが、どのアイテム（`carousel`はどのスライド）の何が足りないかを述べている。何も書かれていないので、データを直してそのまま送り直す。書いたアイテムだけが対象で、すでに保存された別のブロックにある名前の無いものは止めない。

- `image`で`href`を入れるか、`node: "button"`と`command: "show-modal"`の**両方**（ポップアップ）にするときは、リンク先や動作が分かる`alt`を必ず書く
- ポップアップは`button`と`show-modal`の組で、リンクは`href`で決まる。保存前に`node` `command` `target`はこの決め方にそろえられる（`node: "button"`だけ・`command`だけでは通常の画像になり、`href`が空の`a`は通常の画像になる）
- `carousel`は、スライドごとに`caption`か`alt`のどちらかを必ず書く（リンク・ポップアップのスライドは`alt`）。`path`を増やすだけの`item_update`は、足したスライドが名前を持たず拒まれるので、`alt`か`caption`も同じ長さで書く

**`image`の 2 枚目以降（SP 画像など）は、`media`を必ず書く。** `<source>`の`media`が空だと、どの画面幅でも条件に合うので、PC 幅でも 2 枚目が表示される。`item_update`・`block_insert`・`block_replace`・`page_create`・`page_update`は、空の`media`を設定の`mediaQueries`の先頭（省略時は`(max-width: 767px)`）で自動的に埋める（`page_update`の`insert`/`replace`は、書いた HTML のブロック内のアイテムを読み戻して埋める）。ただし、自分で適切な`media`を決めて書くほうがよい。`carousel`のスライドに 2 枚目の画像（`path[i][1]`）を書くときも、同じ理由で`media[i][1]`を書く（空なら同じ既定値で埋まる）。

## このプロジェクトの既定カタログ名（差し替え可能）

`h2` `h3` `wysiwyg` `image` `carousel` `disclosure` `table` `youtube` `image-text` `text-image-text` `text-float-image-end` `text-float-image-start` `text-start-image-end` `image-start-text-end` `button` `file` `content-navigation` `google-maps` `hr`は組み込みの既定値であり、プロジェクトが差し替えている場合がある。**必ず`catalog_list`で実在するカタログを確認する。** `catalog_list`の戻りはカテゴリ名を含む — カテゴリ名は日本語（「見出し」「基本ブロック」等）で定義されていることが多い。

## `page_blocks` 2 回目の絞り込み

2 回目の呼び出しは任意で`filter: { text, regex, blockName, itemName, headingLevel }`と`range: { from, to }`を受け付ける。これ以外の検索手段は無いので、複数候補が残る場合は自分で一覧を読んで判断するか、ユーザーに選ばせる。1 回目のレスポンスの`recommendation`が`filter-first`（ブロック数が多いページ）なら、素の一覧取得より先にこれらの絞り込みを使うことを検討する。

`blocks[]`の各要素（`BlockSummary`）:

```ts
{ index, id: string | null, name, itemNames: string[],
  text: string,          // 可視テキスト先頭200字、空白は詰められる
  truncated: boolean,
  headings: [{ level, text }],
  hasImage: boolean, hasLink: boolean }
```

`id`が`null`のブロックを`target: { id }`で指したいときは、先に`block_ensure_id`を呼んで安定 id（`bge-<n>`）を付与する。**`block_duplicate`で複製したブロックには id が付かない**ので、複製後にそれを id で指すなら追加で`block_ensure_id`を呼ぶ。
