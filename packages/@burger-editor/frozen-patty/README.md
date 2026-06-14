# `@burger-editor/frozen-patty`

[![npm version](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty.svg)](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty)

**テンプレートエンジン不要**で HTML ⇄ JSON 相互変換を行う軽量ライブラリ。`data-field` 属性ベースのマッピング。BurgerEditor のコンテンツ構造の核として動作する。

## Installation

```sh
yarn add -D @burger-editor/frozen-patty
```

## Usage

### HTML → JSON

```ts
import frozenPatty from '@burger-editor/frozen-patty';

frozenPatty('<div data-field="text">value</div>').toJSON();
// => { text: 'value' }

frozenPatty('<a href="http://localhost" data-field="href:href">link</a>').toJSON();
// => { href: 'http://localhost' }

frozenPatty('<div data-bge="text">value</div>', { attr: 'bge' }).toJSON();
// => { text: 'value' }
```

### JSON → HTML

```ts
const html = `
	<div>
		<h1 data-field="title">Old Title</h1>
		<p data-field="description">Old description</p>
		<a data-field="link:href" href="#">Click here</a>
	</div>
`;

frozenPatty(html)
	.merge({
		title: 'New Title',
		description: 'New description',
		link: 'https://example.com',
	})
	.toHTML();
```

## 主な仕様

- **属性値マッピング**: `data-field="key:attr"` 形式で要素の属性値を JSON プロパティに対応付け（`text:href` なら `href` 属性に値を書く）
- **カスタム属性名**: `{ attr: 'bge' }` で `data-bge` を読むよう変更可能（BurgerEditor は `data-bge` を使う）
- **配列フィールド**: 同名 `data-field` の複数要素は配列としてシリアライズ／逆引きされる
- **XSS 対策**: HTML 文字列の挿入は内部でエスケープされる

詳細な API（`toJSON` / `toHTML` / `merge` / オプション）は型定義および `src/frozen-patty.ts` を参照。

## License

Dual Licensed under MIT OR Apache-2.0
