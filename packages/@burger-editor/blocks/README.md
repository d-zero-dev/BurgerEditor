# `@burger-editor/blocks`

BurgerEditor の標準ブロックと標準アイテムを提供。

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

提供されるアイテム・カタログの一覧と各エントリの実装は `src/items/*` および `src/catalog/*` を参照。

## CSS

各アイテムは個別の `style.css` を持つ。すべて統合した CSS を読み込みたい場合は [`@burger-editor/css`](../css/) を使う。

## カスタムアイテム

[`@burger-editor/core`](../core/) の `createItem` を使う。
