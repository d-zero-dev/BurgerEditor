# @burger-editor/custom-element

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcustom-element.svg)](https://badge.fury.io/js/@burger-editor%2Fcustom-element)

BurgerEditor用のWeb Componentsを提供するパッケージです。TipTapエディタを統合したWYSIWYGエディタカスタム要素を含みます。

## クイックスタート

### インストール

```bash
yarn add @burger-editor/custom-element
```

### 基本的な使い方

**1. カスタム要素の定義**

```typescript
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

// カスタム要素を定義（通常はアプリケーション起動時に1回実行）
defineBgeWysiwygEditorElement();
```

**2. HTMLでの使用**

```html
<bge-wysiwyg-editor
	name="my-editor"
	item-name="wysiwyg"
	commands="bold,italic,underline,link,blockquote,bullet-list,ordered-list,h3,h4,h5,h6">
</bge-wysiwyg-editor>
```

**3. TypeScriptでの使用**

```typescript
import { BgeWysiwygEditorElement } from '@burger-editor/custom-element';

const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

// 内容を取得
console.log(editor.value);

// 内容を設定
editor.innerHTML = '<p>新しい内容</p>';

// TipTapエディタに直接アクセス
editor.editor.chain().focus().toggleBold().run();
```

## ドキュメント

### 基本ドキュメント

- **[API Reference](./docs/API.md)** - プロパティ、メソッド、属性の詳細仕様
- **[Custom Events](./docs/EVENTS.md)** - `transaction`と`bge:structure-change`イベントの仕様

### 開発者向けドキュメント

- **[Architecture](./docs/ARCHITECTURE.md)** - 内部構造、設計思想、データフローの説明
- **[Customization Guide](./docs/CUSTOMIZATION.md)** - UI拡張方法とよくある間違い

### コントリビュータ向け情報

- **[Tiptap拡張機能の追加方法](../../../ARCHITECTURE.md#tiptap拡張機能の追加方法コントリビュータ向け)** - 新しいコマンドやフォーマットの追加手順

## 実験的機能

### テキスト編集モード

`experimental.textOnlyMode`を有効化すると、3つのモード（デザインモード/テキスト編集モード/HTMLモード）を切り替えられるようになります。

**モード一覧**:

- **デザインモード** (`'wysiwyg'`): TipTapエディタでリッチテキスト編集
- **テキスト編集モード** (`'text-only'`): HTML構造を保持したままテキストのみ編集
- **HTMLモード** (`'html'`): HTMLソースコードを直接編集

```typescript
defineBgeWysiwygEditorElement({
	experimental: {
		textOnlyMode: true,
	},
});
```

詳細は[API Reference](./docs/API.md)を参照してください。

## 技術スタック

- **TipTap** - リッチテキストエディタフレームワーク
- **Web Components** - ブラウザ標準のカスタム要素API

## ブラウザサポート

Web Components（Custom Elements v1）をサポートするモダンブラウザで動作します：

- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## 開発環境

```bash
# パッケージのビルド
yarn build

# テストの実行
yarn test

# Lintの実行
yarn lint
```

## 関連パッケージ

- [@burger-editor/client](../client/) - Svelteベースのクライアント側UI
- [@burger-editor/core](../core/) - エディタエンジン
- [@burger-editor/css](../css/) - スタイルシート
- [@burger-editor/blocks](../blocks/) - ブロック定義

## ライセンス

Dual Licensed under MIT OR Apache-2.0
