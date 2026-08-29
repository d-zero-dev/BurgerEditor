# convert-raw-html — 非ブロック生 HTML のブロック化

既存の「ブロック構造でない」生 HTML ページを BurgerEditor のブロック構造に変換するタスク。**専用ツールは無い。** マッピングはプロジェクト固有のカタログ・スタイルに依存するため、AI が候補を考えてユーザーと調整しながら進める。

## 手順

### 1. 元ページと語彙を読む

```
page_get { path: "<page>" }      // 生HTML + 既存Front Matter
catalog_list
style_options_list
container_options_list
```

### 2. 意味のかたまりで分解する

- `<h2>` 単独 → `h2` カタログ、`<h3>` 単独 → `h3` カタログ
- `<p>` / `<ul>` / `<ol>` の連続 → `wysiwyg` にまとめる
- `<img>` 単独 → `image` カタログ、`<table>` → `table` カタログ
- 見出し + テキスト + 画像の複合 → `wysiwyg` にまとめるか、`image-text` 系の構成ブロックに分解
- `<a class="btn">` 等のボタン風要素 → `button` カタログ

**判別が難しいかたまりは推測せずユーザーに確認する。** カタログ名やアイテムのデータ形は `blocks-and-items.md` の手順（`catalog_get` の `template` をそのまま使う）に従う。

### 3. マッピング案を提示する

```
変換案：
| 元 | 変換後 |
|---|---|
| `<h2>会社概要</h2>` | catalog: h2（titleH2 = "会社概要"） |
| `<p>弊社は…</p>` | catalog: wysiwyg |
| ...判別困難な部分... | 候補 A か B、どちらが良いか教えてください |
```

方針が固まった時点で書き込みへ進んでよい（承認を待つ必須手順ではない。ただし候補が割れている箇所は上記の通り必ず聞く）。

### 4. 元ファイルを壊さない順序で置き換える

BurgerEditor のページ系ツールは既存パスへの `page_create` / `page_rename` を上書きしない設計（`exists` エラー）なので、次の順で進める:

1. `page_copy { from, to: "<page>.bak.html" }` — バックアップ
2. `page_create { path: "<page>.new.html", frontMatter: <元のFM>, blocks: [...] }` — 別パスに新規ブロック構造で作成
3. ユーザーに見比べてもらう
4. `page_delete { path: "<page>" }` → `page_rename { from: "<page>.new.html", to: "<page>" }` で差し替える（`page_rename` は宛先既存だと `exists` になるため、この順序が必須）

`.bak.html` はバックアップとして `documentRoot` に残り続け、`page_list` にも表示され続ける。不要になったらユーザーの判断で `page_delete` してもらう（AI 側から無断で消さない）。

### 5. 検証

`page_blocks` で構造、`page_get` で見た目のスニペットを確認する。ずれがあれば該当ブロックを `block_replace` で個別に直す。

## してはいけないこと

- ❌ 元ファイルをいきなり上書きする（必ずバックアップと別パス経由）
- ❌ カタログに無いブロック種を自作 HTML で挿入する
- ❌ Front Matter を引き継がずに新規ページを作る
