# `@burger-editor/migrator`

BurgerEditor のバージョン間でコンテンツを移行するツール。現状 v3 → v4 をサポート。

## Installation

```sh
yarn add @burger-editor/migrator
```

## Usage

```ts
import { createBlock } from '@burger-editor/migrator/v3';

const html = createBlock('text-image', [
	{ wysiwyg: '<p>テキストコンテンツ</p>' },
	{ path: ['/images/photo.jpg'], alt: ['写真の説明'] },
]);
```

`createBlock(blockName, data)` は v3 のブロックテンプレートとアイテムデータから v4 互換 HTML を生成する。内部実装は `@burger-editor/legacy` のテンプレートと `@burger-editor/core` の `itemImport` を組み合わせる。

## ライセンス

Dual Licensed under MIT OR Apache-2.0
