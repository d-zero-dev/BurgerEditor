# @burger-editor/local

[![npm version](https://badge.fury.io/js/@burger-editor%2Flocal.svg)](https://badge.fury.io/js/@burger-editor%2Flocal)

ローカルファイルシステムで動作するBurgerEditorのCMS実装です。HTMLファイルを直接編集できるローカル開発環境を提供します。

## インストール

```bash
yarn install
```

または

```bash
npm install
```

## CLIコマンド

### サーバー起動

```bash
# 開発モード
yarn dev

# 本番モード
npx bge
# または
yarn bge
```

開発サーバーが起動したら、ブラウザで以下にアクセスしてください：

```
http://localhost:3000
```

### 検索コマンド

HTMLファイル内のCSS変数（bge-options）を検索します。

```bash
# 基本的な検索
npx bge search "margin=normal"

# ワイルドカード検索（任意の値）
npx bge search "margin=*"

# OR検索（複数の値のいずれか）
npx bge search "margin=normal,large,xlarge"

# AND検索（すべての条件を満たす要素）
npx bge search "margin=normal" "bg-color=blue"

# URL形式で出力
npx bge search "margin=normal" --url

# ヘルプ表示
npx bge search --help
```

#### 検索クエリフォーマット

- **シンプル**: `{category}={value}` - 例: `"margin=normal"`
- **ワイルドカード**: `{category}=*` - 例: `"margin=*"`（任意の値にマッチ）
- **OR値**: `{category}={v1,v2,...}` - 例: `"margin=normal,large"`（いずれかの値）

複数のクエリを指定すると、すべてのクエリに同時にマッチする要素のみを検索します（AND検索）。

#### 出力形式

デフォルトでは絶対パスと行番号を出力します：

```
/path/to/file.html:354
```

`--url` フラグを使用すると、localhost URLで出力します：

```
http://localhost:5255/file.html:354
```

## 設定ファイル

プロジェクトルートに `burgereditor.config.js` ファイルを作成することで、BurgerEditorの動作をカスタマイズできます。

### 基本的な設定例

```javascript
import path from 'node:path';
import { defaultCatalog } from '@burger-editor/blocks';

export default {
	// ドキュメントルート（HTMLファイルを配置するディレクトリ）
	documentRoot: path.join(import.meta.dirname, 'src'),

	// アセットルート（画像やファイルを配置するディレクトリ）
	assetsRoot: path.join(import.meta.dirname, 'public'),

	// 言語設定
	lang: 'ja',

	// スタイルシートのパス
	stylesheets: ['/css/style.css'],

	// ブロックに適用するCSSクラス
	classList: ['my-editor'],

	// 編集可能エリアのセレクタ
	editableArea: '.my-editor',

	// インデックスファイル名（パスが / で終わる場合に使用）
	indexFileName: 'index.html',

	// ブロックカタログ
	catalog: defaultCatalog,

	// 新規ファイル作成時のテンプレート
	newFileContent: `
---
title: 'New Page'
---
<div class="my-editor"></div>`,

	// Google Maps APIキー（使用する場合）
	googleMapsApiKey: null,

	// サンプル画像のパス
	sampleImagePath: '/images/sample.jpg',

	// サンプルファイルのパス
	sampleFilePath: '/files/sample.pdf',

	// ファイル保存先ディレクトリ
	filesDir: {
		image: '/files/images',
		other: '/files/others',
	},

	// 起動時にブラウザを自動で開く
	open: true,
};
```

### 設定オプション

#### 必須オプション

- `documentRoot` (string): HTMLファイルを配置するディレクトリのパス
- `assetsRoot` (string): 静的ファイル（画像、CSS、JSなど）を配置するディレクトリのパス

#### オプショナル設定

- `version` (string): 設定ファイルのバージョン（デフォルト: パッケージバージョン）
- `port` (number): サーバーのポート番号（デフォルト: 3000）
- `host` (string): ホスト名（デフォルト: 'localhost'）
- `lang` (string): 言語設定（デフォルト: 'ja'）
- `stylesheets` (string[]): 読み込むスタイルシートのパス（デフォルト: []）
- `classList` (string[]): ブロックに適用するCSSクラス（デフォルト: []）
- `editableArea` (string | null): 編集可能エリアのセレクタ（デフォルト: null）
- `indexFileName` (string): パスが `/` で終わる場合に使用するインデックスファイル名（デフォルト: 'index.html'）
- `catalog` (BlockCatalog): ブロックカタログ（デフォルト: {}）
- `newFileContent` (string): 新規ファイル作成時のテンプレート
- `googleMapsApiKey` (string | null): Google Maps APIキー（デフォルト: null）
- `sampleImagePath` (string): サンプル画像のパス
- `sampleFilePath` (string): サンプルファイルのパス
- `filesDir` (object): ファイルタイプごとの保存先ディレクトリ
- `open` (boolean): 起動時にブラウザを自動で開く（デフォルト: true）
- `enableImportBlock` (boolean): インポートブロックを有効にする（デフォルト: true）
- `healthCheck` (object): ヘルスチェックの設定
  - `enabled` (boolean): ヘルスチェックを有効にする（デフォルト: true）
  - `interval` (number): チェック間隔（ミリ秒）（デフォルト: 10000）
  - `retryCount` (number): リトライ回数（デフォルト: 3）

## Front Matter編集機能

BurgerEditorは、HTMLファイルのFront Matter（YAMLメタデータ）を編集するUIを提供します。編集ボックスはBurgerEditor編集領域の上部に表示されます。

### 対応するデータ型

Front Matterエディターは、値の型を自動検出して適切な入力UIを表示します：

| 型                | 入力UI             | 例                       |
| ----------------- | ------------------ | ------------------------ |
| 文字列            | テキスト入力       | `title: 'Hello World'`   |
| 数値              | 数値入力           | `order: 1`               |
| 真偽値            | チェックボックス   | `published: true`        |
| 日付              | 日付ピッカー       | `date: '2025-01-06'`     |
| 配列/オブジェクト | JSONテキストエリア | `tags: ['blog', 'news']` |

### 使用方法

1. HTMLファイルの先頭にFront Matterを記述します：

```html
---
title: 'ページタイトル'
date: '2025-01-06'
published: true
---

<div class="my-editor">
	<!-- コンテンツ -->
</div>
```

2. BurgerEditorでファイルを開くと、編集領域の上にFront Matterエディターが表示されます

3. フィールドの追加・削除、値の編集が可能です

4. 変更は自動的に保存されます（500msのデバウンス付き）

### 新規フィールドの追加

「+ 追加」ボタンをクリックすると、新しいフィールドを追加できます：

1. キー名を入力（例: `author`, `category`）
2. 型を選択（テキスト、数値、真偽値、日付、JSON）
3. 「追加」ボタンをクリック

## カスタムブロックカタログの追加

既存のブロックカタログにカスタムブロックを追加できます：

```javascript
import { defaultCatalog } from '@burger-editor/blocks';

export default {
	documentRoot: './src',
	assetsRoot: './public',
	catalog: {
		...defaultCatalog,
		カスタムカテゴリ: [
			{
				label: '3列カード',
				definition: {
					name: 'three-column-card',
					containerProps: {
						type: 'grid',
						columns: 3,
					},
					items: [
						['image', 'wysiwyg'],
						['image', 'wysiwyg'],
						['image', 'wysiwyg'],
					],
				},
			},
		],
	},
};
```

## 実験的機能

### ボタンアイテムのカスタマイズ

ボタンアイテムの選択肢をカスタマイズできます：

```javascript
export default {
	documentRoot: './src',
	assetsRoot: './public',
	catalog: defaultCatalog,
	experimental: {
		itemOptions: {
			button: {
				kinds: [
					// 既存のラベルを変更
					{ value: 'link', label: 'リンクボタン' },
					// 既存の選択肢を削除
					{ value: 'em', delete: true },
					// 新しい選択肢を追加
					{ value: 'primary', label: 'プライマリボタン' },
					{ value: 'secondary', label: 'セカンダリボタン' },
				],
			},
		},
	},
};
```

## カスタムアイテムの作成

カスタムアイテムの作成方法については、[@burger-editor/core のREADME](../core/README.md#カスタムアイテムの作成) を参照してください。

## TypeScript型定義

設定ファイルでTypeScriptの型補完を利用する場合：

```javascript
/**
 * @type {import('@burger-editor/local').LocalServerConfigUserSettings}
 */
export default {
	documentRoot: './src',
	assetsRoot: './public',
	// ... 型補完が効きます
};
```

## ライセンス

Dual Licensed under MIT OR Apache-2.0
