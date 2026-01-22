# @burger-editor/core

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcore.svg)](https://badge.fury.io/js/@burger-editor%2Fcore)

## 概要

ブロックエディタのコア機能を提供するパッケージです。ブロック・アイテムの構造管理、エディタエンジン、UI コンポーネントなどを含みます。

## ブロックの仕様

### ブロックの構成

```html
<div data-bge-name="{ブロック名}" data-bge-container="inline:center:wrap">
	<div data-bge-container-frame>
		<div data-bge-group>
			<div data-bge-item>{アイテムの01HTML}</div>
			<div data-bge-item>{アイテムの02HTML}</div>
		</div>
		<div data-bge-group>
			<div data-bge-item>{アイテムの01HTML}</div>
			<div data-bge-item>{アイテムの02HTML}</div>
		</div>
		<div data-bge-group>
			<div data-bge-item>{アイテムの01HTML}</div>
			<div data-bge-item>{アイテムの02HTML}</div>
		</div>
	</div>
</div>
```

### ブロックを構成する要素

- コンテナ: `data-bge-container`
- コンテナフレーム: `data-bge-container-frame`
- グループ: `data-bge-group`
- アイテム: `data-bge-item`

#### コンテナ

`data-bge-container`属性はコンテナの性質を表します。ブロックのルート要素にあたります。属性値はコロン区切りで表現し、先頭はコンテナのタイプを表し、その後にオプションが続きます。

`data-bge-name`属性はブロックの名前を表します。ブロック選択の際に利用されますが、振る舞いには影響しません（⚠️ つまり、この属性を利用したスタイル変更は推奨されません）。

この要素には `container-name: bge-container` が付与されます。これは、CSSコンテナクエリのコンテナ名として利用されます。

##### コンテナタイプ

アイテムの配置方法を表します。

- `grid`: グリッドに並べる（ `display: block grid;` ）
- `inline`: インライン方向に並べる（ `display: block flex;` ）
- `float`: 先頭のアイテムを回り込みさせる

##### `grid`オプション

- `[数値]`: グリッドの列数（ `grid-template-columns: repeat([数値], 1fr);` ） 1〜5の範囲で指定可能。
- `auto-fit`: 自動列数調整（空白最小）（ `grid-template-columns: repeat(auto-fit, minmax(calc(var(--bge-auto-fit-base-width) / [数値]), 1fr));` ）
  規定幅（CSSカスタムプロパティ`--bge-auto-fit-base-width`）を基準に指定した列数で割った数値に近い幅を保ちながら、コンテナの幅に応じて自動的に列数を調整します。空のトラックは折りたたまれ、既存のアイテムが利用可能なスペースを埋めるように拡張されます。
- `auto-fill`: 自動列数調整（空白保持）（ `grid-template-columns: repeat(auto-fill, minmax(calc(var(--bge-auto-fit-base-width) / [数値]), 1fr));` ）
  規定幅を基準に自動的に列数を調整しますが、アイテムが不足している場合でも空のトラックが保持され、レイアウト内に空白が生じます。

例: `data-bge-container="grid:3"`、`data-bge-container="grid:3:auto-fit"`、`data-bge-container="grid:3:auto-fill"`

##### `inline`オプション

- `center`: 中央寄せ（ `justify-content: center;` ）
- `start`: 左寄せ（ `justify-content: start;` ）
- `end`: 右寄せ（ `justify-content: end;` ）
- `between`: 両端寄せ（ `justify-content: space-between;` ）
- `around`: 左右余白均等（ `justify-content: space-around;` ）
- `evenly`: 要素間均等（ `justify-content: space-evenly;` ）
- `align-center`: 垂直中央寄せ（ `align-items: center;` ）
- `align-start`: 上寄せ（ `align-items: start;` ）
- `align-end`: 下寄せ（ `align-items: end;` ）
- `align-stretch`: 伸縮（ `align-items: stretch;` ）
- `align-baseline`: ベースライン（ `align-items: baseline;` ）
- `wrap`: 折り返し（ `flex-wrap: wrap;` ）
- `nowrap`: 折り返さない（ `flex-wrap: nowrap;` ）

例: `data-bge-container="inline:space-between:wrap"`

##### `float`オプション

- `start`: 左寄せ（ `float: inline-start;` ）
- `end`: 右寄せ（ `float: inline-end;` ）

例: `data-bge-container="float:start"`

##### 共通オプション

- `immutable`: アイテムの増減ができなくなります。また、タイプが`grid`の場合は列数の変更ができなくなります。
- `linkarea`: グループ全体をリンクエリアとして機能させます。有効にすると、各グループ要素に `data-bge-linkarea` 属性が付与されます。この属性は、CSSやJavaScriptでグループ全体をクリック可能な領域として扱う際に使用できます。

#### コンテナフレーム

コンテナフレームは`data-bge-container-frame`属性をもつ要素で、コンテナの中身をラップします。

`grid`や`inline`の性質が実際に適用される要素です。

※CSS Containerは自身に再帰的にクエリーや`cq`系単位が使えない仕様があるため、CSS Containerを適用させる「コンテナ」と、コンテナの性質（`grid`や`inline`）を適用させる「コンテナフレーム」に分けています。

#### グループ

グループは`data-bge-group`属性をもつ任意の要素です。コンテナ内の直下に配置され、アイテムのまとまりをつくります。このグループは「要素の追加/削除」機能で**増減することができます**。グループがない場合は「要素の追加/削除」機能が無効になります。

#### アイテム

アイテムは`data-bge-item`属性をもつ要素で、コンテンツ編集可能な要素をラップします。

## カスタムブロックカタログの作成

独自のブロックカタログを定義することで、プロジェクトに適した自由なブロック構成を作成できます。

### データ構造

カスタムブロックカタログは `BlockCatalog`、`CatalogItem`、`BlockDefinition` 型で定義します。詳細な型定義は [`src/types.ts`](./src/types.ts) を参照してください。

### カスタムカタログの例

```javascript
export const customCatalog = {
	// カテゴリ名
	カスタムブロック: [
		{
			label: 'カスタムテキスト+画像',
			definition: {
				name: 'custom-text-image',
				containerProps: {
					type: 'grid',
					columns: 2,
				},
				classList: ['custom-block'],
				style: {
					'max-width': '800px',
					margin: '0 auto',
				},
				items: [
					// 第一グループ：テキストと画像
					['wysiwyg', 'image'],
					// 第二グループ：ボタン
					['button'],
				],
			},
		},
	],
	特殊レイアウト: [
		{
			label: '3列カード',
			definition: {
				name: 'three-column-card',
				containerProps: {
					type: 'grid',
					columns: 3,
					justify: 'center',
				},
				items: [
					// 各列に画像とテキストを配置
					[
						{ name: 'image', data: { alt: 'カード1' } },
						{ name: 'wysiwyg', data: { wysiwyg: '<h3>タイトル1</h3>' } },
					],
					[
						{ name: 'image', data: { alt: 'カード2' } },
						{ name: 'wysiwyg', data: { wysiwyg: '<h3>タイトル2</h3>' } },
					],
					[
						{ name: 'image', data: { alt: 'カード3' } },
						{ name: 'wysiwyg', data: { wysiwyg: '<h3>タイトル3</h3>' } },
					],
				],
			},
		},
	],
};
```

### カタログの結合

既存のデフォルトカタログと独自カタログを組み合わせることも可能です：

```javascript
import { defaultCatalog } from '@burger-editor/blocks';

export const catalog = {
	...defaultCatalog,
	...customCatalog,
};
```

### ブロック構成のポイント

- **`items`配列**: 第1階層がグループ、第2階層がアイテムを表します
- **アイテム指定**: 文字列でアイテム名のみ、またはオブジェクトで初期データ付きで指定
- **コンテナプロパティ**: レイアウト方法（grid、inline、float）とそのオプションを指定
- **スタイリング**: `classList`で CSS クラス、`style`でインラインスタイルを適用

## アイテムの仕様

### アイテムとは

アイテムはブロック内の個々のコンテンツ要素を表します。例えば、テキスト、画像、ボタンなどがアイテムにあたります。各アイテムは編集可能なデータを持ち、専用のエディタUIを通じて編集できます。

### データ構造

アイテムのデータは `ItemData` インターフェースに準拠します。これは文字列、数値、真偽値、null、またはそれらの配列をプロパティとして持つオブジェクトです。

```typescript
interface ItemData {
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| (string | number | boolean | null | undefined)[];
}
```

### アイテムテンプレートとデータのバインディング

アイテムのテンプレートとデータは、`data-bge` 属性を使って紐付けます。この属性により、データとHTML要素を関連付け、動的にコンテンツを更新できます。

**重要**: テンプレート内のフィールド名はケバブケース（`kebab-case`）で記述し、TypeScriptのデータ型ではキャメルケース（`camelCase`）に自動変換されます。

#### テキストコンテンツへのバインディング

要素の内容（innerHTML）にデータをバインドする最も基本的な形式です：

```typescript
export default createItem<{
	title: string;
	description: string;
}>({
	version: '1.0.0',
	name: 'text-item',
	template: `
		<div>
			<h2 data-bge="title">初期タイトル</h2>
			<p data-bge="description">初期説明文</p>
		</div>
	`,
	editor: `
		<input type="text" data-bge="title" />
		<textarea data-bge="description"></textarea>
	`,
});
```

データを渡すと、要素の内容が置き換わります：

```javascript
// データ
{
	title: '新しいタイトル',
	description: '<strong>HTML</strong>も使えます'
}

// 結果のHTML
<h2 data-bge="title">新しいタイトル</h2>
<p data-bge="description"><strong>HTML</strong>も使えます</p>
```

#### 属性へのバインディング

`data-bge="フィールド名:属性名"` の形式で、HTML属性にデータをバインドします：

```typescript
export default createItem<{
	url: string;
	linkText: string;
	imageUrl: string;
	imageAlt: string;
}>({
	version: '1.0.0',
	name: 'link-with-image',
	template: `
		<a data-bge="url:href, link-text">
			<img data-bge="image-url:src, image-alt:alt" />
		</a>
	`,
	editor: `
		<input type="url" data-bge="url" placeholder="リンクURL" />
		<input type="text" data-bge="link-text" placeholder="リンクテキスト" />
		<input type="url" data-bge="image-url" placeholder="画像URL" />
		<input type="text" data-bge="image-alt" placeholder="代替テキスト" />
	`,
});
```

データを渡すと：

```javascript
// データ（キャメルケース）
{
	url: 'https://example.com',
	linkText: '詳細を見る',
	imageUrl: '/path/to/image.jpg',
	imageAlt: 'サンプル画像'
}

// 結果のHTML
<a href="https://example.com" data-bge="url:href, link-text">
	詳細を見る
	<img src="/path/to/image.jpg" alt="サンプル画像" data-bge="image-url:src, image-alt:alt" />
</a>
```

1つの要素に複数のバインディングを指定できることに注目してください。この例では：

- `data-bge="url:href, link-text"` - `url`を`href`属性に、`linkText`（キャメルケース）をテキストコンテンツに
- `data-bge="image-url:src, image-alt:alt"` - `imageUrl`を`src`属性に、`imageAlt`を`alt`属性に

#### ショートハンド記法

フィールド名と属性名が同じ場合、`:属性名`のショートハンドが使えます：

```typescript
export default createItem<{
	href: string;
	target: string;
	text: string;
}>({
	version: '1.0.0',
	name: 'simple-link',
	template: `
		<a data-bge=":href, :target, text">リンク</a>
	`,
	editor: `
		<input type="url" data-bge="href" />
		<select data-bge="target">
			<option value="">同じタブ</option>
			<option value="_blank">新しいタブ</option>
		</select>
		<input type="text" data-bge="text" />
	`,
});
```

```javascript
// データ
{
	href: 'https://example.com',
	target: '_blank',
	text: '外部リンク'
}

// 結果のHTML
<a href="https://example.com" target="_blank" data-bge=":href, :target, text">外部リンク</a>
```

#### 配列データの扱い

`data-bge-list` 属性を親要素に指定すると、配列データから複数の要素を生成できます：

```typescript
export default createItem<{
	items: string[];
	urls: string[];
}>({
	version: '1.0.0',
	name: 'link-list',
	template: `
		<ul data-bge-list>
			<li>
				<a data-bge="urls:href, items">初期リンク</a>
			</li>
		</ul>
	`,
	editor: `
		<!-- エディタでのリスト編集UI -->
	`,
});
```

配列データを渡すと、テンプレートの最初の子要素を元に必要な数だけ複製されます：

```javascript
// データ
{
	items: ['ホーム', 'サービス', 'お問い合わせ'],
	urls: ['/', '/service', '/contact']
}

// 結果のHTML（3つのli要素が生成される）
<ul data-bge-list>
	<li><a href="/" data-bge="urls:href, items">ホーム</a></li>
	<li><a href="/service" data-bge="urls:href, items">サービス</a></li>
	<li><a href="/contact" data-bge="urls:href, items">お問い合わせ</a></li>
</ul>
```

配列の各インデックスが対応する要素に適用されます。

#### 実践例：カードアイテム

実際のアイテムを作成する完全な例：

```typescript
export default createItem<{
	imageUrl: string;
	imageAlt: string;
	title: string;
	description: string;
	buttonUrl: string;
	buttonText: string;
	buttonTarget: string;
}>({
	version: '1.0.0',
	name: 'card',
	template: `
		<article class="card">
			<img data-bge="image-url:src, image-alt:alt" src="/default.jpg" alt="" />
			<div class="card-body">
				<h3 data-bge="title">カードタイトル</h3>
				<p data-bge="description">カードの説明文がここに入ります。</p>
				<a data-bge="button-url:href, :target, button-text" href="#" class="button">
					もっと見る
				</a>
			</div>
		</article>
	`,
	style: `
		.card {
			border: 1px solid #ddd;
			border-radius: 8px;
			overflow: hidden;
		}
		.card img {
			width: 100%;
			height: auto;
		}
		.card-body {
			padding: 1rem;
		}
	`,
	editor: `
		<div>
			<label>画像URL</label>
			<input type="url" data-bge="image-url" />
			
			<label>画像の代替テキスト</label>
			<input type="text" data-bge="image-alt" />
			
			<label>タイトル</label>
			<input type="text" data-bge="title" />
			
			<label>説明文</label>
			<textarea data-bge="description"></textarea>
			
			<label>ボタンURL</label>
			<input type="url" data-bge="button-url" />
			
			<label>ボタンテキスト</label>
			<input type="text" data-bge="button-text" />
			
			<label>リンク先</label>
			<select data-bge="target">
				<option value="">同じタブで開く</option>
				<option value="_blank">新しいタブで開く</option>
			</select>
		</div>
	`,
});
```

この例では：

- テンプレートとエディタ内: ケバブケース（`image-url`、`button-text`など）
- TypeScriptの型定義: キャメルケース（`imageUrl`、`buttonText`など）
- 画像、テキスト、リンクのすべての要素がデータにバインドされ、エディタから簡単に編集可能

### カタログでのアイテム指定

ブロックカタログでアイテムを指定する方法は2つあります：

#### 1. アイテム名のみ

```javascript
{
	items: [
		['wysiwyg', 'image'],  // 初期データなし
	],
}
```

#### 2. アイテム名と初期データ

```javascript
{
	items: [
		[
			{ name: 'wysiwyg', data: { wysiwyg: '<h3>初期テキスト</h3>' } },
			{ name: 'image', data: { alt: '画像の説明' } },
		],
	],
}
```

### カスタムアイテムの作成

独自のアイテムを作成するには、`createItem` 関数を使用します。

#### 基本的なアイテムの作成

最もシンプルな形式：

```typescript
import { createItem } from '@burger-editor/core';

export type SimpleTextData = {
	text: string;
};

export default createItem<SimpleTextData>({
	version: '1.0.0',
	name: 'simple-text',
	template: '<p data-bge="text">初期テキスト</p>',
	style: 'p { margin: 1em 0; }',
	editor: '<input type="text" data-bge="text" placeholder="テキストを入力" />',
});
```

この例では：

- `version`: アイテムのバージョン（マイグレーション時に使用）
- `name`: アイテムの一意な名前
- `template`: 表示用のHTMLテンプレート
- `style`: アイテム専用のCSS
- `editor`: エディタUIのHTMLテンプレート

#### editorOptionsによる高度なカスタマイズ

`editorOptions`を使用すると、アイテムの動作を細かく制御できます：

> **📖 詳細なAPIリファレンス**: エディターAPIの詳細な使い方と実践的なユースケースについては、[アイテムエディターAPIガイド](../../docs/item-editor-api.md)を参照してください。

```typescript
import { createItem } from '@burger-editor/core';

export type ToggleItemData = {
	enabled: boolean;
	label: string;
	description: string;
};

export default createItem<ToggleItemData>({
	version: '1.0.0',
	name: 'toggle-item',
	template: `
		<div data-bge="enabled:data-enabled" data-enabled="false">
			<strong data-bge="label">ラベル</strong>
			<p data-bge="description">説明文</p>
		</div>
	`,
	style: `
		[data-enabled="true"] {
			background: #e8f5e9;
			border-left: 4px solid #4caf50;
			padding: 1rem;
		}
	`,
	editor: `
		<div>
			<label>
				<input type="checkbox" data-bge="enabled:checked" />
				有効にする
			</label>
			<input type="text" data-bge="label" placeholder="ラベル" />
			<textarea data-bge="description" placeholder="説明文"></textarea>
		</div>
	`,
	editorOptions: {
		// エディタを開く前のデータ変換
		beforeOpen: (data) => {
			// データからUI用の値を生成
			return {
				...data,
				// 必要に応じてデータを変換
			};
		},

		// エディタを開いた時の処理
		open: async (data, editor) => {
			// エディタ内のUI要素にイベントリスナーを追加
			const checkbox = editor.el.querySelector('input[type="checkbox"]');
			const textInputs = editor.el.querySelectorAll('input[type="text"], textarea');

			// チェックボックスの状態に応じて他の入力欄を有効/無効化
			editor.onChange('$enabled', (enabled) => {
				textInputs.forEach((input) => {
					(input as HTMLInputElement).disabled = !enabled;
				});
			});
		},

		// データ保存前の変換
		beforeChange: async (newData) => {
			// 保存前にデータを整形
			return {
				...newData,
				label: newData.label.trim(),
				description: newData.description.trim(),
			};
		},
	},
});
```

#### editorOptionsの各メソッド詳細

##### `beforeOpen(data, editor): T`

エディタを開く直前に呼ばれます。保存されているデータをエディタ用に変換する場合に使用します。

実例：画像アイテムでの使用（boolean値への変換）

```typescript
editorOptions: {
	beforeOpen: (data) => {
		// データからUI用の値を生成
		const lazy = data.loading.includes('lazy');
		const popup = data.node === 'button' && data.command === 'show-modal';
		const targetBlank = data.node === 'a' && data.target === '_blank';

		return {
			...data,
			lazy, // ('eager' | 'lazy')[] → boolean
			popup, // node + command → boolean
			targetBlank, // node + target → boolean
		};
	},
}
```

実例：テーブルアイテムでの使用（MarkdownからHTMLへの変換）

```typescript
editorOptions: {
	beforeOpen: (data) => {
		return {
			...data,
			// 保存データ（Markdown）をエディタ用（HTML）に変換
			td: data.td.map(htmlToMarkdown),
		};
	},
}
```

##### `open(data, editor): Promise<void> | void`

エディタが開いた後に呼ばれます。エディタUI内のカスタムロジックを実装します。

実例：YouTubeアイテムでの使用（プレビュー機能）

```typescript
editorOptions: {
	open: ({ title }, editor) => {
		// タイトルがデフォルト値の場合は空にする
		editor.update('$title', (value) => {
			if (title === FALLBACK_TITLE) {
				return '';
			}
			return value;
		});

		// ID入力欄とプレビューの要素を取得
		const $id = editor.find('[name="bge-id"]');
		const $preview = editor.find('.bge-youtube-preview');

		// プレビュー更新関数
		const updatePreview = () => {
			const id = parseYTId($id?.value ?? '');
			const url = `//www.youtube.com/embed/${id}?rel=0&loop=1`;
			$preview?.setAttribute('src', url);
			editor.update('$url', url);
			editor.update('$thumb', `//img.youtube.com/vi/${id}/maxresdefault.jpg`);
		};

		// IDが変更されたらプレビューを更新
		$id?.addEventListener('input', updatePreview);
	},
}
```

実例：ダウンロードファイルアイテムでの使用（ファイル選択とサイズ表示）

```typescript
editorOptions: {
	open: (data, editor) => {
		// ファイル選択イベントを発火
		editor.componentObserver.notify('file-select', {
			path: data.path,
			fileSize: Number.parseFloat(data.size ?? '0'),
			isEmpty: data.path === '',
			isMounted: false,
		});

		// ファイル選択イベントを監視
		editor.componentObserver.on('file-select', ({ path, fileSize, isEmpty }) => {
			if (isEmpty) return;

			editor.update('$path', path);
			editor.update('$formatedSize', formatByteSize(fileSize));
			editor.update('$size', fileSize.toString());
		});

		// ダウンロード属性のチェック状態を設定
		editor.update('$downloadCheck', !!data.download);
	},
}
```

##### `beforeChange(newData, editor): Promise<T> | T`

保存ボタンが押された時、データがアイテムに反映される直前に呼ばれます。エディタのデータを保存用のデータに変換します。

実例：画像アイテムでの使用（UI用の値を実際のデータに変換）

```typescript
editorOptions: {
	beforeChange: (newData) => {
		// UI用のboolean値を実際の属性値（配列形式）に変換
		const loading: ('eager' | 'lazy')[] = [newData.lazy ? 'lazy' : 'eager'];
		const node = newData.popup ? 'button' : newData.href ? 'a' : 'div';
		const target = node === 'a' && newData.targetBlank ? '_blank' : null;
		const command = node === 'button' ? 'show-modal' : null;

		return {
			...newData,
			loading,
			node,
			target,
			command,
		};
	},
}
```

実例：テーブルアイテムでの使用（HTMLからMarkdownへの変換）

```typescript
editorOptions: {
	beforeChange: (newData) => {
		return {
			...newData,
			// エディタデータ（HTML）を保存データ（Markdown）に変換
			td: newData.td.map(markdownToHtml),
		};
	},
}
```

##### `migrate(item): T`

アイテムのバージョンが古い場合に呼ばれます。古いバージョンのデータを新しい形式に変換します。

実例：Google Mapsアイテムでの使用（新しいフィールドの追加）

```typescript
editorOptions: {
	migrate: (item) => {
		const data = item.export();

		// v2.10.0で新しいフィールド（url）を追加
		const lat = data.lat;
		const lng = data.lng;
		data.url = `//maps.apple.com/?q=${lat},${lng}`;

		return data;
	},
}
```

##### `isDisable(item): string`

エディタを開けない場合にメッセージを返します。空文字列を返すと編集可能になります。

実例：Google Mapsアイテムでの使用（APIキーチェック）

```typescript
editorOptions: {
	isDisable: (item) => {
		// APIキーが設定されているかチェック
		if (item.editor.config.googleMapsApiKey) {
			return ''; // 編集可能
		}
		return 'Google Maps APIキーが登録されていないため、利用できません。\n「システム設定」からAPIキーを登録することができます。';
	},
}
```

### 独立レンダリング機構

`render` 関数を使用すると、エディタエンジンなしでブロックをレンダリングできます。

#### 使用場面

- **プレビュー機能**: ユーザーが編集中のコンテンツをプレビュー表示
- **静的サイト生成**: ビルド時にブロックデータからHTMLを生成
- **メール配信**: ブロックデータからHTMLメールを生成
- **外部システム連携**: BurgerEditorのデータを他のシステムで表示

#### 基本的な使い方

```typescript
import { render } from '@burger-editor/core';
import wysiwyg from './items/wysiwyg';
import image from './items/image';

// レンダリングするブロックデータ
const blockData = {
	name: 'text-with-image',
	containerProps: {
		type: 'grid',
		columns: 2,
	},
	items: [
		[
			{ name: 'wysiwyg', data: { wysiwyg: '<p>テキスト</p>' } },
			{ name: 'image', data: { path: ['/path/to/image.jpg'], alt: ['画像'] } },
		],
	],
};

// ブロックをレンダリング
const blockElement = await render(blockData, {
	// 使用するアイテムの定義
	items: {
		wysiwyg,
		image,
	},
	// 設定（BurgerEditorEngineのconfigと同じ形式）
	config: {
		classList: [],
		stylesheets: [],
		sampleImagePath: '/sample.jpg',
		sampleFilePath: '/sample.pdf',
		googleMapsApiKey: null,
	},
});

// DOM要素として取得できる
document.body.appendChild(blockElement);

// またはHTMLとして出力
const html = blockElement.outerHTML;
console.log(html);
```

#### 実践例：APIから取得したデータのレンダリング

```typescript
import { render } from '@burger-editor/core';
import { items } from './items'; // すべてのアイテム定義をインポート

// APIからブロックデータを取得
async function renderPageContent(pageId: string) {
	const response = await fetch(`/api/pages/${pageId}`);
	const pageData = await response.json();

	// 各ブロックをレンダリング
	const container = document.getElementById('content');

	for (const blockData of pageData.blocks) {
		const blockElement = await render(blockData, {
			items,
			config: {
				classList: ['rendered-block'],
				stylesheets: [],
				sampleImagePath: '/images/sample.jpg',
				sampleFilePath: '/files/sample.pdf',
				googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
			},
		});

		container.appendChild(blockElement);
	}
}
```

#### 静的サイト生成での使用例

```typescript
import { render } from '@burger-editor/core';
import { writeFile } from 'fs/promises';
import { items } from './items';

async function generateStaticPage(blockDataList: BlockData[]) {
	// 各ブロックをHTMLに変換
	const htmlBlocks = await Promise.all(
		blockDataList.map(async (blockData) => {
			const element = await render(blockData, {
				items,
				config: {
					classList: [],
					stylesheets: [{ path: '/css/blocks.css' }],
					sampleImagePath: '/images/sample.jpg',
					sampleFilePath: '/files/sample.pdf',
					googleMapsApiKey: null,
				},
			});
			return element.outerHTML;
		}),
	);

	// 完全なHTMLページを生成
	const fullHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Generated Page</title>
	<link rel="stylesheet" href="/css/blocks.css">
</head>
<body>
	<main>
		${htmlBlocks.join('\n')}
	</main>
</body>
</html>
	`.trim();

	// ファイルに出力
	await writeFile('./dist/index.html', fullHtml);
}
```

#### renderとBurgerEditorEngineの違い

| 機能                 | render                       | BurgerEditorEngine |
| -------------------- | ---------------------------- | ------------------ |
| 用途                 | 表示のみ                     | 編集可能           |
| エディタUI           | なし                         | あり               |
| インタラクティブ機能 | なし                         | あり               |
| パフォーマンス       | 軽量                         | 重い               |
| 使用場面             | 静的HTML生成、プレビュー表示 | コンテンツ編集     |

### XSSサニタイズの無効化

通常、アイテムのデータはXSS攻撃を防ぐためにサニタイズされますが、特殊なユースケースでHTMLをそのまま挿入したい場合は、`dangerouslySetInnerHTML` プロパティを使用できます。

⚠️ **警告**: この機能は信頼できるソースからのHTMLにのみ使用してください。

```typescript
const blockData = {
	name: 'raw-html',
	containerProps: { type: 'inline' },
	items: [
		[
			{
				name: 'wysiwyg',
				data: {
					wysiwyg: '<script>alert("XSS")</script><p>Raw HTML</p>',
					dangerouslySetInnerHTML: true, // サニタイズを無効化
				},
			},
		],
	],
};
```

`dangerouslySetInnerHTML` が `true` に設定されている場合、そのアイテムのすべてのデータはサニタイズされずにそのまま挿入されます。

### アイテムのライフサイクル

1. **作成**: `Item.create()` または `render()` でアイテムが作成される
2. **初期化**: `init()` が呼ばれて初期データが設定される
3. **エディタを開く**: ユーザーがアイテムをクリックすると `beforeOpen()` → `open()` が実行される
4. **編集**: ユーザーがエディタでデータを編集する
5. **保存**: `onSubmit()` → `beforeChange()` → データ更新 → `migrateElement()` → `change` イベント発火
6. **マイグレーション**: バージョンが古い場合、`migrate()` と `migrateElement()` が実行される

## ヘルスモニタリング

`@burger-editor/core/health` から `HealthMonitor` クラスをインポートして、サーバーの接続状態を監視できます。

### HealthMonitor

サーバーのヘルスチェックを定期的に実行し、オンライン/オフライン状態の変化をコールバックで通知します。

```typescript
import { HealthMonitor } from '@burger-editor/core/health';

const healthMonitor = new HealthMonitor({
	enabled: true,
	interval: 10_000, // 10秒ごとにチェック
	retryCount: 3, // 3回連続失敗でオフラインと判定
	async checkHealth() {
		// カスタムヘルスチェック処理
		try {
			const response = await fetch('//localhost:3000/api/health');
			return response.ok;
		} catch {
			return false;
		}
	},
	onOffline: (timestamp) => {
		console.log('Server went offline at', new Date(timestamp));
	},
	onOnline: (timestamp) => {
		console.log('Server came online at', new Date(timestamp));
	},
});

// 監視を開始
healthMonitor.start();

// 現在の状態を確認
console.log('Is online?', healthMonitor.isOnline);

// 監視を停止
// healthMonitor.stop();
```

**HealthMonitorOptions:**

- `enabled` (boolean): ヘルスチェックを有効にするか（デフォルト: `false`）
- `interval` (number): チェック間隔（ミリ秒）（デフォルト: `10000`）
- `retryCount` (number): オフライン判定までの連続失敗回数（デフォルト: `3`）
- `checkHealth` (HealthCheckFunction): ヘルスチェック関数（オプション）
- `onOffline` (`(timestamp: number) => void`): サーバーがオフラインになった時のコールバック（オプション）
- `onOnline` (`(timestamp: number) => void`): サーバーがオンラインになった時のコールバック（オプション）

**HealthMonitor API:**

- `start()`: 監視を開始
- `stop()`: 監視を停止
- `isOnline` (getter): 現在のオンライン状態（boolean）

**動作の詳細:**

- 通常状態では `interval` 間隔でヘルスチェックを実行
- ヘルスチェックが失敗すると、指数バックオフでリトライ間隔を短縮（素早く検知）
- `retryCount` 回連続で失敗すると、オフライン状態に遷移し `onOffline` コールバックを実行
- オフライン状態からヘルスチェックが成功すると、オンライン状態に復帰し `onOnline` コールバックを実行
