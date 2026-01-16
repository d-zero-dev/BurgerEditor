# @burger-editor/utils

[![npm version](https://badge.fury.io/js/@burger-editor%2Futils.svg)](https://badge.fury.io/js/@burger-editor%2Futils)

BurgerEditorで使用する共通ユーティリティ関数集です。

## 概要

`@burger-editor/utils`は、BurgerEditorのコアパッケージや関連パッケージで共有される汎用ユーティリティ関数を提供します。文字列変換、マークダウン処理、日付フォーマット、HTML操作などの機能を含みます。

## インストール

```bash
npm install @burger-editor/utils
```

または

```bash
yarn add @burger-editor/utils
```

## 提供される関数

### 文字列ケース変換

#### `camelCase(str: string): string`

ケバブケース文字列をキャメルケースに変換します。

```typescript
import { camelCase } from '@burger-editor/utils';

camelCase('my-property-name'); // => 'myPropertyName'
camelCase('background-color'); // => 'backgroundColor'
```

#### `kebabCase(str: string): string`

キャメルケース文字列をケバブケースに変換します。

```typescript
import { kebabCase } from '@burger-editor/utils';

kebabCase('myPropertyName'); // => 'my-property-name'
kebabCase('backgroundColor'); // => 'background-color'
```

### マークダウン変換

#### `markdownToHtml(markdown: string): string`

MarkdownテキストをHTMLに変換します。

```typescript
import { markdownToHtml } from '@burger-editor/utils';

const html = markdownToHtml('# 見出し\n\n**太字**のテキスト');
// => '<h1>見出し</h1>\n<p><strong>太字</strong>のテキスト</p>'
```

#### `htmlToMarkdown(html: string): string`

HTMLをMarkdownテキストに変換します。

```typescript
import { htmlToMarkdown } from '@burger-editor/utils';

const markdown = htmlToMarkdown('<h1>見出し</h1><p><strong>太字</strong></p>');
// => '# 見出し\n\n**太字**'
```

### テキストフォーマット

#### `nl2br(text: string): string`

改行コードを`<br />`タグに変換します。

```typescript
import { nl2br } from '@burger-editor/utils';

nl2br('行1\n行2\r\n行3');
// => '行1<br />行2<br />行3'
```

#### `br2nl(html: string): string`

`<br>`タグを改行コード（`\r\n`）に変換します。

```typescript
import { br2nl } from '@burger-editor/utils';

br2nl('行1<br>行2<br />行3');
// => '行1\r\n行2\r\n行3'
```

### 数値・日付フォーマット

#### `formatByteSize(byteSize: number, digits?: number, autoFormat?: boolean): string`

バイト数を人間が読みやすい形式にフォーマットします。

```typescript
import { formatByteSize } from '@burger-editor/utils';

formatByteSize(1024); // => '1.00kB'
formatByteSize(1048576); // => '1.00MB'
formatByteSize(1536, 1); // => '1.5kB'
formatByteSize(500, 2, false); // => '500byte'
```

#### `formatDate(timestamp: number, format: string): string`

Unixタイムスタンプを指定したフォーマットの日付文字列に変換します。

```typescript
import { formatDate } from '@burger-editor/utils';

formatDate(1704067200, 'YYYY-MM-DD'); // => '2024-01-01'
formatDate(1704067200, 'YYYY年MM月DD日'); // => '2024年01月01日'
```

### URL・パス処理

#### `origin(): string`

現在のURLのオリジン（プロトコル + ホスト + ポート）を取得します。

```typescript
import { origin } from '@burger-editor/utils';

// ブラウザで http://localhost:3000/page にアクセスしている場合
origin(); // => 'http://localhost:3000'
```

#### `parseYTId(idOrUrl: string): string`

YouTube URLから動画IDを抽出します。

```typescript
import { parseYTId } from '@burger-editor/utils';

parseYTId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
// => 'dQw4w9WgXcQ'

parseYTId('https://youtu.be/dQw4w9WgXcQ');
// => 'dQw4w9WgXcQ'

parseYTId('dQw4w9WgXcQ');
// => 'dQw4w9WgXcQ'
```

#### `getBackgroundImagePath(value: string): string`

CSS `background-image` プロパティ値からパスを抽出します。

```typescript
import { getBackgroundImagePath } from '@burger-editor/utils';

getBackgroundImagePath('url("/images/bg.jpg")');
// => '/images/bg.jpg'

getBackgroundImagePath("url('https://example.com/bg.png')");
// => 'https://example.com/bg.png'
```

### バリデーション

#### `isValidAsClassName(className: string): boolean`

文字列が有効なCSSクラス名かどうかをチェックします。

```typescript
import { isValidAsClassName } from '@burger-editor/utils';

isValidAsClassName('my-class'); // => true
isValidAsClassName('_private'); // => true
isValidAsClassName('123invalid'); // => false
isValidAsClassName('my class'); // => false
```

### HTML操作

#### `strToDOM(html: string): HTMLElement`

HTML文字列をDOM要素に変換します。

```typescript
import { strToDOM } from '@burger-editor/utils';

const element = strToDOM('<div class="container">コンテンツ</div>');
// => HTMLDivElement
```

#### `normalizeHtml(html: string): string`

HTMLを正規化します（空白の調整など）。

```typescript
import { normalizeHtml } from '@burger-editor/utils';

const normalized = normalizeHtml('<div>  content  </div>');
```

#### `replaceCommentWithHTML(template: string, items: Record<string, string>, replacer: Function): string`

テンプレート内のコメントマーカーをHTMLに置き換えます。

```typescript
import { replaceCommentWithHTML } from '@burger-editor/utils';

const template = '<div><!-- item:text --></div>';
const items = { text: '<p>テキスト</p>' };
const result = replaceCommentWithHTML(template, items, (_, itemHtml) => itemHtml);
// => '<div><p>テキスト</p></div>'
```

### アイテム操作

#### `mergeItems(itemSeeds: Record<string, ItemSeed>, customItems?: Record<string, ItemSeed>): Record<string, ItemSeed>`

アイテム定義をマージします。

```typescript
import { mergeItems } from '@burger-editor/utils';

const defaultItems = { text: textItemSeed };
const customItems = { custom: customItemSeed };
const merged = mergeItems(defaultItems, customItems);
// => { text: textItemSeed, custom: customItemSeed }
```

## 依存関係

- **dayjs** - 日付フォーマット処理
- **marked** - Markdown to HTML変換
- **turndown** - HTML to Markdown変換

## 使用パッケージ

このパッケージは以下のBurgerEditorパッケージで使用されています：

- [@burger-editor/core](../core/)
- [@burger-editor/blocks](../blocks/)
- [@burger-editor/frozen-patty](../frozen-patty/)
- [@burger-editor/migrator](../migrator/)
- [@burger-editor/mcp-server](../mcp-server/)

## ライセンス

Dual Licensed under MIT OR Apache-2.0
