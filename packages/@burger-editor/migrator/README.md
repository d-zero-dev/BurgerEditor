# @burger-editor/migrator

[![npm version](https://badge.fury.io/js/@burger-editor%2Fmigrator.svg)](https://badge.fury.io/js/@burger-editor%2Fmigrator)

BurgerEditorのバージョン間でコンテンツを移行するためのツールパッケージです。

## 概要

`@burger-editor/migrator`は、BurgerEditorの異なるバージョン間でブロックやアイテムのデータを移行する機能を提供します。主にv3からv4への移行をサポートしています。

## インストール

```bash
npm install @burger-editor/migrator
```

または

```bash
yarn add @burger-editor/migrator
```

## 使用方法

### v3ブロックの作成

v3形式のブロックテンプレートとアイテムデータから、HTMLブロックを生成します。

```typescript
import { createBlock } from '@burger-editor/migrator/v3';

// v3ブロック名とアイテムデータからHTMLを生成
const html = createBlock('text-image', [
	{
		wysiwyg: '<p>テキストコンテンツ</p>',
	},
	{
		path: ['/images/photo.jpg'],
		alt: ['写真の説明'],
	},
]);

console.log(html);
// => v4互換のHTMLブロックが生成されます
```

### パラメータ

**`createBlock(blockName, data)`**

| パラメータ | 型                  | 説明                 |
| ---------- | ------------------- | -------------------- |
| blockName  | string              | v3のブロック名       |
| data       | readonly ItemData[] | アイテムデータの配列 |

**戻り値:** string - 生成されたHTMLブロック

## 使用例

### テキスト+画像ブロックの移行

```typescript
import { createBlock } from '@burger-editor/migrator/v3';

const blockHtml = createBlock('text-image', [
	{
		wysiwyg: '<h2>見出し</h2><p>本文テキスト</p>',
	},
	{
		path: ['/images/sample.jpg'],
		alt: ['サンプル画像'],
		width: [800],
		height: [600],
	},
]);
```

### カードブロックの移行

```typescript
import { createBlock } from '@burger-editor/migrator/v3';

const cardHtml = createBlock('card-3col', [
	{
		path: ['/images/card1.jpg'],
		alt: ['カード1'],
		wysiwyg: '<h3>カード1</h3><p>説明文</p>',
	},
	{
		path: ['/images/card2.jpg'],
		alt: ['カード2'],
		wysiwyg: '<h3>カード2</h3><p>説明文</p>',
	},
	{
		path: ['/images/card3.jpg'],
		alt: ['カード3'],
		wysiwyg: '<h3>カード3</h3><p>説明文</p>',
	},
]);
```

## 対応バージョン

- **v3 → v4**: 完全サポート
- 将来のバージョン間移行: 計画中

## 内部動作

`createBlock`関数は以下の処理を行います：

1. v3のブロックテンプレートを[@burger-editor/legacy](../legacy/)から取得
2. v3のアイテムテンプレートを[@burger-editor/legacy](../legacy/)から取得
3. ブロックテンプレート内のコメントマーカーをアイテムHTMLで置換
4. 各アイテムデータを[@burger-editor/core](../core/)の`itemImport`機能でHTMLに適用
5. v4互換のHTMLブロックを生成

## 依存パッケージ

- [@burger-editor/core](../core/) - アイテムインポート機能
- [@burger-editor/legacy](../legacy/) - v3テンプレート
- [@burger-editor/utils](../utils/) - ユーティリティ関数

## 関連パッケージ

- [@burger-editor/legacy](../legacy/) - v3互換性サポート
- [@burger-editor/core](../core/) - エディタエンジン

## ライセンス

Dual Licensed under MIT OR Apache-2.0
