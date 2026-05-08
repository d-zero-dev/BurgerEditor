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

開発サーバーが起動したら、ブラウザで以下にアクセスしてください（ポートは設定で上書き可能）：

```
http://localhost:5255
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

- `version` (string): 設定ファイルのバージョン（デフォルト: `'0.0.0-unknown'`）
- `port` (number): サーバーのポート番号（デフォルト: 5255）
- `host` (string): ホスト名（デフォルト: 'localhost'）
- `lang` (string): 言語設定（デフォルト: 'en'）
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
- `virtualTree` (object): 仮想ファイルツリー機能の設定（詳細は [Virtual File Tree](#virtual-file-tree仮想ファイルツリー) 参照）
  - `enabled` (boolean): 有効化フラグ（デフォルト: false）
  - `pathKey` (string): 論理パスとして読み取る Front Matter キー名（デフォルト: 'path'）

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

## Virtual File Tree（仮想ファイルツリー）

外部 CMS と連携する際など、`documentRoot` 配下に **HTML ファイルがフラットな ID 名で並んでいる** プロジェクト向けに、Front Matter に書かれたパス情報からエディタ上の仮想ツリーを構築するオプトイン機能です。

### 何が変わるか

|                          | 通常モード（既定）       | 仮想モード（`virtualTree.enabled = true`）                   |
| ------------------------ | ------------------------ | ------------------------------------------------------------ |
| ディスク上のファイル配置 | ディレクトリ階層そのまま | フラット `<id>.html`（変更しない）                           |
| エディタのファイルツリー | ディスク階層と同じ       | 各ファイルの `frontMatter[pathKey]` から再構築した仮想ツリー |
| 新規ファイル作成         | パスを入力               | パスと **ID** の両方を入力                                   |
| パス変更                 | ファイルを実際に移動     | Front Matter の path 値を書き換えるだけ（ディスク不変）      |
| マイナーリリース互換性   | —                        | 既定 `enabled: false` で完全に従来挙動                       |

### 採用前提

仮想モードを有効化する前に、以下を必ず満たしてください。満たさないとサーバ起動時にエラーで停止します。

1. `documentRoot` 直下の `*.html` がすべて Front Matter を持っている
2. すべてのファイルの Front Matter に `pathKey`（既定 `path`）が文字列として存在する
3. 同じ `pathKey` 値を持つファイルが複数存在しない

### 設定例

```js
// burgereditor.config.js
export default {
	documentRoot: path.join(import.meta.dirname, 'src'),
	assetsRoot: path.join(import.meta.dirname, 'public'),
	editableArea: '.my-editor',
	virtualTree: {
		enabled: true,
		// 既定は 'path'。プロジェクトのスタイルに合わせて 'slug' / 'route' などに変更可
		pathKey: 'path',
	},
};
```

### 期待される Front Matter

ファイル `documentRoot/42.html`（ファイル名 = ID）の内容:

```text
---
path: company/about.html
title: 会社概要
---
<div class="my-editor">…</div>
```

エディタは上記ファイルを `company/about.html` の位置にあるかのように表示します。Front Matter の `path` を編集して保存すると、仮想ツリーは即座に新しい位置に切り替わりますが、ディスク上のファイル名は `42.html` のまま変わりません。

### 起動時に PathConflictError で停止したとき

エラーメッセージに衝突した論理パスと、その論理パスを主張している複数のディスクファイルが列挙されます：

```
Conflicting logical paths in virtual tree:
  - "about.html" claimed by: 1.html, 2.html
```

いずれか一方の Front Matter `path` を別の値に書き換えてからサーバを再起動してください。

整形済みのメッセージは stderr に書かれ、プロセスは exit code 1 で終了します（[PR #759](https://github.com/d-zero-dev/BurgerEditor/pull/759)）。Node のデフォルト uncaught handler はバイパスされるため、衝突ファイル名がスタックトレースに埋もれません。

### ツリー表示

仮想モード時、ファイルツリーの各リンクは **`<論理ファイル名> (<id>)` 形式** で表示されます（例: `maintenance.html (10)`）。これにより編集者は「いま開いている論理パス」と「ディスク上の実体」を同時に把握できます。

- 名前と id は別の `<span>` 要素として描画されます（`a > span` + `a > span.file-id`）。CSS で `.file-id` をグレーアウトしたり非表示にしたりして見た目を調整できます
- id 末尾の `.html` は冗長なので自動で除去します（`10.html` → `10`、ただし `10.html.bak` のように末尾でない `.html` は維持）
- 通常モード（`virtualTree.enabled = false`）では従来どおり名前のみ表示

### 受け付けるパス形式

Front Matter `path` の値は、**先頭スラッシュの有無に関わらず同じ論理パスとして扱われます**。

- `path: about.html` と `path: /about.html` は同一エントリ
- 先頭の連続スラッシュ（`//foo.html`、`///foo.html` 等）も除去されて正規化
- 正規化後に空文字列になる値（`'/'` 単独、`'///'` のみ等）は **起動時エラー**、API 呼び出し経由でも **400 (`EmptyLogicalPathError`)** で拒否

### 制約と既知の限界

- 編集ダイアログから新規作成するときに **ID と論理パスの両方をユーザが手入力** する必要があります（ID 自動採番は未対応）
- 同一の論理パスを複数ファイルに持たせることはできません
- 論理パスは仮想ツリー内のキーとしてのみ使われ、ディスクパスには影響しません。`..` / `.` セグメントや NUL 文字を含む論理パスは API レイヤで `400` 拒否されるため、孤児ファイル化は起きません（[#758](https://github.com/d-zero-dev/BurgerEditor/pull/758) 以降）。`loadResolverState` は boot 時にこのチェックを行わないので、旧バージョンで disk に書き込まれた `..` 入りの Front Matter は手動で修正する必要があります
- 並行更新の整合性は内部 mutex で守られます（シングルユーザー編集前提）

### 関連 issue

- [#753](https://github.com/d-zero-dev/BurgerEditor/issues/753) `client/create-editor.ts` のエラーパステスト整備

詳細な採用手順とトラブルシュートは [`docs/virtual-tree.md`](./docs/virtual-tree.md) を参照してください。

## ブロックのコピー&ペースト

効率的なコンテンツ編集のために、ブロックのコピー&ペースト機能を利用できます。

### 使い方

1. **ブロックをコピー**
   - コピーしたいブロックにマウスオーバーし、ブロックメニューを表示
   - 「ブロックをコピー」ボタン（クリップボードアイコン）をクリック
   - 確認メッセージが表示されます

2. **ブロックをペースト**
   - 「ブロックを追加」ボタンをクリックしてカタログダイアログを開く
   - 上部に表示される「クリップボードから貼り付け」ボタンをクリック
   - コピーしたブロックが挿入されます

### 注意事項

- コピーしたブロックは**ブラウザのタブ（セッション）内でのみ有効**です
- タブを閉じるとクリップボードの内容は消去されます
- 別のタブでコピーしたブロックは使用できません
- ペースト後、クリップボードは自動的にクリアされます（再度使用するには再コピーが必要）

### 活用例

- テンプレートブロックの複製
- 別ページへのブロック構造の流用
- 繰り返しパターンの効率的な作成

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

## APIエンドポイント

### Health Check API

BurgerEditorローカルサーバーが起動中かどうかを確認するためのヘルスチェックAPIを提供しています。

#### エンドポイント

```
GET /api/health
```

#### レスポンス

```json
{
	"status": "ok",
	"timestamp": 1737446400000
}
```

- `status` (string): サーバーの状態。常に `"ok"` を返します
- `timestamp` (number): レスポンス生成時のタイムスタンプ（ミリ秒）

#### 使用例

curlコマンドで確認：

```bash
curl http://localhost:3000/api/health
```

JavaScriptで確認：

```javascript
const response = await fetch('http://localhost:3000/api/health');
const data = await response.json();
console.log(data.status); // "ok"
```

#### クライアント側の自動ヘルスチェック

BurgerEditorクライアントは、このAPIを使用してサーバーの接続状態を自動的に監視します。ヘルスチェックの動作は設定ファイルの `healthCheck` オプションでカスタマイズできます：

```javascript
export default {
	documentRoot: './src',
	assetsRoot: './public',
	healthCheck: {
		enabled: true, // ヘルスチェックを有効化（デフォルト: true）
		interval: 10000, // チェック間隔（ミリ秒）（デフォルト: 10000）
		retryCount: 3, // リトライ回数（デフォルト: 3）
	},
};
```

接続が失われると、クライアントは自動的にリトライを行い、`bge:server-offline` および `bge:server-online` イベントを発行します。

## サーバー設定とヘルスチェックAPI

### getUserConfig()

サーバー設定を取得する関数です。`burgereditor.config.js` から設定を読み込み、デフォルト値とマージして返します。

```typescript
import { getUserConfig } from '@burger-editor/local/get-user-config';

const config = await getUserConfig();
console.log(config.host, config.port); // 'localhost' 5255
```

**戻り値:** `Promise<LocalServerConfig>`

### createHealthChecker()

BurgerEditor local サーバーのヘルスチェックを行う `HealthMonitor` インスタンスを作成します。ブラウザ環境で動作し、サーバーの `/api/health` エンドポイントを定期的にチェックします。

```typescript
import { getUserConfig } from '@burger-editor/local/get-user-config';
import { createHealthChecker } from '@burger-editor/local/create-health-checker';

const config = await getUserConfig();
const healthMonitor = createHealthChecker(config);

// オプション: カスタムコールバックを設定
healthMonitor.onOffline = (timestamp) => {
	console.log('Server went offline at', new Date(timestamp));
	// カスタム処理（例: ユーザーに通知を表示）
};

healthMonitor.onOnline = (timestamp) => {
	console.log('Server came online at', new Date(timestamp));
	// カスタム処理（例: 通知を非表示）
};

// 監視を開始
healthMonitor.start();

// 現在の状態を確認
console.log('Is online?', healthMonitor.isOnline);

// 監視を停止
// healthMonitor.stop();
```

**パラメータ:**

- `config` (LocalServerConfig): `getUserConfig()` で取得したサーバー設定

**戻り値:** `HealthMonitor` - ヘルスモニターインスタンス

**HealthMonitor API:**

- `start()`: 監視を開始
- `stop()`: 監視を停止
- `isOnline` (getter): 現在のオンライン状態（boolean）
- `onOffline` (setter): サーバーがオフラインになった時のコールバック
- `onOnline` (setter): サーバーがオンラインになった時のコールバック

## プログラマティックAPI

`@burger-editor/local` は、Honoサーバーと同じファイルアップロード機能をプログラムから使用できるAPIを提供しています。

### ファイルアップロードAPI

#### `getCandidateName()`

アップロード候補のファイル名を生成します。ディレクトリ内の既存ファイルをスキャンし、次に使用可能なファイルIDを付与したファイル名を返します。

```typescript
import {
	getCandidateName,
	type EncodedFileName,
} from '@burger-editor/local/get-candidate-name';

const fileName: EncodedFileName = await getCandidateName(
	'photo.jpg',
	'/path/to/destination',
);
// => "12345__<encoded>.jpg" (ファイル名がBase64エンコードされる)
```

**パラメータ:**

- `name` (string): 元のファイル名（拡張子を含む）
- `destDir` (string): 保存先ディレクトリの絶対パス

**戻り値:**

- `Promise<EncodedFileName>`: エンコードされたファイル名（形式: `${number}__${string}`）

#### `upload()`

指定されたファイル名でファイルをアップロードします。`getCandidateName()` で取得した候補名を使用することで、ファイルの存在チェックやID管理を自分で制御できます。

```typescript
import { upload, type UploadResult } from '@burger-editor/local/upload';

const result: UploadResult = await upload(
	fileName, // getCandidateName() から取得した名前
	'/path/to/destination',
	fileBuffer, // File | ArrayBuffer
);
```

**パラメータ:**

- `fileName` (EncodedFileName): 保存するファイル名（`getCandidateName()` から取得）
- `destDir` (string): 保存先ディレクトリの絶対パス
- `file` (File | ArrayBuffer): アップロードするファイルデータ

**戻り値:**

- `Promise<UploadResult>`: アップロード結果
  ```typescript
  {
  	filePath: string; // 保存されたファイルの絶対パス
  	fileName: string; // 保存されたファイル名
  	fileId: number; // ファイルID
  	name: string; // デコードされた元のファイル名
  	size: number; // ファイルサイズ（バイト）
  	timestamp: number; // 保存時のタイムスタンプ
  }
  ```

#### 使用例: ファイル存在チェック付きアップロード

```typescript
import { getCandidateName } from '@burger-editor/local/get-candidate-name';
import { upload } from '@burger-editor/local/upload';
import fs from 'node:fs/promises';
import path from 'node:path';

const destDir = '/path/to/images';
const originalName = 'photo.jpg';

// 1. 候補ファイル名を取得
const fileName = await getCandidateName(originalName, destDir);

// 2. ファイルの存在チェック（必要に応じて）
const filePath = path.join(destDir, fileName);
try {
	await fs.access(filePath);
	console.log('ファイルは既に存在します');
	// 既存ファイルの処理...
} catch {
	// 3. ファイルが存在しない場合のみアップロード
	const result = await upload(fileName, destDir, fileBuffer);
	console.log('アップロード成功:', {
		url: `/images/${result.fileName}`,
		size: result.size,
		id: result.fileId,
	});
}
```

#### 型安全性

`getCandidateName()` の戻り値型は `EncodedFileName`（テンプレートリテラル型: `` `${number}__${string}` ``）であり、`upload()` の第一引数もこの型を要求します。これにより、誤った形式のファイル名を渡すことを型レベルで防ぎます。

```typescript
// OK
const fileName = await getCandidateName('photo.jpg', '/images');
await upload(fileName, '/images', buffer);

// Type Error!
await upload('invalid.jpg', '/images', buffer);
```

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
