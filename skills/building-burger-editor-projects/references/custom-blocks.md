# custom-blocks — カスタムブロック・アイテムの追加

`data-bge` バインディング DSL、`createItem` の全引数、`BlockCatalog` / `CatalogItem` / `BlockDefinition` の型定義は **[`@burger-editor/core/README.md`](../../packages/@burger-editor/core/README.md) の「アイテム」「カスタムブロックカタログ」節が一次情報**。ここでは重複させず、agent tools と組み合わせて作業する際に必要な事実だけを書く。

## `data-bge` の要点（詳細は core/README.md 参照）

- テンプレート内のフィールド名は**ケバブケース**、保存データ（TypeScript の型・agent tools の `data`）では**キャメルケース**に自動変換される（`image-url` ↔ `imageUrl`）。この変換は `@burger-editor/frozen-patty` が行う
- `data-bge="field"` は内容（`innerHTML`）、`data-bge="field:attr"` は属性、`data-bge=":attr"` は名前=属性名のショートハンド、`data-bge="f1:a1, f2:a2"` は 1 要素に複数バインド
- `text` / `html` / `node` は特別な属性値として扱われる

## 定義したブロック・アイテムを agent tools 側から検証する

ブロック/アイテムを追加・変更したら、`editing-burger-editor-pages` スキルが使う agent tools 経由で意図通りに見えるか確認する:

```
catalog_list          // 新しいカテゴリ・ブロック名が出るか
catalog_get({ name }) // template の items/dataKeys が想定通りか
item_schema({ name }) // dataKeys が data-bge から想定した camelCase になっているか
```

**`item_schema` の `dataKeys` が期待と違うなら、`data-bge` のフィールド名（ケバブケース側）を疑う** — キャメルケースへの変換は自動なので、変換後の名前を手で書いても反映されない。

## カタログのカテゴリ名は表示名

`BlockCatalog` のキー（`config.catalog` のトップレベルキー）はそのままカテゴリの表示名になる。既定カタログは日本語（「見出し」「基本ブロック」等）を使っているが、プロジェクトの言語方針に合わせて変更してよい。`catalog_list` の戻り値の `category` はこのキーをそのまま返す。

## 既存カタログを部分的に拡張する

`config.catalog` はプロジェクトの `BlockCatalog` を丸ごと差し替える。既定カタログ（`@burger-editor/blocks` の `defaultCatalog`）に追加したいだけなら、`defaultCatalog` をインポートしてスプレッドし、新しいカテゴリ/エントリを追加した上で `config.catalog` に渡す。既定カタログを完全に捨てたい場合のみ独自オブジェクトを一から書く。
