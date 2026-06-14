# `@burger-editor/utils`

BurgerEditor 各パッケージで共有される汎用ユーティリティ関数集。

## Installation

```sh
yarn add @burger-editor/utils
```

## Usage

```ts
import {
	camelCase,
	kebabCase,
	markdownToHtml,
	htmlToMarkdown,
} from '@burger-editor/utils';

camelCase('my-property-name'); // => 'myPropertyName'
kebabCase('backgroundColor'); // => 'background-color'
markdownToHtml('# Title'); // => '<h1>Title</h1>'
```

提供関数（文字列ケース変換 / Markdown ↔ HTML 変換 / 日付フォーマット / HTML 操作系）と各シグネチャは `src/index.ts` および型定義を参照。

## License

Dual Licensed under MIT OR Apache-2.0
