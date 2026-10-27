# API Reference

`<bge-wysiwyg-editor>`要素のAPI仕様です。

## プロパティ

### `editor` (readonly)

TipTapエディタインスタンスへのアクセス。

**型**: `Editor`

**使用例**:

```typescript
const editorElement = document.querySelector(
	'bge-wysiwyg-editor',
) as BgeWysiwygEditorElement;

// TipTapエディタに直接アクセス
editorElement.editor.chain().focus().toggleBold().run();
```

### `contentCss`

WYSIWYG の編集面に適用する CSS。公開ページと同じ見た目で編集するために使う。属性ではなくプロパティで、要素が文書に接続される前に設定してもよい（内側の`<bge-wysiwyg>`ができた時点で適用される）。React 19 では JSX の prop としてそのまま渡せる。

**型**: 代入は`string`。読み取りは`string | null`（一度も代入していなければ`null`）

**使用例**:

```typescript
editorElement.contentCss = 'p { line-height: 1.8; }';
```

### `name` (readonly)

エディタの識別子（`name`属性の値）。

**型**: `string`

**使用例**:

```typescript
console.log(editorElement.name); // "my-editor"
```

### `value` (readonly)

現在のHTML内容。

**型**: `string`

**使用例**:

```typescript
const html = editorElement.value;
console.log(html); // "<p>Hello World</p>"
```

### `innerHTML` (setter)

エディタの内容を設定。

**型**: `string`

**使用例**:

```typescript
editorElement.innerHTML = '<p>新しい内容</p>';
```

### `mode` (readonly)

現在のエディタモード。

**型**: `'wysiwyg' | 'html' | 'text-only'`

**モード一覧**:

- `'wysiwyg'`: デザインモード（TipTapエディタでリッチテキスト編集）
- `'html'`: HTMLモード（HTMLソースコードを直接編集）
- `'text-only'`: テキスト編集モード（HTML構造を保持したままテキストのみ編集）

**使用例**:

```typescript
console.log(editorElement.mode); // 'wysiwyg', 'html', or 'text-only'
```

## メソッド

### `setStyle(css: string)`

エディタのプレビューエリアにカスタムCSSを適用します。

**パラメータ**:

- `css`: 適用するCSSスタイル（文字列）

**使用例**:

```typescript
editorElement.setStyle('p { color: red; }');
```

### `syncWysiwygToTextarea()`

WYSIWYGモードの内容をテキストエリアに同期します。

通常は自動的に同期されますが、手動で同期が必要な場合に使用します。

**使用例**:

```typescript
editorElement.syncWysiwygToTextarea();
```

## 属性

### `name`

エディタの識別子。省略すると空文字列。

**型**: `string`

**例**:

```html
<bge-wysiwyg-editor name="my-editor" ...></bge-wysiwyg-editor>
```

### `item-name`

アイテム名（通常は`"wysiwyg"`）。

**型**: `string`

**例**:

```html
<bge-wysiwyg-editor item-name="wysiwyg" ...></bge-wysiwyg-editor>
```

### `commands`

使用可能なコマンドのカンマ区切りリスト。省略すると`BgeWysiwygEditorElement.defaultCommands`を使う。

**型**: `string`

**使用可能なコマンド**:

**テキスト装飾:**

- `bold` - 太字
- `italic` - 斜体
- `underline` - 下線
- `strikethrough` - 取り消し線
- `code` - インラインコード
- `subscript` - 下付き文字
- `superscript` - 上付き文字

**リンク:**

- `link` - ハイパーリンク
- `button-like-link` - ボタン風リンク

**ブロック:**

- `blockquote` - 引用ブロック
- `note` - ノートブロック
- `flex-box` - フレックスボックス

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

**段落整列:**

- `align-start` - 左寄せ
- `align-center` - 中央寄せ
- `align-end` - 右寄せ

**例**:

```html
<bge-wysiwyg-editor
	commands="bold,italic,underline,strikethrough,link,blockquote,bullet-list,ordered-list,h3,h4,h5,h6"
	...></bge-wysiwyg-editor>
```

## 完全な使用例

```typescript
import {
	defineBgeWysiwygEditorElement,
	BgeWysiwygEditorElement,
} from '@burger-editor/custom-element';

// カスタム要素を定義
defineBgeWysiwygEditorElement();

// 要素を取得
const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

// TipTapエディタに直接アクセス
editor.editor.chain().focus().toggleBold().run();

// 現在の内容を取得
console.log(editor.value);

// 現在のモードを確認
console.log(editor.mode); // 'wysiwyg', 'html', or 'text-only'

// 内容を設定
editor.innerHTML = '<p>新しい内容</p>';

// カスタムスタイルを適用
editor.setStyle('p { color: red; }');

// 手動同期（通常は自動的に同期されます）
editor.syncWysiwygToTextarea();
```

## TypeScript型定義

```typescript
interface BgeWysiwygEditorElement extends HTMLElement {
	// プロパティ
	readonly editor: Editor;
	readonly name: string;
	readonly value: string;
	readonly mode: 'wysiwyg' | 'html' | 'text-only';
	get contentCss(): string | null;
	set contentCss(css: string);
	innerHTML: string;

	// メソッド
	setStyle(css: string): void;
	syncWysiwygToTextarea(): void;
}
```

## 関連ドキュメント

- [Events](./EVENTS.md) - カスタムイベント仕様
- [Customization](./CUSTOMIZATION.md) - UI拡張ガイド
