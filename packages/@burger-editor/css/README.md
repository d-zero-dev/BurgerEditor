# `@burger-editor/css`

[`@burger-editor/blocks`](../blocks/) の `general.css` と各アイテムの `style.css` を 1 ファイルに統合した配布パッケージ。BurgerEditor の編集機能を使わず、生成された HTML だけを表示する用途で使う。

## Installation

```sh
yarn add @burger-editor/css
```

## Usage

```ts
import '@burger-editor/css';
```

または:

```html
<link rel="stylesheet" href="/node_modules/@burger-editor/css/style.css" />
```

## Related Packages

| パッケージ                            | 関係                                               | 使い分け                              |
| ------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| [`@burger-editor/blocks`](../blocks/) | CSS の一次ソース（本パッケージはここから統合生成） | 表示専用なら css 単独で足りる         |
| [`@burger-editor/core`](../core/)     | DOM 契約（`[data-bge-container]` 等）の定義元      | 表示専用なら不要                      |
| [`@burger-editor/client`](../client/) | エディタ UI。`blocks` の CSS を直接参照            | エディタ UI を組み込むなら css は不要 |

## ブロックコンテナ属性

`[data-bge-container]` の値は BurgerEditor が生成する HTML の契約。値ごとに利用可能なバリアントは以下のとおり（一次ソースとして本パッケージで定義）。

### `grid` — グリッドレイアウト

| 値                 | 用途                                                 |
| ------------------ | ---------------------------------------------------- |
| `grid:1`〜`grid:5` | 1〜5 カラムの固定グリッド                            |
| `grid:auto-fit`    | コンテナ幅に応じて自動でカラム数を調整（空きを伸長） |
| `grid:auto-fill`   | コンテナ幅に応じて自動でカラム数を調整（空きを保持） |

`auto-fit` / `auto-fill` はプリセット（最小カラム幅）と併用する。`grid:auto-fit:--medium` のようにコロン区切りで `--bge-repeat-min-inline-size--{variant}` を指定。デフォルトは `--small` (150px) / `--medium` (300px) / `--large` (500px)。

### `inline` — フレックスボックス横並び

| カテゴリ        | 値                                                                                |
| --------------- | --------------------------------------------------------------------------------- |
| justify-content | `start` / `center` / `end` / `between` / `around` / `evenly`                      |
| align-items     | `align-start` / `align-center` / `align-end` / `align-stretch` / `align-baseline` |
| 折り返し        | `wrap` / `nowrap`                                                                 |

合計 13 種。組み合わせはコロン区切りで `inline:center:align-center:wrap` のように指定。

### `float` — テキスト回り込み

| 値            | 用途                 |
| ------------- | -------------------- |
| `float:start` | 画像などを左側に配置 |
| `float:end`   | 画像などを右側に配置 |

## Wysiwyg 内専用属性

リッチテキストアイテム（`wysiwyg`）の内部で使う属性。

| 属性                  | 値                         | 用途                               |
| --------------------- | -------------------------- | ---------------------------------- |
| `[data-bgc-flex-box]` | （存在するだけで有効）     | リッチテキスト内の横並びレイアウト |
| `[data-bgc-align]`    | `start` / `center` / `end` | 段落の左寄せ / 中央寄せ / 右寄せ   |

## 含まれるアイテムスタイル

`button` / `details` / `download-file` / `google-maps` / `hr` / `image` / `import` / `table` / `title-h2` / `title-h3` / `wysiwyg` / `youtube` の計 12 種（`build.js` が `@burger-editor/blocks/src/items/**/*.css` をすべて統合する）。

## 単独利用

BurgerEditor の編集機能を使わず、生成済み HTML のスタイル付けだけが必要な場合は本パッケージのみで動作する。

```html
<!doctype html>
<html>
	<head>
		<link rel="stylesheet" href="/node_modules/@burger-editor/css/style.css" />
	</head>
	<body>
		<div data-bge-name="text-image" data-bge-container="grid:2">
			<!-- BurgerEditor で生成された HTML -->
		</div>
	</body>
</html>
```

## ビルド

`@burger-editor/blocks` から CSS を収集して `style.css` に統合する（`build.js`）。blocks の CSS が更新されたら `yarn build` で再生成。

## License

Dual Licensed under MIT OR Apache-2.0
