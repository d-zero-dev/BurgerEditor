# frozen-patty

[![npm version](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty.svg)](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty)

Pure HTML to JSON converter that does not use a template engine.

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
```

各フィールドが更新されたHTMLが返されます

結果のHTML:

```html
<div>
	<h1 data-field="title">New Title</h1>
	<p data-field="description">Updated description</p>
	<a data-field="link:href" href="https://example.com">Click here</a>
</div>
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
- `innerHTML`に反映されるHTMLは`xssSanitize`オプションに依存し適切にサニタイズされます

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
- `node` - 要素名（タグ名）を取得/設定（**注意**: 設定時は要素そのものを置き換える強力な操作のため、イベントハンドラや参照は失われます）

### 属性名の省略

```
data-field=":属性名"
```

**抽出時**：フィールド名を省略すると、属性名自体がフィールド名として使用されます。
例: `data-field=":href"`は`href`属性の値をJSONの`href`キーに抽出します。

**適用時**：属性名と同じキーを持つJSONの値が、対応する属性に反映されます。
例: `data-field=":href"`でJSONに`{ href: "https://example.com" }`がある場合、要素の`href`属性が更新されます。

#### data-field-\* ショートハンド

```
data-field=":foo"
```

`:foo`のような指定の場合、要素に`foo`属性があるか探しにいきますが、要素に属性（正確にはIDL属性として）が存在しない場合、且つ要素に`data-field-foo`属性があれば、`data-field-foo`と見做されます。

**抽出時**：`:foo`のように指定すると、元の`data-field-foo`属性から値を抽出します。
例: `data-field=":foo"`は`data-field-foo`属性の値をJSONの`foo`キーに抽出します。

```html
<div data-field=":foo" data-field-foo="bar"></div>
```

これは `{ foo: "bar" }` というJSONに変換されます。

**適用時**：フィールド名と同じ名前の`data-field-*`属性に値が反映されます。

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

### picture要素の特別処理

`picture`要素は、レスポンシブ画像を実現するためのHTML要素で、`frozen-patty`では特別な処理を行っています：

**抽出時**：HTMLから次のようなpicture要素がある場合を考えます。

```html
<!-- 元のHTML構造（HTML仕様に従い、source要素が先、img要素が後） -->
<picture data-field-list>
	<source
		data-field="path:srcset, :width, :height, :media"
		srcset="/path/to/large.jpg"
		width="1200"
		height="900"
		media="(min-width: 1000px)" />
	<source
		data-field="path:srcset, :width, :height, :media"
		srcset="/path/to/medium.jpg"
		width="800"
		height="600"
		media="(min-width: 600px)" />
	<img
		data-field="path:src, :alt, :width, :height"
		src="/path/to/default.jpg"
		alt="代替テキスト"
		width="400"
		height="300" />
</picture>
```

このHTMLから抽出する際に、以下の特別な考慮がされます：

1. 配列データの順序：
   - HTML内の`picture`要素では一般的に`source`要素が先に配置され、`img`要素が最後に配置されます
   - 抽出されるデータの配列では逆順になり、img要素のデータが先、source要素のデータが後

つまり、DOM内の配置順序（source要素が先、img要素が後）と、配列データ内の順序（img要素のデータが先、source要素のデータが後）は逆になります。

上記のHTMLを変換すると、以下のようなJSONが生成されます：

```js
// HTMLからJSONへの変換
const htmlString = document.querySelector('picture').outerHTML;
const extractedData = frozenPatty(htmlString).toJSON();
```

抽出結果:

```json
{
	"path": [
		"/path/to/default.jpg", // インデックス0: img要素のsrc
		"/path/to/medium.jpg", // インデックス1: 1つ目のsource要素のsrcset
		"/path/to/large.jpg" // インデックス2: 2つ目のsource要素のsrcset
	],
	"alt": ["代替テキスト"], // 変換機構との一貫性のため配列
	"width": [400, 800, 1200],
	"height": [300, 600, 900],
	"media": [
		null, // 変換機構との一貫性のため配列となり、img要素にはmedia属性を持たないためnull固定
		"(min-width: 600px)",
		"(min-width: 1000px)"
	]
}
```

`picture`要素内の各要素（`source`や`img`）は内部的にリストとして扱われ、それぞれの属性（`srcset`, `width`, `media`など）も対応するインデックスを持つ配列としてデータが格納されます。そのため、`img`要素にしか通常存在しない`alt`属性や、`source`要素にしか存在しない`media`属性も、このデータ構造に合わせて**配列形式で表現されます**（対応する要素がない場合はnullが入ります）。

**適用時**：JSONデータをHTMLに適用する際も特別な処理が行われます。例えば以下のJSONデータを適用すると：

```js
// 適用するJSONデータ
const data = {
	path: [
		'/path/to/default.jpg', // インデックス0：img要素のsrc属性に設定（DOM内では最後）
		'/path/to/medium.jpg', // インデックス1：source要素のsrcset属性に設定
		'/path/to/large.jpg', // インデックス2：source要素のsrcset属性に設定
		'/path/to/x-large.jpg', // インデックス3：source要素のsrcset属性に設定（DOM内では最初）
	],
	alt: ['レスポンシブ画像の説明'], // 抽出機構との互換性のためにimg要素でしか扱わないが配列として指定
	width: [400, 800, 1200, 1600],
	height: [300, 600, 900, 1200],
	media: [
		null, // img要素に対応するインデックスなのでnullを指定
		'(min-width: 600px)', // source要素のmedia属性
		'(min-width: 1000px)', // source要素のmedia属性
		'(min-width: 1400px)', // source要素のmedia属性
	],
};
```

データを適用した結果、以下のようなHTMLが生成されます

```html
<picture data-field-list>
	<source
		data-field="path:srcset, :width, :height, :media"
		srcset="/path/to/x-large.jpg"
		width="1600"
		height="1200"
		media="(min-width: 1400px)" />
	<source
		data-field="path:srcset, :width, :height, :media"
		srcset="/path/to/large.jpg"
		width="1200"
		height="900"
		media="(min-width: 1000px)" />
	<source
		data-field="path:srcset, :width, :height, :media"
		srcset="/path/to/medium.jpg"
		width="800"
		height="600"
		media="(min-width: 600px)" />
	<img
		data-field="path:src, :alt, :width, :height"
		src="/path/to/default.jpg"
		alt="レスポンシブ画像の説明"
		width="400"
		height="300" />
</picture>
```

適用時には以下の特別処理が行われます：

1. 要素の配置と変換：
   - 配列の最初の要素（インデックス0）は`img`要素に変換され、DOMでは最後に配置されます
   - 配列の2番目以降の要素は`source`要素に変換され、配列の逆順にDOMに挿入されます（配列の末尾から先頭方向に）

2. 属性の自動変換：
   - `img`要素：`srcset`属性は`src`属性に変換され、`sizes`属性は削除されます
   - `source`要素：`src`属性は`srcset`属性に変換され、`alt`属性と`loading`属性は削除されます
   - `data-field`属性のシンタックスは、それぞれの要素に対応する属性名に再設定されます
     - `img`要素: `data-field="path:src, :alt, :width, :height"`
     - `source`要素: `data-field="path:srcset, :width, :height, :media"`

3. 順序の反転：
   - 配列データ内の順序：[0, 1, 2, 3]
   - 生成されるHTML内の順序：[3, 2, 1, 0]（0がimg要素）

この特別処理により、HTML標準に準拠した`picture`要素が正しく生成され、ブラウザのレスポンシブ画像機能が適切に動作します。

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

これは`merge()`と`toJSON()`どちらの場合でも適用されますが、`toJSON`だけは`toJSON(false)`とすると無効化できます。

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

`frozen-patty`はデフォルトでDOM-based XSS攻撃を防止するセキュリティ機能を備えています。

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
   - on\*で始まるイベントハンドラ属性
   - javascript:, data:, vbscript: で始まるURLを受け取る`href`、`src`、`action`などの属性

信頼できない外部データを扱う場合は、必ずデフォルト設定（XSS対策有効）を使用してください。

### 要素の再生成と参照の扱いに関する注意事項

`frozen-patty`はデータ適用時に新しい要素を生成します。これにより以下の点に注意が必要です：

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

この要素の再生成は`toHTML`だけでなく`toDOM`を使用したときにも同様です。

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

| options     | type                            | default   | descriptions                                                                    |
| ----------- | ------------------------------- | --------- | ------------------------------------------------------------------------------- |
| attr        | string                          | `"field"` | フィールドとして扱うノードを指定するための**データ属性**名                      |
| typeConvert | boolean                         | `false`   | データ属性の値の自動型変換を有効にします（"true"→true, "5"→5, "10.5"→10.5など） |
| valueFilter | Function (`<T>(value: T) => T`) | -         | 値を処理するカスタムフィルタ関数                                                |
| xssSanitize | boolean                         | `true`    | XSS対策機能を有効にします。危険なHTMLコードを自動的に除去します                 |

### `merge(data)`

JSONデータをHTMLにマージします。

| args | type     | required | descriptions |
| ---- | -------- | -------- | ------------ |
| data | `Object` | required | 新しいデータ |

### `toJSON([filtering])`

HTMLからJSONデータに変換します。

| args      | type      | default | descriptions                                                              |
| --------- | --------- | ------- | ------------------------------------------------------------------------- |
| filtering | `boolean` | `true`  | `true`の場合、コンストラクタで指定した`valueFilter`オプションを適用します |

### `toHTML()`

HTML文字列に変換します。

### `toDOM()`

DOM要素に変換します。

## ライセンス

MIT
