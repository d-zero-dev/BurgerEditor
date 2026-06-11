# convert-from-raw-html ワークフロー（ニッチ）

既存の「非ブロック」生 HTML ページを BurgerEditor のブロック構造に変換します。**API では用意していません**。SKILL の中で AI が頑張る作業です。

## なぜ難しいか

- 元の HTML には任意のマークアップが入っている（h1〜h6, p, ul, table, img, blockquote, …）
- BurgerEditor のブロックは「カタログ」に限定されている（h2/h3/wysiwyg/image/table/button/…）
- マッピングはプロジェクト固有のカタログとレイアウトに依存
- 余白/背景/幅などのカスタムスタイルもプロジェクト依存

**完全自動化はできません**。AI が候補マッピングを提案し、ユーザーが承認して進める「対話的変換」です。

## 標準手順

### 1. 元ページを読み込む

```
page_get { path: "<page>" }
```

戻りの `content` が編集可能領域の生 HTML（または Front Matter を除いた全 HTML）。

### 2. プロジェクトの語彙を確認

```
catalog_list
style_options_list
container_options_list
```

カタログ名と利用可能なスタイル軸を把握する。

### 3. 大まかな構造を分解

生 HTML を読み、**意味のかたまり**で分割：

- `<h2>` 単独 → `h2` カタログ
- `<h3>` 単独 → `h3` カタログ
- `<p>`/`<ul>`/`<ol>` の連続 → `wysiwyg` ブロックにまとめる
- `<img>` 単独 → `image` カタログ
- `<table>` → `table` カタログ
- `<h2>` + `<p>` + `<img>` のような複合 → そのまま wysiwyg にまとめるか、`image-text` などの構成ブロックに分解
- `<a class="btn">` 等 → `button` カタログ

判別が難しいかたまりは **次の手順 4 でユーザーに確認**。

### 4. マッピング案を提示

Markdown 表で：

```
変換案：
| 元 | 変換後 |
|---|---|
| `<h2>会社概要</h2>` | catalog: h2 (`title-h2` = "会社概要") |
| `<p>弊社は…</p><p>…</p>` | catalog: wysiwyg |
| `<div class="img-text">…</div>` | catalog: image-text |
| ...判別困難な部分... | ❓ 候補: A or B、どちらが良いか教えてください |

進めて良いですか？
```

### 5. 安全に置き換える

**元ファイルを破壊しない順序**で進める：

1. **バックアップを取る** — `page_copy { from, to: "<original>.bak.html" }`
2. ブロック構造で **新規ページを別パスに作る** — `page_create { path: "<page>.new.html", blocks: [...] }`
3. **ユーザーに見比べてもらう**
4. OK なら `page_rename` で元のパスへ差し替え

破棄して良いと明示されたら直接 `page_create` → `page_delete`（元）→ `page_rename`（新）でも可。

### 6. 検証

`block_list` で構造、`page_get` で見た目（HTML スニペット）を確認。違和感あれば該当ブロックを `block_replace` で微修正。

## してはいけないこと

- ❌ ユーザーマッピング承認なしに変換実行
- ❌ 元ファイルをいきなり上書き
- ❌ カタログにないブロック種を自作 HTML で挿入
- ❌ Front Matter を失わせる（必ず `page_get` で既存 FM を引き継ぐ）
