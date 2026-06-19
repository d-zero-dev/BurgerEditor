# `@burger-editor/frozen-patty`

[![npm version](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty.svg)](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty)

**テンプレートエンジン不要**で HTML ⇄ JSON 相互変換を行う軽量ライブラリ。`data-field` 属性ベースのマッピング契約だけで動作する。

このパッケージは BurgerEditor のコンテンツ構造の核として組み込まれているが、**BurgerEditor とは独立した汎用ライブラリ**として単体利用できる。`data-field` で注釈した既存 HTML があれば、エディタやランタイムを介さず JSON 抽出・JSON マージが可能。

## Installation

```sh
yarn add -D @burger-editor/frozen-patty
```

## Related Packages

| パッケージ              | 関係                                    | このパッケージとの使い分け                                                                  |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@burger-editor/core`   | 上位（core が frozen-patty を内部利用） | ブロック構造・編集エンジンが必要なら core。HTML ⇄ JSON だけで十分なら本パッケージ単独で完結 |
| `@burger-editor/client` | 上位（間接利用）                        | ブラウザ編集 UI を伴う場合のみ                                                              |
| `@burger-editor/blocks` | 連携                                    | 標準アイテム定義の HTML ⇄ JSON 変換に内部利用される                                         |

frozen-patty 単独で足りるケースは「`data-field` 注釈 HTML ↔ JSON の往復だけ」。コンテンツの編集 UI やブロック並べ替えが必要になった時点で core / client を追加する。

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

## `data-field` 属性 DSL

`data-field`（または `attr` オプションで指定したカスタム属性）は、HTML ⇄ JSON のマッピング契約を定義する。

### 構文一覧

| 形式                        | 抽出 / 適用先                                                     | 例                                                   |
| --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| `data-field="name"`         | テキスト/`textContent`（フォーム要素は `value`）                  | `<div data-field="title">T</div>`                    |
| `data-field="name:attr"`    | 指定属性 `attr` の値を `name` キーに対応付け                      | `<a data-field="link:href" href="/">…</a>`           |
| `data-field=":attr"`        | ショートハンド: 属性名そのものをフィールド名に使う                | `<a data-field=":href" href="/">…</a>`               |
| `data-field-foo="bar"`      | `data-field` 属性自体を省略した形。`data-field=":foo"` で参照可能 | `<div data-field=":foo" data-field-foo="bar"></div>` |
| `data-field="f1:a1, f2:a2"` | カンマ区切りで同一要素に複数フィールドをバインド                  | `<a data-field="link:href, tip:title">…</a>`         |

`data-field=":foo"` のショートハンドは、要素に IDL 属性として `foo` が存在しない場合に限り、`data-field-foo` 属性を参照する動作にフォールバックする。

### 特別な属性名

| 属性名 | セマンティクス                                                                         |
| ------ | -------------------------------------------------------------------------------------- |
| `text` | 要素のテキストコンテンツ（HTML タグを除いた文字列）                                    |
| `html` | 要素の `innerHTML`                                                                     |
| `node` | 要素のタグ名。**適用時は要素そのものを置換**するため、イベントハンドラ・参照は失われる |

### 配列フィールド (`data-field-list`)

```html
<ul data-field-list>
	<li data-field="items">Item 1</li>
	<li data-field="items">Item 2</li>
</ul>
```

- 抽出: 同一 `data-field` 値の要素群を配列としてシリアライズ
- 適用: 配列長に合わせて DOM 要素数を自動増減
  - データが多い場合: **最初の要素をテンプレート**として複製追加
  - データが少ない場合: 余分な要素を削除

### `picture` 要素の特別処理

`picture` は HTML 仕様（`source` が先、`img` が最後）と配列順序（`img` が先頭、`source` が後）が**逆**になる点に注意。

抽出例:

```html
<picture data-field-list>
	<source
		data-field="path:srcset, :width, :media"
		srcset="/large.jpg"
		width="1200"
		media="(min-width: 1000px)" />
	<source
		data-field="path:srcset, :width, :media"
		srcset="/medium.jpg"
		width="800"
		media="(min-width: 600px)" />
	<img data-field="path:src, :alt, :width" src="/default.jpg" alt="代替" width="400" />
</picture>
```

→

```json
{
	"path": ["/default.jpg", "/medium.jpg", "/large.jpg"],
	"alt": ["代替"],
	"width": [400, 800, 1200],
	"media": [null, "(min-width: 600px)", "(min-width: 1000px)"]
}
```

適用時の自動変換ルール:

| 配列インデックス | 生成要素 | DOM 位置                       | 属性変換                                 |
| ---------------- | -------- | ------------------------------ | ---------------------------------------- |
| `0`              | `img`    | DOM 末尾                       | `srcset` → `src`、`sizes` 削除           |
| `1..n`           | `source` | DOM 先頭側（配列の逆順で挿入） | `src` → `srcset`、`alt` / `loading` 削除 |

`data-field` 構文も生成要素に合わせて再設定される（`img`: `path:src, …` / `source`: `path:srcset, …`）。配列要素に該当属性が存在しないスロット（例: `img` の `media`）は `null` で埋める。

## Options

`frozenPatty(html, options)` の第 2 引数。

| Option        | Type                 | Default   | 説明                                                                          |
| ------------- | -------------------- | --------- | ----------------------------------------------------------------------------- |
| `attr`        | `string`             | `"field"` | フィールド属性名（`data-` プレフィックスを除いた部分）。`"bge"` で `data-bge` |
| `typeConvert` | `boolean`            | `false`   | `"true"` → `true`、`"5"` → `5`、`"10.5"` → `10.5` の自動型変換                |
| `valueFilter` | `<T>(value: T) => T` | -         | 値変換フィルタ。`merge()` と `toJSON()` に適用。`toJSON(false)` で無効化可能  |
| `xssSanitize` | `boolean`            | `true`    | HTML 挿入時の XSS サニタイズ                                                  |

### XSS サニタイズが除去する対象

`xssSanitize: true`（デフォルト）で、`html` 系の挿入時に以下を除去する。

**タグ**:

```
script, style, template, object, embed, iframe, frame, frameset, applet
```

**属性**:

- `on*` で始まるイベントハンドラ属性（`onclick`、`onerror` ほか）
- `href` / `src` / `action` などの URL 属性のうち、`javascript:` / `data:` / `vbscript:` で始まる値

信頼できない外部データを扱う場合は、必ずデフォルト（`xssSanitize: true`）のまま使用すること。

## API

| Method              | 戻り値    | 説明                                                                      |
| ------------------- | --------- | ------------------------------------------------------------------------- |
| `merge(data)`       | `this`    | JSON データを HTML にマージ                                               |
| `toJSON(filtering)` | `object`  | HTML → JSON。`filtering = false` で `valueFilter` をスキップ（既定 true） |
| `toHTML()`          | `string`  | 結果を HTML 文字列で取得                                                  |
| `toDOM()`           | `Element` | 結果を DOM 要素で取得                                                     |

## 要素再生成に関する注意

`merge()` を経た `toHTML()` / `toDOM()` は**新しい要素を生成**する。元 DOM への参照および JavaScript で追加した**イベントハンドラは引き継がれない**。

```ts
const el = document.querySelector('.my-element');
el.addEventListener('click', handler);

const newHtml = frozenPatty(el.outerHTML).merge({ text: '新' }).toHTML();
el.outerHTML = newHtml; // ← この時点で handler は失われる
```

特に `node` 属性は要素のタグそのものを置換するため影響が最も大きい。回避策:

- 適用後に要素を再取得してイベントを張り直す
- 親要素でのイベント委譲を採用する
- DOM 操作とイベント管理レイヤーを分離した設計にする

## サブパス Export

| パス                                    | 説明                                                        |
| --------------------------------------- | ----------------------------------------------------------- |
| `@burger-editor/frozen-patty`           | メインの `frozenPatty` 関数                                 |
| `@burger-editor/frozen-patty/get-value` | HTML 要素からフィールド値を取得する `getValue`              |
| `@burger-editor/frozen-patty/set-value` | HTML 要素にフィールド値を設定する `setValue` / `setContent` |
| `@burger-editor/frozen-patty/utils`     | HTML 正規化、フィールドパースなどのユーティリティ           |
| `@burger-editor/frozen-patty/types`     | TypeScript 型定義                                           |

```ts
import { getValue } from '@burger-editor/frozen-patty/get-value';
import { setValue } from '@burger-editor/frozen-patty/set-value';
```

## License

Dual Licensed under MIT OR Apache-2.0
