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

## ビルド

`@burger-editor/blocks` から CSS を収集して `style.css` に統合する（`build.js`）。blocks の CSS が更新されたら `yarn build` で再生成。

## ライセンス

Dual Licensed under MIT OR Apache-2.0
