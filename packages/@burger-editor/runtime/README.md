# `@burger-editor/runtime`

BurgerEditor で生成された HTML にインタラクティブ機能を付与するブラウザ用ランタイム。現状は画像モーダル（Invoker Commands API ベース）を提供。

## Installation

```sh
yarn add @burger-editor/runtime
```

## Usage

```ts
import { autoInit } from '@burger-editor/runtime';

autoInit();
```

手動初期化が必要な場合は `initBurgerEditorRuntime(config)` または個別機能の `initImageModal(config)` を使う。設定値は型定義を参照。

## ブラウザサポート

Invoker Commands API: Chrome 135+, Edge 135+, Safari Technology Preview。

## ライセンス

MIT
