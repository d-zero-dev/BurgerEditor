# `@burger-editor/blocks`

BurgerEditor の標準ブロックと標準アイテムを提供するカタログパッケージ。

ブロック構造の仕様自体は [`@burger-editor/core`](../core/) が定義し、blocks はその上に「すぐ使えるカタログ」を載せる位置づけ。

## Installation

```sh
yarn add @burger-editor/blocks
```

## Usage

```ts
import { items, defaultCatalog } from '@burger-editor/blocks';

const wysiwygItem = items.wysiwyg;
const catalog = defaultCatalog;
```

## Related Packages

| パッケージ                            | 関係                                               | 使い分け                                               |
| ------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| [`@burger-editor/core`](../core/)     | ブロック / アイテムの**仕様**を定義                | 仕様や `createItem` を直接触るなら core も必要         |
| [`@burger-editor/css`](../css/)       | blocks の CSS を 1 ファイルに統合した CDN 用配布   | 表示専用サイトなら css 単独で足りる（blocks は不要）   |
| [`@burger-editor/client`](../client/) | エディタ UI。blocks をデフォルトカタログとして利用 | エディタ UI を組み込むなら client が blocks を引き込む |
| [`@burger-editor/local`](../local/)   | ローカル CMS サーバー                              | サーバー経由で使うなら local が blocks を引き込む      |

## 提供アイテム

`items` から個別に import するか、`defaultCatalog` 経由でブロックの構成要素として利用する。実装は `src/items/*` を参照。

| key             | 用途                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `button`        | ボタン                                                                           |
| `details`       | 折りたたみ要素                                                                   |
| `download-file` | ダウンロードファイル                                                             |
| `google-maps`   | Google Maps 埋め込み                                                             |
| `hr`            | 水平線                                                                           |
| `image`         | 画像                                                                             |
| `import`        | 他ファイルから HTML を取り込むインポートブロック用（`enableImportBlock` で制御） |
| `table`         | テーブル                                                                         |
| `title-h2`      | 大見出し（h2）                                                                   |
| `title-h3`      | 中見出し（h3）                                                                   |
| `wysiwyg`       | リッチテキストエディタ                                                           |
| `youtube`       | YouTube 動画埋め込み                                                             |

## デフォルトカタログ

`defaultCatalog` は以下のカテゴリ構成。実装は `src/catalog/*` を参照。

### 見出し

| ラベル   | name (block) | 使用アイテム |
| -------- | ------------ | ------------ |
| 大見出し | `h2`         | `title-h2`   |
| 中見出し | `h3`         | `title-h3`   |

### 基本ブロック

| ラベル     | name (block) | 使用アイテム |
| ---------- | ------------ | ------------ |
| テキスト   | `wysiwyg`    | `wysiwyg`    |
| 画像       | `image`      | `image`      |
| 折りたたみ | `disclosure` | `details`    |
| テーブル   | `table`      | `table`      |
| YouTube    | `youtube`    | `youtube`    |

### カード

| ラベル                 | name (block)      | 構成                                        |
| ---------------------- | ----------------- | ------------------------------------------- |
| 画像 + テキスト        | `image-text`      | `image` + `wysiwyg` を 3 列グリッドで並べる |
| テキスト+画像+テキスト | `text-image-text` | `wysiwyg`+`image`+`wysiwyg` を 3 列グリッド |

### 画像+テキスト

| ラベル                           | name (block)             | レイアウト                              |
| -------------------------------- | ------------------------ | --------------------------------------- |
| 画像右寄せ: テキスト回り込み     | `text-float-image-end`   | `float: end`（画像が右に浮動）          |
| 画像左寄せ: テキスト回り込み     | `text-float-image-start` | `float: start`（画像が左に浮動）        |
| 画像右寄せ: テキスト回り込み無し | `text-start-image-end`   | テキスト → 画像（左右配置・回り込み無） |
| 画像左寄せ: テキスト回り込み無し | `image-start-text-end`   | 画像 → テキスト（左右配置・回り込み無） |

### ボタン

| ラベル                   | name (block)         | 構成                                                   |
| ------------------------ | -------------------- | ------------------------------------------------------ |
| ボタン                   | `button`             | `button` を 3 つ横並び                                 |
| テキストリンク           | `button`             | リンク形式の `button` を 3 つ（`<ul>` セマンティクス） |
| ファイルダウンロード     | `file`               | `download-file` を 3 つ横並び                          |
| コンテンツナビゲーション | `content-navigation` | ページ内リンク `button` を 4 列グリッドで 8 つ         |

### その他

| ラベル      | name (block)  | 使用アイテム  |
| ----------- | ------------- | ------------- |
| Google Maps | `google-maps` | `google-maps` |
| 区切り線    | `hr`          | `hr`          |

## CSS

各アイテムは個別の `style.css` を持つ。すべて統合した CSS を読み込みたい場合は [`@burger-editor/css`](../css/) を使う。

### `general.css` の DOM 契約

`general.css` はブロック全体の基本スタイルを定義し、以下のセレクタ／カスタムプロパティを「契約」として露出する。利用側 CSS はこの契約に依存して上書き／拡張できる。

| セレクタ / 変数                           | 役割                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `[data-bge-container]`                    | ブロックコンテナ。レイアウト・余白・背景色などの基本スタイルを担う   |
| `grid`                                    | CSS 変数ベースのグリッド（auto-fit / auto-fill 対応）                |
| `inline`                                  | Flexbox ベースの横並びレイアウト                                     |
| `float`                                   | テキスト回り込みレイアウト                                           |
| `[data-bgc-flex-box]`                     | Wysiwyg 内の横並び Flexbox                                           |
| `[data-bgc-align]`                        | Wysiwyg 内段落の左寄せ／中央寄せ／右寄せ                             |
| `--bge-repeat-min-inline-size--{variant}` | グリッドの折り返し基準インラインサイズのプリセット（variant で切替） |

## カスタムアイテム

[`@burger-editor/core`](../core/) の `createItem` を使う。

## License

Dual Licensed under MIT OR Apache-2.0
