# `@burger-editor/local`

[![npm version](https://badge.fury.io/js/@burger-editor%2Flocal.svg)](https://badge.fury.io/js/@burger-editor%2Flocal)

ローカルファイルシステムで動作する BurgerEditor の CMS 実装。Hono ベースの HTTP サーバ + Vite ベースの React UI。

ファイル I/O / 設定解決 / virtual-path-resolver / Front Matter の本体は [`@burger-editor/file-io`](../file-io/) に集約されており、`local` はそれを再エクスポートする薄いシムに痩身化されている。

## Installation

```sh
yarn add @burger-editor/local
```

## CLI

```sh
npx bge                          # 開発サーバ起動（デフォルト http://localhost:5255）
npx bge search "margin=normal"   # HTML 内の CSS 変数を検索
npx bge search --help
```

### `bge search` クエリ形式

- `{category}={value}` — シンプル
- `{category}=*` — ワイルドカード
- `{category}={v1,v2,...}` — OR
- 複数クエリ — AND（同じ要素にすべてマッチ）

`--url` で localhost URL 形式出力。

## プログラマブル API

ファイルアップロード等を Hono サーバと共通ロジックで利用できる:

```ts
import { upload } from '@burger-editor/local/upload';
import { getCandidateName } from '@burger-editor/local/get-candidate-name';
```

`EncodedFileName` 型を使ってファイル名の取り違えを型レベルで防止する設計。

## 内部構造の注意

`local/src/helpers/{front-matter,html-detection,no-editable-area-error,edit-content}.ts` および `local/src/model/{file-tree,virtual-path-resolver,get-user-config}.ts` は **互換性のためのシム re-export**。本体は `@burger-editor/core` / `@burger-editor/file-io` 側にあるため、修正はそちらで行うこと。

## License

Dual Licensed under MIT OR Apache-2.0
