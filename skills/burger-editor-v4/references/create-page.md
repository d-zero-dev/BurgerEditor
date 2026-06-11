# create-page ワークフロー

新規ページを作るタスクです。

## 標準手順

### 1. パスとタイトルを確定

ユーザー指示から実パス（または `virtualTree` 有効なら論理パス）と Front Matter 候補を抽出。曖昧なら質問。

### 2. プロジェクトのテンプレートを確認

```
config_resolve
```

→ `newFileContent` がプロジェクトの新規ページひな型（編集可能領域を含む空 HTML + Front Matter）。デフォルトはこれをベースに作る。

### 3. 初期ブロック設計

ユーザーの意図次第で：

- **空ページ**：`page_create { path }` だけで OK
- **見出し + 本文 1 ブロック程度**：`page_create { path, frontMatter, blocks }` に初期ブロックを同梱
- **大量ブロック**：まず `page_create` で空ページを作り、続けて `update_page` の `operations: [{op:'insert', atIndex: 0, spec: …}, …]` で流す

カタログから使うブロックを選ぶときは `catalog_list` で確認。アイテムデータの形式が不明なら `item_schema { name }`。

### 4. 計画を提示

```
新規ページ計画：
- パス: `/about.html`
- Front Matter: { title: "会社概要" }
- 初期ブロック:
  - 0: h2「会社概要」
  - 1: wysiwyg「弊社は…」
よろしいですか？
```

### 5. 書き込み

```
page_create {
  path: "/about.html",
  frontMatter: { "title": "会社概要" },
  blocks: [
    { catalog: "h2", items: [[{ name: "title-h2", data: { titleH2: "会社概要" } }]] },
    { catalog: "wysiwyg", items: [[{ name: "wysiwyg", data: { wysiwyg: "<p>弊社は…</p>" } }]] }
  ]
}
```

データキーは camelCase（`titleH2`、`wysiwyg`、…）。詳細は `references/update-page.md` の「アイテムデータキーの調べ方」を参照。

### 6. 検証

`block_list { path }` で読み戻し、構造が想定通りか確認してユーザーに報告。

## 注意点

- 既存ページがあると `page_create` はエラー。上書きしたいなら一旦 `page_delete` してから（必ずユーザー確認）
- `virtualTree.enabled: true` のプロジェクトでは Front Matter に `path` キー（または `virtualTree.pathKey` で指定された値）が必要。なければ書き戻し時に検証エラー
- ディレクトリ末尾 `/` で指定するとデフォルトで `index.html` が補完される（`config.indexFileName`）
