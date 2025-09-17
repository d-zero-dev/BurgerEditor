# @burger-editor/core

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcore.svg)](https://badge.fury.io/js/@burger-editor%2Fcore)

## 概要

ブロックエディタのコア機能を提供するパッケージです。ブロック・アイテムの構造管理、エディタエンジン、UI コンポーネントなどを含みます。

## 主な機能

- **ブロック構造管理**: `data-bge-*` 属性による階層構造の定義・管理
- **エディタエンジン**: ブロックエディタの中核となる制御機能
- **UI コンポーネント**: ダイアログ、メニュー、オプション設定等の基本UI
- **スタイリング機能**: CSS変数による動的スタイル制御
- **型定義**: TypeScript型定義によるタイプセーフな開発支援

## 詳細ドキュメント

このパッケージに関連する詳細な情報は、以下のドキュメントを参照してください：

- **[ブロックアーキテクチャ](../../docs/block-architecture.md)** - ブロック構造の仕様と構成要素
- **[カスタムブロックカタログの作成](../../docs/custom-catalog.md)** - 独自ブロック定義の方法
- **[スタイリングガイド](../../docs/styling-guide.md)** - ブロックの見た目カスタマイズ

## TypeScript型定義

詳細な型定義は [`src/types.ts`](./src/types.ts) を参照してください。主要な型：

- `BlockCatalog`: カタログ全体の型
- `CatalogItem`: カタログ内の個別ブロック項目の型
- `BlockDefinition`: ブロックの定義情報の型
- `BlockData`: ブロックデータの型
- `ContainerProps`: コンテナプロパティの型

## 使用例

```typescript
import { BurgerEditorEngine } from '@burger-editor/core';

// エディタエンジンの初期化
const engine = new BurgerEditorEngine({
	// 設定オプション
});

// 編集可能領域の設定
engine.setup(document.querySelector('[data-bge-editable]'));
```

## 関連パッケージ

- [`@burger-editor/blocks`](../blocks/README.md) - 標準ブロック・アイテム集
- [`@burger-editor/client`](../client/README.md) - クライアントサイドUI
- [`@burger-editor/custom-element`](../custom-element/README.md) - カスタム要素
