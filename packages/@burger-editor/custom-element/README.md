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

- `h3` - 見出しレベル3
- `h4` - 見出しレベル4
- `h5` - 見出しレベル5
- `h6` - 見出しレベル6

**段落整列:**

- `align-start` - 左寄せ（`<p data-bgc-align="start">`として出力）
- `align-center` - 中央寄せ（`<p data-bgc-align="center">`として出力）
- `align-end` - 右寄せ（`<p data-bgc-align="end">`として出力）

> **ℹ️ スタイルシートが必要**: 段落整列を使用する場合、[@burger-editor/css](../css/)または[@burger-editor/blocks](../blocks/)の`general.css`を読み込む必要があります。

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

#### API

`<bge-wysiwyg-editor>`要素は以下のプロパティとメソッドを提供します：

**プロパティ:**

- `editor` (readonly): TipTapエディタインスタンスへのアクセス
- `name` (readonly): エディタの識別子（`name`属性の値）
- `value` (readonly): 現在のHTML内容
- `innerHTML` (setter): エディタの内容を設定
- `mode` (readonly): 現在のエディタモード（`'wysiwyg'` | `'html'` | `'text-only'`）

**メソッド:**

- `setStyle(css: string)`: エディタのプレビューエリアにカスタムCSSを適用
- `syncWysiwygToTextarea()`: WYSIWYGモードの内容をテキストエリアに同期

**使用例:**

```typescript
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

#### カスタムイベント

`<bge-wysiwyg-editor>`の内部にある`<bge-wysiwyg>`要素は、以下のカスタムイベントを発火します：

**`transaction`イベント**

- **発火タイミング**: エディタの状態が変更されるたび（テキスト入力、フォーマット変更など）
- **用途**: マークアップボタン（太字、斜体など）の状態を更新
- **イベント詳細**: `event.detail.state` にTipTapのエディタ状態が含まれる

```typescript
const wysiwygElement = editor.querySelector('bge-wysiwyg');
wysiwygElement.addEventListener('transaction', (event) => {
	console.log('Editor state changed:', event.detail.state);
	// マークアップボタンの状態を更新する処理
});
```

**`bge:structure-change`イベント**

- **発火タイミング**:
  - HTMLモードに切り替わった時
  - HTMLモードからデザインモードへの切り替えが構造変更により防止された時
  - 構造変更状態が変化した時
- **用途**:
  - マークアップボタンの無効化（HTMLモード時）
  - モード切り替えUIの同期（セレクトボックスやHTMLモードボタン）
  - デザインモードオプションの有効/無効化
- **イベント詳細**: `event.detail.hasStructureChange` に構造変更の有無が含まれる

```typescript
const wysiwygElement = editor.querySelector('bge-wysiwyg');
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	console.log('Structure change:', event.detail.hasStructureChange);
	console.log('Current mode:', wysiwygElement.mode);
	// モード切り替えUIやボタン状態を更新する処理
});
```

#### 内部アーキテクチャ

`<bge-wysiwyg-editor>`は以下の親子構造を持ちます：

```
<bge-wysiwyg-editor>
  ├─ マークアップボタン（太字、斜体など）
  ├─ モード切り替えUI（セレクトボックスまたはHTMLモードボタン）
  └─ <bge-wysiwyg>（子要素：実際のエディタ）
```

**設計思想：**

1. **子要素が状態の所有者**: `<bge-wysiwyg>`が`mode`、`hasStructureChange`、エディタ状態を管理
2. **親要素がUIの監視者**: `<bge-wysiwyg-editor>`が子要素のイベントを監視してUIを更新
3. **イベント駆動**: 子要素の状態変更は必ずイベントで通知される

**UI要素と監視すべきイベントのマッピング:**

| UI要素                                          | 監視すべきイベント                     | 理由                                                                                 |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| マークアップボタン                              | `transaction` + `bge:structure-change` | エディタ状態変更と、モード切り替え（HTMLモード時の無効化）の両方に反応する必要がある |
| セレクトボックス（値）                          | `bge:structure-change`                 | モード切り替え時に表示値を同期                                                       |
| セレクトボックス（wysiwygオプションのdisabled） | `bge:structure-change`                 | 構造変更時にデザインモードを無効化                                                   |
| HTMLモードボタン（ariaPressed）                 | `bge:structure-change`                 | モード切り替え時に状態を同期                                                         |
| HTMLモードボタン（disabled）                    | `bge:structure-change`                 | HTMLモード時に構造変更があれば無効化                                                 |

**初期化パターン:**

親要素の`connectedCallback()`では、以下の順序で初期化します：

```typescript
// 1. 子要素の参照を取得
const wysiwygElement = this.querySelector('bge-wysiwyg');

// 2. イベントリスナーを登録
wysiwygElement.addEventListener('transaction', ...);
wysiwygElement.addEventListener('bge:structure-change', ...);

// 3. 子要素の現在の状態を読み取ってUIを初期化（イベントリスナー登録後）
const initialState = getCurrentEditorState(wysiwygElement);
updateButtonState(button, initialState, this);
modeSelector.value = wysiwygElement.mode;
wysiwygOption.disabled = wysiwygElement.hasStructureChange;
```

**重要**: イベントリスナー登録**前**に子要素の状態を読み取ると、その後のイベントとの同期が取れなくなる可能性があります。必ずイベントリスナー登録**後**に初期化してください。

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

### 実験的機能の設定

`defineBgeWysiwygEditorElement`には実験的機能を有効化するオプションを渡すことができます。

```typescript
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

defineBgeWysiwygEditorElement({
	experimental: {
		textOnlyMode: true, // テキスト編集モードを有効化
	},
});
```

#### `experimental.textOnlyMode`

- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: テキスト編集モード機能を有効化します

**`false`（デフォルト）の場合**:

- HTMLモードボタンのみ表示
- デザインモードとHTMLモードの2モード間をトグル
- HTMLモード中は、すべてのWYSIWYGフォーマットボタン（太字、斜体、リンク、見出しなど）が自動的に無効化されます

**`true`の場合**:

- `<select>`要素で3つのモード切り替えが可能
  - **デザインモード** (wysiwyg): TipTapエディタでリッチテキスト編集
  - **テキスト編集モード** (text-only): HTML構造を保持したままテキストのみ編集
  - **HTMLモード** (html): HTMLソースコードを直接編集
- 構造変更がある場合、デザインモードオプションが自動的に無効化されます
- HTMLモードまたはテキスト編集モード中は、すべてのWYSIWYGフォーマットボタン（太字、斜体、リンク、見出しなど）が自動的に無効化されます

> **ℹ️ 注意**: この機能は実験的であり、将来のバージョンでAPIが変更される可能性があります。

## 技術スタック

- **TipTap** - リッチテキストエディタフレームワーク
- **Web Components** - ブラウザ標準のカスタム要素API

## 依存関係

このパッケージは以下のTipTap拡張機能を使用しています：

- @tiptap/core
- @tiptap/starter-kit
- @tiptap/extension-bold
- @tiptap/extension-italic
- @tiptap/extension-underline
- @tiptap/extension-strike
- @tiptap/extension-subscript
- @tiptap/extension-superscript
- @tiptap/extension-link
- @tiptap/extension-blockquote
- @tiptap/extension-bullet-list
- @tiptap/extension-ordered-list
- @tiptap/extension-heading
- @tiptap/extension-paragraph
- @tiptap/extension-image

およびカスタム拡張機能：

- ParagraphWithAlign - 段落整列属性 (`data-bgc-align`) をサポート
- その他のBurgerEditor独自拡張 (FlexBox, Note, ButtonLikeLink, etc.)

## 関連パッケージ

- [@burger-editor/client](../client/) - Svelteベースのクライアント側UI
- [@burger-editor/core](../core/) - エディタエンジン

## ブラウザサポート

Web Components（Custom Elements v1）をサポートするモダンブラウザで動作します：

- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## コントリビュータ向け情報

### Tiptap拡張機能の追加方法

このパッケージにTiptap拡張機能（新しい要素やフォーマット）を追加する際は、[ARCHITECTURE.md](../../../ARCHITECTURE.md#tiptap拡張機能の追加方法コントリビュータ向け) の「Tiptap拡張機能の追加方法」セクションを参照してください。

以下の情報が含まれています：

- **Mark vs Node の判断基準** - テキスト装飾とブロック要素の違い
- **実装パターン** - 公式拡張の使用 vs カスタム拡張の実装
- **実装チェックリスト** - 8ステップの詳細ガイド
- **よくある落とし穴** - ツールバーボタンが表示されない、属性が保持されないなどの対処法
- **デバッグ方法** - Transactionイベントのリスニング、内部状態確認
- **実装例** - subscript, superscript, paragraph alignment機能の実装

### UI拡張・カスタマイズ時の注意点

`<bge-wysiwyg-editor>`のUIを拡張・カスタマイズする際は、以下のよくある間違いに注意してください：

#### ❌ よくある間違い1: イベントの監視不足

**症状**: ダイアログ表示時やモード切り替え時にUIが正しく更新されない

**原因**: UI要素が必要なイベントを監視していない

**例**: マークアップボタンが`transaction`イベントのみを監視し、HTMLモード切り替え時に無効化されない

```typescript
// ❌ 間違い：transactionイベントしか監視していない
wysiwygElement.addEventListener('transaction', (event) => {
	updateButtonState(button, event.detail.state, this);
});
// → HTMLモードに切り替わってもボタンが有効のまま
```

**解決策**: 上記の「UI要素と監視すべきイベントのマッピング」表を参照し、必要なイベントを全て監視する

```typescript
// ✅ 正解：両方のイベントを監視
wysiwygElement.addEventListener('transaction', (event) => {
	updateButtonState(button, event.detail.state, this);
});
wysiwygElement.addEventListener('bge:structure-change', () => {
	const currentState = getCurrentEditorState(wysiwygElement);
	updateButtonState(button, currentState, this);
});
```

#### ❌ よくある間違い2: 初期化のタイミングミス

**症状**: ダイアログ表示直後だけUIの初期状態が間違っている（その後のイベントでは正しく更新される）

**原因**: イベントリスナー登録**前**に子要素の状態を読み取っている

```typescript
// ❌ 間違い：イベントリスナー登録前に初期化
const initialMode = wysiwygElement.mode;
modeSelector.value = initialMode;

wysiwygElement.addEventListener('bge:structure-change', (event) => {
	modeSelector.value = wysiwygElement.mode;
});
// → 初期化時点の状態と、その後のイベント発火時の状態が不整合になる可能性
```

**解決策**: イベントリスナー登録**後**に初期化する

```typescript
// ✅ 正解：イベントリスナー登録後に初期化
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	modeSelector.value = wysiwygElement.mode;
});

// イベントリスナー登録後に初期状態を設定
modeSelector.value = wysiwygElement.mode;
```

#### ❌ よくある間違い3: イベントで一部のプロパティしか更新しない

**症状**: モード切り替え時に、一部のUIだけが更新されない

**原因**: イベントハンドラーで関連する全てのプロパティを更新していない

**例**: セレクトボックスのオプションの`disabled`だけ更新し、セレクトボックスの`value`を更新していない

```typescript
// ❌ 間違い：wysiwygOptionのdisabledしか更新していない
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	wysiwygOption.disabled = event.detail.hasStructureChange;
	// modeSelector.valueを更新していない！
});
// → HTMLモードに切り替わってもセレクトボックスの表示が「デザインモード」のまま
```

**解決策**: 関連する全てのプロパティを更新する

```typescript
// ✅ 正解：関連する全てのプロパティを更新
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	wysiwygOption.disabled = event.detail.hasStructureChange;
	modeSelector.value = wysiwygElement.mode; // 表示値も同期
});
```

#### デバッグのヒント

問題が発生した場合は、以下を確認してください：

1. **イベントは発火しているか？**

   ```typescript
   wysiwygElement.addEventListener('transaction', (e) =>
   	console.log('transaction', e.detail),
   );
   wysiwygElement.addEventListener('bge:structure-change', (e) =>
   	console.log('structure-change', e.detail),
   );
   ```

2. **子要素の状態は正しいか？**

   ```typescript
   console.log('mode:', wysiwygElement.mode);
   console.log('hasStructureChange:', wysiwygElement.hasStructureChange);
   ```

3. **イベントリスナーは登録されているか？初期化の順序は正しいか？**
   - イベントリスナー登録前に初期化していないか確認

### 開発環境

```bash
# パッケージのビルド
yarn build

# テストの実行
yarn test

# Lintの実行
yarn lint
```

## ライセンス

Dual Licensed under MIT OR Apache-2.0
