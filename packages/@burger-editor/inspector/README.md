# `@burger-editor/inspector`

BurgerEditor HTML を解析・検索するユーティリティ群。CSS 変数検索と jsdom 互換シムを提供。

## Installation

```sh
yarn add @burger-editor/inspector
```

## Usage

```ts
import { scanHtmlFiles, parseSearchQuery } from '@burger-editor/inspector';

const params = parseSearchQuery('margin=normal');
const matches = await scanHtmlFiles('/path/to/documentRoot', params);
```

クエリ形式: `key=value`（完全一致）、`key=*`（ワイルドカード）、`key=a,b`（OR）。AND 検索は `scanHtmlFilesWithMultipleQueries`。

## jsdom 互換シム

jsdom の `CSSStyleDeclaration` は iterable ではないため、`@burger-editor/core` の `exportStyleOptions` 等をそのまま使うには Proxy ラップが必要:

```ts
import { proxyJsdomElementForIterableStyle } from '@burger-editor/inspector';
import { exportStyleOptions } from '@burger-editor/core';

const proxied = proxyJsdomElementForIterableStyle(jsdomElement);
const styleOptions = exportStyleOptions(proxied);
```

## ライセンス

Dual Licensed under MIT OR Apache-2.0
