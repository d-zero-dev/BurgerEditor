# frozen-patty

[![npm version](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty.svg)](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty)

Pure HTML to JSON converter that not use template engine.

`frozen-patty`は、HTMLとJSONデータの間でシームレスな変換を行う軽量ライブラリです。テンプレートエンジンを必要とせず、HTMLからデータを抽出したり、データをHTMLに適用したりすることができます。BurgerEditorのコンテンツデータとHTML構造を担保するためのコア機能として開発されました。

## 特徴

- 🔄 HTMLからJSONへの抽出とJSONからHTMLへの適用
- 🪶 軽量で依存関係が少ない
- 🌟 テンプレートエンジン不要
- 📝 カスタム属性名のサポート
- 🧩 データ型の自動変換オプション
- 🔧 高度なカスタマイズが可能
- 📋 複数のフィールドと配列データの対応
- 🛡️ XSS対策機能

## インストール

```
$ npm install -D @burger-editor/frozen-patty
```

## 基本的な使い方

### データの抽出 (HTML → JSON)

```js
import frozenPatty from '@burger-editor/frozen-patty';

// 基本的な使い方
frozenPatty('<div data-field="text">value</div>').toJSON(); // => { text: 'value' }
frozenPatty('<div data-field="field-name">value</div>').toJSON(); // => { 'field-name': 'value' }

// 属性値の抽出
frozenPatty('<a href="http://localhost" data-field="href:href">link</a>').toJSON(); // => { 'href': 'http://localhost' }

// カスタム属性名の使用
frozenPatty('<div data-bge="text">value</div>', { attr: 'bge' }).toJSON(); // => { text: 'value' }
```

### データの適用 (JSON → HTML)

```js
// 既存のHTMLにデータをマージする
frozenPatty('<div data-field="text">value</div>').merge({ text: 'merged' }).toHTML();
// => "<div data-field="text">merged</div>";

// 複数のフィールドを持つHTMLにデータをマージする
const html = `
  <div>
    <h1 data-field="title">Old Title</h1>
    <p data-field="description">Old description</p>
    <a data-field="link:href" href="#">Click here</a>
  </div>
`;

const data = {
	title: 'New Title',
	description: 'Updated description',
	link: 'https://example.com',
};

frozenPatty(html).merge(data).toHTML();
// 各フィールドが更新されたHTMLが返されます
// 結果のHTML:
// <div>
//   <h1 data-field="title">New Title</h1>
//   <p data-field="description">Updated description</p>
//   <a data-field="link:href" href="https://example.com">Click here</a>
// </div>
```

## data-field属性のシンタックス

`data-field`属性（またはカスタム属性名）は、HTMLからデータを抽出する際のマッピングと、JSONデータをHTMLに適用する際の対象を定義します。

### 基本形式

```
data-field="フィールド名"
```

**抽出時**：要素の内容を「フィールド名」というキーでJSONに抽出します。

- input、select、textareaなどのフォーム要素の場合は`value`プロパティ
- その他の要素の場合はHTMLを含む`innerHTML`の内容

**適用時**：「フィールド名」に対応するJSONの値が要素の内容に反映されます。

- input、select、textareaなどのフォーム要素の場合は`value`プロパティに反映
- その他の要素の場合は`innerHTML`に反映（HTMLタグも解釈される）

### 属性値の指定

```
data-field="フィールド名:属性名"
```

**抽出時**：要素の指定された属性の値を「フィールド名」というキーでJSONに抽出します。
例: `data-field="href:href"`は`href`属性の値をJSONの`href`キーに抽出します。

**適用時**：「フィールド名」に対応するJSONの値が要素の指定された属性に反映されます。
例: `data-field="href:href"`でJSONに`{ href: "https://example.com" }`がある場合、要素の`href`属性が更新されます。

特別な属性名：

- `text` - 要素のテキストコンテンツを取得/設定（HTMLタグを除いたコンテンツ）
- `html` - 要素のHTML内容を取得/設定（`innerHTML`と同じ）
- `node` - 要素名（タグ名）を取得/設定（**注意**: 設定時は要素そのものを置き換える強力な操作）

### 属性名の省略

```
data-field=":属性名"
```

**抽出時**：フィールド名を省略すると、属性名自体がフィールド名として使用されます。
例: `data-field=":href"`は`href`属性の値をJSONの`href`キーに抽出します。

**適用時**：属性名と同じキーを持つJSONの値が、対応する属性に反映されます。
例: `data-field=":href"`でJSONに`{ href: "https://example.com" }`がある場合、要素の`href`属性が更新されます。

### 複数のフィールド指定

```
data-field="フィールド名1:属性名1, フィールド名2:属性名2"
```

**抽出時**：同じ要素から複数のデータを抽出します。カンマで区切ることで複数のフィールドを指定できます。

**適用時**：各フィールド名に対応するJSONの値が、それぞれ指定された属性または内容に反映されます。

例:

```html
<a href="/url" title="ヒント" data-field="link:href, tooltip:title">リンクテキスト</a>
```

これは `{ link: "/url", tooltip: "ヒント" }` というJSONに変換されます。
逆に、`{ link: "/new-url", tooltip: "新しいヒント" }` というJSONを適用すると、hrefとtitle属性がそれぞれ更新されます。

### 配列データの指定

```html
<ul data-field-list>
	<li data-field="items">Item 1</li>
	<li data-field="items">Item 2</li>
</ul>
```

**抽出時**：同じ`data-field`値を持つ複数の要素からデータが配列として抽出されます。

**適用時**：配列データが対応する要素に反映されます。

- データの数が既存の要素より多い場合：最初の要素をテンプレートとして新しい要素が追加されます
- データの数が既存の要素より少ない場合：余分な要素は削除されます

例: `{ items: ["新アイテム1", "新アイテム2", "新アイテム3"] }` というデータを適用すると、リストが3つの項目を持つように更新されます。

## 高度な使い方

### データ型の自動変換

文字列を適切なデータ型に自動変換するオプションがあります：

```js
const html = `
  <div data-field="isActive">true</div>
  <div data-field="count">5</div>
  <div data-field="price">10.5</div>
`;

const data = frozenPatty(html, {
	typeConvert: true,
}).toJSON();
// => { isActive: true, count: 5, price: 10.5 }
// 文字列ではなく、適切な型に変換されます
```

### 値フィルタの使用

抽出または適用時に値をカスタマイズするフィルタ関数を提供できます：

```js
const valueFilter = (value) => {
	if (typeof value === 'string') {
		return value.toUpperCase();
	}
	return value;
};

const html = '<div data-field="text">hello world</div>';
const data = frozenPatty(html, {
	valueFilter,
}).toJSON();
// => { text: 'HELLO WORLD' }
```

### 複数の属性と値を同時に扱う

同じ要素から複数の属性や値を抽出することができます：

```js
const html =
	'<div data-attr="attr-value" data-field="text, attr:data-attr">text-value</div>';
frozenPatty(html).toJSON();
// => { text: 'text-value', attr: 'attr-value' }
```

### リスト（配列）データの取得

`data-field-list`属性を使用して、同じフィールド名の要素から配列データを抽出できます：

```js
const html = `
  <ul data-field-list>
    <li data-field="items">Item 1</li>
    <li data-field="items">Item 2</li>
    <li data-field="items">Item 3</li>
  </ul>
`;

frozenPatty(html).toJSON();
// => { items: ['Item 1', 'Item 2', 'Item 3'] }
```

### 複合的なデータの抽出と適用

複雑なHTMLから構造化されたデータを抽出する例：

```js
const html = `
  <div>
    <div data-field="title">商品タイトル</div>
    <div data-field="content"><span>HTML内容</span></div>
    <div data-field="meta:data-custom" data-custom="メタデータ"></div>
    <ul data-field-list>
      <li data-field="tags">タグ1</li>
      <li data-field="tags">タグ2</li>
    </ul>
    <ul data-field-list>
      <li><a data-field="links:href, linkTexts" href="/page1">リンク1</a></li>
      <li><a data-field="links:href, linkTexts" href="/page2">リンク2</a></li>
    </ul>
  </div>
`;

const data = frozenPatty(html).toJSON();
// => {
//   title: '商品タイトル',
//   content: '<span>HTML内容</span>',
//   meta: 'メタデータ',
//   tags: ['タグ1', 'タグ2'],
//   links: ['/page1', '/page2'],
//   linkTexts: ['リンク1', 'リンク2']
// }

// データを更新してHTMLを生成
const updatedData = {
	title: '新しいタイトル',
	tags: ['新タグ1', '新タグ2', '新タグ3'], // 要素が増えても対応
	links: ['/new1', '/new2'],
	linkTexts: ['新リンク1', '新リンク2'],
};

const updatedHtml = frozenPatty(html).merge(updatedData).toHTML();
// => 更新されたHTMLが返されます
```

### DOM要素の取得

HTML文字列ではなくDOM要素として結果を取得することもできます：

```js
const element = frozenPatty(html).merge(data).toDOM();
// => DOM Element
```

### XSS対策機能

frozen-pattyはデフォルトでDOM-based XSS攻撃を防止するセキュリティ機能を備えています。

```js
// デフォルトでXSS対策が有効
const fp = frozenPatty('<div data-field="content">コンテンツ</div>');

// XSS対策を無効化したい場合
const fpUnsafe = frozenPatty('<div data-field="content">コンテンツ</div>', {
	xssSanitize: false,
});

// 危険なHTMLを含むデータを適用する例
const data = {
	content: '<script>alert("XSS");</script><p>安全なコンテンツ</p>',
};

// 安全に処理（scriptタグは削除される）
fp.merge(data).toHTML();
// 結果: <div data-field="content"><p>安全なコンテンツ</p></div>

// XSS対策を無効化した場合（非推奨）
fpUnsafe.merge(data).toHTML();
// 結果: <div data-field="content"><script>alert("XSS");</script><p>安全なコンテンツ</p></div>
```

以下のセキュリティ対策が実装されています：

1. 危険な要素の削除：

   - `script`, `style`, `template`, `object`, `embed`, `iframe`, `frame`, `frameset`, `applet`

2. 危険な属性の削除：
   - onloadやonclickなどのイベントハンドラ属性
   - javascript:, data:, vbscript: で始まるURL属性

信頼できない外部データを扱う場合は、必ずデフォルト設定（XSS対策有効）を使用してください。

### 要素の再生成と参照の扱いに関する注意事項

frozen-pattyはデータ適用時に新しい要素を生成します。これにより以下の点に注意が必要です：

```js
// 元のHTML要素
const containerEl = document.querySelector('.container');
const myElement = containerEl.querySelector('.my-element');

// JavaScriptで要素に対してイベントハンドラを追加
myElement.addEventListener('click', () => {
	console.log('クリックされました');
});

// frozenPattyでデータを適用
const htmlString = myElement.outerHTML;
const newHtml = frozenPatty(htmlString).merge({ text: '新しいテキスト' }).toHTML();

// 新しいHTML文字列で要素を更新する方法1: innerHTML + replaceChild
const tempDiv = document.createElement('div');
tempDiv.innerHTML = newHtml;
containerEl.replaceChild(tempDiv.firstElementChild, myElement);

// ⚠️ 警告: この時点でイベントハンドラは失われています
```

または、insertAdjacentHTMLを使う方法もあります：

```js
// 方法2: insertAdjacentHTML + remove
myElement.insertAdjacentHTML('afterend', newHtml);
const newElement = myElement.nextElementSibling;
myElement.remove();

// こちらの方法でも同様にイベントハンドラは失われます
```

特に以下の点に注意してください：

1. **イベントハンドラの喪失**: JavaScript で動的に追加したイベントハンドラは、HTML操作（`outerHTML`/`innerHTML`）では保持されません

2. **オブジェクト参照の更新**: 元の要素への参照（変数）は、新しい要素を生成した後も自動的に更新されません

3. **nodeディレクティブの影響**: `node`ディレクティブは要素そのものを置き換えるため、変更が特に大きくなります

これらの問題を回避するには、以下の方法があります：

- HTML操作後に再度要素を取得し、イベントハンドラを再設定する
- イベントの委譲（親要素でのイベント管理）を利用する
- イベント管理とHTML操作を分離した設計にする

## API

### `frozenPatty(html[, options])`

HTMLからデータを抽出するメインの関数です。

#### Parameters

| parameter | type     | required | descriptions               |
| --------- | -------- | -------- | -------------------------- |
| html      | `string` | required | 元のHTML文字列             |
| options   | `Object` | optional | オプション設定（以下参照） |

#### Options

| options     | type     | default   | descriptions                                                                    |
| ----------- | -------- | --------- | ------------------------------------------------------------------------------- |
| attr        | string   | `"field"` | フィールドとして扱うノードを指定するための**データ属性**名                      |
| typeConvert | boolean  | `false`   | データ属性の値の自動型変換を有効にします（"true"→true, "5"→5, "10.5"→10.5など） |
| valueFilter | Function | -         | 値を処理するカスタムフィルタ関数                                                |
| xssSanitize | boolean  | `true`    | XSS対策機能を有効にします。危険なHTMLコードを自動的に除去します                 |

### `merge(data)`

JSONデータをHTMLにマージします。

| args | type     | required | descriptions |
| ---- | -------- | -------- | ------------ |
| data | `Object` | required | 新しいデータ |

### `toJSON([filtering])`

HTMLからJSONデータに変換します。

| args      | type      | default | descriptions                               |
| --------- | --------- | ------- | ------------------------------------------ |
| filtering | `boolean` | `true`  | `true`の場合、設定されたfilterを適用します |

### `toHTML()`

HTML文字列に変換します。

### `toDOM()`

DOM要素に変換します。

## ライセンス

MIT
