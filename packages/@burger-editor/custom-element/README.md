# @burger-editor/custom-element

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcustom-element.svg)](https://badge.fury.io/js/@burger-editor%2Fcustom-element)

BurgerEditor用のWeb Componentsを提供するパッケージです。TipTapエディタを統合したWYSIWYGエディタカスタム要素を含みます。

## 概要

`@burger-editor/custom-element`は、BurgerEditorで使用するカスタムHTML要素（Web Components）を提供します。主にTipTapベースのWYSIWYGエディタを実装しています。

## インストール

```bash
npm install @burger-editor/custom-element
```

または

```bash
yarn add @burger-editor/custom-element
```

## 提供されるカスタム要素

### `<bge-wysiwyg-editor>`

TipTapベースのWYSIWYGエディタをカスタム要素として提供します。

#### 使用方法

**1. カスタム要素の定義**

```typescript
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

// カスタム要素を定義（通常はアプリケーション起動時に1回実行）
defineBgeWysiwygEditorElement();
```

**2. HTMLでの使用**

```html
<bge-wysiwyg-editor
	name="bge-wysiwyg"
	item-name="wysiwyg"
	commands="bold,italic,underline,strikethrough,link,blockquote,bullet-list,ordered-list,h1,h2,h3,h4,h5,h6">
</bge-wysiwyg-editor>
```

#### 属性

| 属性名    | 型     | 必須 | 説明                                   |
| --------- | ------ | ---- | -------------------------------------- |
| name      | string | Yes  | エディタの識別子                       |
| item-name | string | Yes  | アイテム名（通常は "wysiwyg"）         |
| commands  | string | Yes  | 使用可能なコマンドのカンマ区切りリスト |

#### 使用可能なコマンド

`commands`属性には以下のコマンドを指定できます：

**テキスト装飾:**

- `bold` - 太字
- `italic` - 斜体
- `underline` - 下線
- `strikethrough` - 取り消し線

**リンク:**

- `link` - ハイパーリンク

**引用:**

- `blockquote` - 引用ブロック

**リスト:**

- `bullet-list` - 箇条書きリスト
- `ordered-list` - 番号付きリスト

**見出し:**

- `h1` - 見出しレベル1
- `h2` - 見出しレベル2
- `h3` - 見出しレベル3
- `h4` - 見出しレベル4
- `h5` - 見出しレベル5
- `h6` - 見出しレベル6

#### 例: 基本的なエディタ

```html
<!-- 基本的なテキスト装飾のみ -->
<bge-wysiwyg-editor name="basic-editor" item-name="wysiwyg" commands="bold,italic">
</bge-wysiwyg-editor>
```

#### 例: フル機能エディタ

```html
<!-- すべての機能を有効化 -->
<bge-wysiwyg-editor
	name="full-editor"
	item-name="wysiwyg"
	commands="bold,italic,underline,strikethrough,link,blockquote,bullet-list,ordered-list,h1,h2,h3,h4,h5,h6">
</bge-wysiwyg-editor>
```

## TypeScriptでの使用

```typescript
import {
	defineBgeWysiwygEditorElement,
	BgeWysiwygEditorElement,
} from '@burger-editor/custom-element';

// カスタム要素を定義
defineBgeWysiwygEditorElement();

// TypeScriptの型として使用
const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
```

## 技術スタック

- **TipTap** - リッチテキストエディタフレームワーク
- **Web Components** - ブラウザ標準のカスタム要素API

## 依存関係

このパッケージは以下のTipTap拡張機能を使用しています：

- @tiptap/core
- @tiptap/extension-bold
- @tiptap/extension-italic
- @tiptap/extension-underline
- @tiptap/extension-strike
- @tiptap/extension-link
- @tiptap/extension-blockquote
- @tiptap/extension-bullet-list
- @tiptap/extension-ordered-list
- @tiptap/extension-heading

## 関連パッケージ

- [@burger-editor/client](../client/) - Svelteベースのクライアント側UI
- [@burger-editor/core](../core/) - エディタエンジン

## ブラウザサポート

Web Components（Custom Elements v1）をサポートするモダンブラウザで動作します：

- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## ライセンス

Dual Licensed under MIT OR Apache-2.0
