# `@burger-editor/custom-element`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcustom-element.svg)](https://badge.fury.io/js/@burger-editor%2Fcustom-element)

TipTap ベースの WYSIWYG エディタを Web Components で提供。

## Installation

```sh
yarn add @burger-editor/custom-element
```

## Usage

```ts
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

defineBgeWysiwygEditorElement();
```

```html
<bge-wysiwyg-editor
	name="my-editor"
	item-name="wysiwyg"
	commands="bold,italic,underline,link,blockquote,bullet-list,ordered-list,h3,h4,h5,h6">
</bge-wysiwyg-editor>
```

```ts
const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
editor.value; // 現在の内容
editor.innerHTML = '<p>新しい内容</p>';
editor.editor.chain().focus().toggleBold().run(); // TipTap への直接アクセス
```

## ドキュメント

設計詳細・API リファレンス・カスタマイズ手順は `docs/` 配下を参照（API.md / EVENTS.md / ARCHITECTURE.md / CUSTOMIZATION.md）。

## 実験的機能

`experimental.textOnlyMode` を有効化すると、`wysiwyg` / `text-only` / `html` の 3 モードを切り替え可能になる:

```ts
defineBgeWysiwygEditorElement({
	experimental: { textOnlyMode: true },
});
```

詳細は `docs/API.md`。

## ライセンス

Dual Licensed under MIT OR Apache-2.0
