# `@burger-editor/client`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fclient.svg)](https://badge.fury.io/js/@burger-editor%2Fclient)

BurgerEditor のクライアント側 UI パッケージ。Svelte ベースのコンポーネントで構成され、既存の CMS / Web アプリケーションに BurgerEditor を組み込むためのフロントエンド。

## Installation

```sh
yarn add @burger-editor/client @burger-editor/core @burger-editor/blocks
```

## Usage

```ts
import { createBurgerEditorClient } from '@burger-editor/client';

const { engine } = await createBurgerEditorClient({
	root: '#editor',
	config: {
		classList: ['content'],
		stylesheets: ['/styles/main.css'],
		sampleImagePath: '/images/sample.jpg',
	},
	items, // 使用するアイテム定義
	catalog, // ブロックカタログ
	generalCSS, // 一般 CSS
	initialContents: '<div data-bge-name="..." ...></div>',
});
```

`options` は `BurgerEditorEngineOptions` から `ui` / `blockMenu` / `initialInsertionButton` / `defineCustomElement` を除いた型。これら 4 つは client が **Svelte 実装で内部的に上書き**するため、利用側で渡してはいけない（渡しても無視される）。

オプションの詳細は型定義（`BurgerEditorEngineOptions`）を参照。

## License

Dual Licensed under MIT OR Apache-2.0
