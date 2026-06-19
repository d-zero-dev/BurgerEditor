# `@burger-editor/custom-element`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcustom-element.svg)](https://badge.fury.io/js/@burger-editor%2Fcustom-element)

TipTap ベースの WYSIWYG エディタを Web Components（`<bge-wysiwyg-editor>`）として提供。`@burger-editor/blocks` の `wysiwyg` アイテムの編集 UI 実体。

## Installation

```sh
yarn add @burger-editor/custom-element
```

## Related Packages

| パッケージ                            | 関係                                           | 使い分け                                               |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| [`@burger-editor/client`](../client/) | 本要素を内部で利用する完成形のエディタ UI      | 通常はこちらを使う                                     |
| [`@burger-editor/blocks`](../blocks/) | `wysiwyg` アイテムの編集 UI として本要素を参照 | リッチテキスト編集 UI 単体なら本パッケージのみで足りる |

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
editor.value; // 現在の内容（getter）
editor.value = '<p>新しい内容</p>'; // setter で内容を差し替え
editor.editor.chain().focus().toggleBold().run(); // TipTap への直接アクセス
```

## 属性 / プロパティ

### `commands` 属性

カンマ区切りでツールバーに表示するコマンドを指定する。代表的な値:

| 値                        | 機能             |
| ------------------------- | ---------------- |
| `bold`                    | 太字             |
| `italic`                  | 斜体             |
| `underline`               | 下線             |
| `link`                    | リンク挿入       |
| `blockquote`              | 引用             |
| `bullet-list`             | 箇条書き         |
| `ordered-list`            | 番号付きリスト   |
| `h3` / `h4` / `h5` / `h6` | 見出しレベル切替 |

指定順がそのまま表示順になる。完全な一覧は型定義参照。

### `value` プロパティ

- **getter**: 現在のエディタ内容を HTML 文字列で返す。TipTap の `editor.getHTML()` 相当だが、本要素の正規化（属性順序・改行など）を経た最終 HTML
- **setter**: HTML 文字列を渡すと TipTap の内部状態に反映する。`innerHTML` で直接書き換えるのではなく必ず `value` 経由で設定すること（TipTap の document state と DOM の一貫性を保つため）

### `name` / `item-name` 属性

- `name`: フォーム要素としての識別子（複数エディタを区別する用途）
- `item-name`: ブロックカタログ上のアイテム名（通常 `wysiwyg`）。スタイル適用のための DOM 契約

## イベント

### `bge:structure-change`

エディタ内のブロック構造（段落・リスト・見出しレベル・リンク状態など）が変化したときに発火する CustomEvent。ツールバーの押下状態同期に使う。

```ts
editor.addEventListener('bge:structure-change', (event) => {
	const { detail } = event;
	// detail: {
	//   active: Record<string, boolean>;   // 例: { bold: true, italic: false, 'heading-3': false, ... }
	//   canExecute: Record<string, boolean>; // 各コマンドが現在のカーソル位置で実行可能か
	// }
});
```

`active` のキーは `commands` 属性で指定する値と同じ命名規則。`canExecute` は無効化状態のボタン UI を作るときに使う。

### `transaction`

TipTap のトランザクション単位で発火する低レベルイベント。`bge:structure-change` で間に合わないユースケース（IME 中の入力ステップを観測したい等）でのみ使用。

## ドキュメント

設計詳細・API リファレンス・カスタマイズ手順は `docs/` 配下を参照。

- [`docs/API.md`](./docs/API.md) — プロパティ、メソッド、属性の詳細仕様
- [`docs/EVENTS.md`](./docs/EVENTS.md) — `transaction` / `bge:structure-change` イベントの仕様
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — 内部構造、設計思想、データフロー
- [`docs/CUSTOMIZATION.md`](./docs/CUSTOMIZATION.md) — UI 拡張方法とよくある間違い

## 実験的機能

`experimental.textOnlyMode` を有効化すると、以下の 3 モードを切り替え可能になる:

| モード値      | 名称               | 概要                                    |
| ------------- | ------------------ | --------------------------------------- |
| `'wysiwyg'`   | デザインモード     | TipTap エディタでリッチテキスト編集     |
| `'text-only'` | テキスト編集モード | HTML 構造を保持したままテキストのみ編集 |
| `'html'`      | HTML モード        | HTML ソースコードを直接編集             |

```ts
defineBgeWysiwygEditorElement({
	experimental: { textOnlyMode: true },
});
```

## ブラウザサポート

Web Components（Custom Elements v1）をサポートするモダンブラウザで動作:

- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## License

Dual Licensed under MIT OR Apache-2.0
