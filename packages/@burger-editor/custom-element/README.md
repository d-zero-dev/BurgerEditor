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
editor.value; // 現在の内容（getter、読み取り専用）
editor.innerHTML = '<p>新しい内容</p>'; // innerHTML の独自 setter が TipTap に同期する
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

- **getter のみ（読み取り専用）**: 現在のエディタ内容を HTML 文字列で返す。TipTap の `editor.getHTML()` 相当だが、本要素の正規化（属性順序・改行など）を経た最終 HTML
- 内容の書き換えは `innerHTML` への代入で行う。本要素は `innerHTML` に独自 setter を定義しており、TipTap の document state に同期させる（詳細は `docs/API.md`）

### `name` / `item-name` 属性

- `name`: フォーム要素としての識別子（複数エディタを区別する用途）
- `item-name`: ブロックカタログ上のアイテム名（通常 `wysiwyg`）。スタイル適用のための DOM 契約

## イベント

### `bge:structure-change`

HTMLモードの内容がデザインモードで表示できない構造を含むかどうか（`hasStructureChange`）が変化したときに発火する CustomEvent。デザインモードへの切り替え UI の有効/無効を同期するのに使う。

```ts
wysiwyg.addEventListener('bge:structure-change', (event) => {
	// detail: { hasStructureChange: boolean }
	designModeButton.disabled = event.detail.hasStructureChange;
});
```

発火タイミングの詳細は [`docs/EVENTS.md`](./docs/EVENTS.md) を参照。

### `transaction`

TipTap のトランザクション単位で発火するイベント。`event.detail.state` にエディタ状態が入り、マークアップボタン（太字・斜体など）の押下状態の同期に使う。

## スタイル

HTMLモードの内容にデザインモードで表示できない構造が含まれるとき、`<bge-wysiwyg>` は textarea の下に補足メッセージを表示する。これはエラーではなく状態の説明なので、既定ではグレー系の中立色で表示する。色は次の CSS カスタムプロパティで変更できる。

| プロパティ                      | 既定値                             |
| ------------------------------- | ---------------------------------- |
| `--bge-notice-background-color` | `#f4f5f7`                          |
| `--bge-notice-border-color`     | `var(--bge-border-color, #d6d8de)` |
| `--bge-notice-text-color`       | `#4a4f5c`                          |

```css
bge-wysiwyg {
	--bge-notice-background-color: #fffbe6;
}
```

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

ツールバーが Invoker Commands API（`command`/`commandfor`）を使用するため、対応ブラウザが下限（ポリフィルなし）。対応状況は https://caniuse.com/mdn-api_commandevent を参照。

## License

Dual Licensed under MIT OR Apache-2.0
