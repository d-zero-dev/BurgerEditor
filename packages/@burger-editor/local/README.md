# `@burger-editor/local`

[![npm version](https://badge.fury.io/js/@burger-editor%2Flocal.svg)](https://badge.fury.io/js/@burger-editor%2Flocal)

ローカルファイルシステム上の HTML を **開発者・編集者がブラウザ UI で WYSIWYG 編集** するための BurgerEditor CMS 実装。Hono ベースの HTTP サーバー + Vite でビルドした `@burger-editor/client` (Svelte) UI を `npx bge` 一発で起動する。

ファイル I/O / 設定解決 / virtual-path-resolver / Front Matter の本体は [`@burger-editor/file-io`](../file-io/) に集約されており、`local` はそれを再エクスポートする薄いシムに痩身化されている。

## Quick Start

```sh
yarn add -D @burger-editor/local
```

プロジェクトルートに `burgereditor.config.js` を 1 ファイル置く（最小構成）:

```js
/** @type {import('@burger-editor/local').LocalServerConfigUserSettings} */
export default {
	documentRoot: './src',
	assetsRoot: './public',
};
```

起動:

```sh
npx bge
# → http://localhost:5255 が自動で開く
```

`./src/*.html` がそのまま編集対象になる。終了は Ctrl-C。

## Related Packages

| パッケージ                                        | 役割                                                     | このパッケージ単独で足りるケース                                                      |
| ------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`@burger-editor/local`](./) **（本パッケージ）** | ブラウザ UI + HTTP サーバー                              | 編集者が GUI で操作するだけなら本パッケージのみ                                       |
| [`@burger-editor/cli`](../cli/)                   | 非対話 CLI（`npx @burger-editor/cli <subcommand>`）      | スクリプト・CI から JSON 入出力で操作したいときに追加で使う。`local` と同じ設定を参照 |
| [`@burger-editor/mcp-server`](../mcp-server/)     | MCP サーバー（Claude / Cursor 等からの自然言語操作）     | AI エージェントから操作したいときに追加で使う。内部で `cli` のハンドラを再利用        |
| [`@burger-editor/core`](../core/)                 | エディタエンジン本体・カスタムアイテム実装基盤           | 独自ブロック / アイテムを開発するときに追加で使う                                     |
| [`@burger-editor/file-io`](../file-io/)           | ファイル I/O・virtual-path-resolver・Front Matter の本体 | 本パッケージが内部利用。直接依存する必要はない（`local` から re-export される）       |

依存方向: `local` → `core` / `file-io` / `blocks`。`cli` と `mcp-server` は `local` には依存せず、同じ `burgereditor.config.js` を読む。

## Installation

```sh
yarn add @burger-editor/local
```

## CLI

```sh
npx bge                          # 開発サーバー起動（デフォルト http://localhost:5255）
npx bge search "margin=normal"   # HTML 内の CSS 変数を検索
npx bge search --help
```

### `bge search` クエリ形式

- `{category}={value}` — シンプル
- `{category}=*` — ワイルドカード
- `{category}={v1,v2,...}` — OR
- 複数クエリ — AND（同じ要素にすべてマッチ）

`--url` で `http://localhost:5255/file.html:354` 形式の出力に切替。デフォルトは絶対パス + 行番号。

## `burgereditor.config.js`

プロジェクトルートに置く。cosmiconfig が `package.json` を持つ祖先まで遡って検索する。`.js` / `.mjs` / `.ts` / `.cjs` / `.json` をサポート。

### 必須

| キー           | 型       | 説明                                   |
| -------------- | -------- | -------------------------------------- |
| `documentRoot` | `string` | HTML を配置するディレクトリ            |
| `assetsRoot`   | `string` | 画像 / CSS / JS を配置するディレクトリ |

### オプショナル

| キー                | 型                                                                 | デフォルト                                          | 説明                                         |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------- |
| `version`           | `string`                                                           | `'0.0.0-unknown'`                                   | 設定ファイルのバージョン                     |
| `port`              | `number`                                                           | `5255`                                              | サーバーポート                               |
| `host`              | `` 'localhost' \| `${number}.${number}.${number}.${number}` ``     | `'localhost'`                                       | ホスト名                                     |
| `lang`              | `string`                                                           | `'en'`                                              | エディタ UI 言語                             |
| `stylesheets`       | `string[]`                                                         | `[]`                                                | 編集領域にロードする CSS                     |
| `classList`         | `string[]`                                                         | `[]`                                                | 編集領域ルートに付与するクラス               |
| `editableArea`      | `string \| null`                                                   | `null`                                              | 編集可能エリアのセレクタ                     |
| `indexFileName`     | `string`                                                           | `'index.html'`                                      | `/` で終わるパスのインデックスファイル名     |
| `catalog`           | `BlockCatalog`                                                     | `defaultCatalog`                                    | ブロックカタログ                             |
| `newFileContent`    | `string`                                                           | `''`                                                | 新規ファイル作成時のテンプレート             |
| `filesDir`          | `string \| FileDirSettings \| { image, pdf, video, audio, other }` | `assetsRoot` 配下                                   | アップロード先ディレクトリ（タイプ別指定可） |
| `sampleImagePath`   | `` `/${string}` \| `https://${string}` \| `base64:${string}` ``    | `${filesDir.image.clientPath}/sample.png`           | サンプル画像のパス                           |
| `sampleFilePath`    | 同上                                                               | `${filesDir.other.clientPath}/sample.pdf`           | サンプルファイルのパス                       |
| `googleMapsApiKey`  | `string \| null`                                                   | `null`                                              | Google Maps API キー                         |
| `open`              | `boolean`                                                          | `true`                                              | 起動時にブラウザを自動で開く                 |
| `enableImportBlock` | `boolean`                                                          | `true`                                              | インポートブロック有効化                     |
| `healthCheck`       | `{ enabled, interval, retryCount }`                                | `{ enabled: true, interval: 10000, retryCount: 3 }` | クライアント側の自動 health 監視（後述）     |
| `virtualTree`       | `{ enabled, pathKey }`                                             | `{ enabled: false, pathKey: 'path' }`               | Virtual File Tree（後述）                    |
| `experimental`      | `{ itemOptions?: { button?, wysiwyg? } }`                          | `undefined`                                         | 実験的機能（後述）                           |

> `config` はクライアント側にもそのまま埋め込まれるため、シリアライズ可能な値のみ受け付ける。

### TypeScript 型補完

`.js` 設定でも JSDoc `@type` で型補完が効く。

```js
/** @type {import('@burger-editor/local').LocalServerConfigUserSettings} */
export default {
	documentRoot: './src',
	assetsRoot: './public',
};
```

## Virtual File Tree

外部 CMS と連携する際など、`documentRoot` 直下に **フラットな `<id>.html` が並ぶ** プロジェクト向けに、Front Matter の値からエディタ上の仮想ツリーを構築するオプトイン機能。詳細は [`docs/virtual-tree.md`](./docs/virtual-tree.md) を参照。

### 採用前提（満たさないと起動失敗）

1. `documentRoot` 直下のすべての `*.html` が Front Matter を持つ
2. Front Matter に `pathKey`（既定 `'path'`）が**空でない文字列値**として存在する
3. `pathKey` の値がプロジェクト内で**一意**である

`pathKey` の値は「論理パス」として扱われ、エディタ上のツリー位置を決めるが、ディスク上のファイル名は変更しない。

### 設定例

```js
export default {
	documentRoot: path.join(import.meta.dirname, 'src'),
	assetsRoot: path.join(import.meta.dirname, 'public'),
	editableArea: '.my-editor',
	virtualTree: {
		enabled: true,
		pathKey: 'path', // 'slug' / 'route' などに変更可
	},
};
```

### 受け付けるパス形式

- 先頭スラッシュは正規化される（`about.html` と `/about.html` は同一）
- 連続スラッシュも除去（`//foo.html` → `foo.html`）
- 正規化後に空文字列になる値（`'/'`、`'///'`）は **起動時エラー / API は 400 `EmptyLogicalPathError`**
- `..` / `.` セグメントと NUL 文字を含む論理パスは API 境界で **400 拒否**（孤児ファイル化を防ぐため）

### `PathConflictError` で起動失敗したら

衝突した論理パスと、それを主張するディスクファイル一覧が stderr に整形出力され、`exit code 1` で終了する。

```
Conflicting logical paths in virtual tree:
  - "about.html" claimed by: 1.html, 2.html

Fix the conflicting front matter "path" values in the listed files and retry.
```

衝突しているファイルのうち一方の Front Matter `path` を別の値に書き換えて再起動する。

### 既知の制約

- 新規作成ダイアログで **ID と論理パスの両方をユーザー手入力**（ID 自動採番なし）
- 同一の論理パスを複数ファイルに持たせることは不可
- 並行更新は内部 mutex で直列化（シングルユーザー前提）
- 旧バージョンで `..` 入りの Front Matter が書き込まれていた場合は boot チェック対象外なので手動修正が必要

### ツリー表示

仮想モード時、各リンクは `<論理ファイル名> (<id>)` 形式で表示（例: `maintenance.html (10)`）。CSS で `.file-id` をグレーアウト / 非表示にすることで見た目を調整できる。

## Front Matter 編集 UI

HTML の Front Matter（YAML）を編集領域の上に展開される UI から編集できる。値の型を自動検出して適切な入力 UI を出す。変更は 500ms デバウンスで自動保存。

| 型                  | 入力 UI             | 例                       |
| ------------------- | ------------------- | ------------------------ |
| 文字列              | テキスト入力        | `title: 'Hello World'`   |
| 数値                | 数値入力            | `order: 1`               |
| 真偽値              | チェックボックス    | `published: true`        |
| 日付                | 日付ピッカー        | `date: '2026-01-06'`     |
| 配列 / オブジェクト | JSON テキストエリア | `tags: ['blog', 'news']` |

`+ 追加` ボタンでキー名と型を選んで新規フィールド追加可能。

## ブロックのコピー & ペースト

ブロックメニューの「ブロックをコピー」→ ブロック追加ダイアログの「クリップボードから貼り付け」で複製できる。

- スコープは**ブラウザのタブ（セッション）内のみ** — タブを閉じると消える
- 別タブでコピーした内容は使えない
- ペースト後にクリップボードは**自動クリア** — 再使用には再コピーが必要

## Health Check API

### `GET /api/health`

サーバー稼働確認用。

```json
{
	"status": "ok",
	"timestamp": 1737446400000
}
```

| フィールド  | 型       | 説明                     |
| ----------- | -------- | ------------------------ |
| `status`    | `string` | 常に `"ok"`              |
| `timestamp` | `number` | レスポンス生成時刻（ms） |

### クライアント側自動監視

`config.healthCheck.enabled = true`（デフォルト）のとき、クライアントは `/api/health` を `interval` ms ごとに叩き、`retryCount` 回連続失敗で**サーバーオフライン**と判定する。状態遷移時に CustomEvent が **エディタ要素 (`engine.el`)** に発火する（`bubbles: false`、`document` では捕捉できない）。

| イベント             | detail                  | タイミング                                        |
| -------------------- | ----------------------- | ------------------------------------------------- |
| `bge:server-offline` | `{ timestamp: number }` | `retryCount` 回連続失敗してオフライン判定したとき |
| `bge:server-online`  | `{ timestamp: number }` | オフライン状態から復旧したとき                    |

```js
engine.el.addEventListener('bge:server-offline', (e) => {
	console.warn('server down', new Date(e.detail.timestamp));
});
```

## サブパス API

`@burger-editor/local/get-user-config`、`@burger-editor/local/create-health-checker`、`@burger-editor/local/get-candidate-name`、`@burger-editor/local/upload` の 4 サブパスを公開している。

### `getUserConfig(): Promise<LocalServerConfig>`

`burgereditor.config.js` を解決してデフォルトをマージした完成形を返す。

```ts
import { getUserConfig } from '@burger-editor/local/get-user-config';

const config = await getUserConfig();
console.log(config.host, config.port); // 'localhost' 5255
```

### `createHealthChecker(config): HealthMonitor`

ブラウザ環境で動く `HealthMonitor` インスタンスを生成する。`config` には `getUserConfig()` の結果を渡す。

```ts
import { createHealthChecker } from '@burger-editor/local/create-health-checker';

const monitor = createHealthChecker(config);
monitor.onOffline = (ts) => console.log('offline at', ts);
monitor.onOnline = (ts) => console.log('online at', ts);
monitor.start();
console.log(monitor.isOnline); // true
monitor.stop();
```

**`HealthMonitor` API**

| メンバ                | 種別   | 説明                              |
| --------------------- | ------ | --------------------------------- |
| `start()`             | method | 監視開始                          |
| `stop()`              | method | 監視停止                          |
| `isOnline`            | getter | 現在のオンライン状態（`boolean`） |
| `onOffline = (ts) =>` | setter | オフライン遷移時のコールバック    |
| `onOnline = (ts) =>`  | setter | オンライン復帰時のコールバック    |

### `getCandidateName(name, destDir): Promise<EncodedFileName>`

アップロード先ディレクトリをスキャンし、次に使うべきファイル名 `${number}__${string}` を返す。

```ts
import {
	getCandidateName,
	type EncodedFileName,
} from '@burger-editor/local/get-candidate-name';

const fileName: EncodedFileName = await getCandidateName('photo.jpg', '/path/to/dest');
// => "12345__<base64>.jpg"
```

| パラメータ | 型       | 説明                       |
| ---------- | -------- | -------------------------- |
| `name`     | `string` | 元ファイル名（拡張子込み） |
| `destDir`  | `string` | 保存先ディレクトリ絶対パス |

`EncodedFileName` は `` `${number}__${string}` `` のテンプレートリテラル型で、`upload()` 第一引数もこの型を要求する。これにより誤った形式のファイル名を渡すと型エラーで弾かれる。

### `upload(fileName, destDir, file): Promise<UploadResult>`

`getCandidateName()` で取得した名前でファイルを保存する。

```ts
import { upload, type UploadResult } from '@burger-editor/local/upload';

const result: UploadResult = await upload(fileName, '/path/to/dest', file);
```

| パラメータ | 型                    | 説明                          |
| ---------- | --------------------- | ----------------------------- |
| `fileName` | `EncodedFileName`     | `getCandidateName()` の戻り値 |
| `destDir`  | `string`              | 保存先ディレクトリ絶対パス    |
| `file`     | `File \| ArrayBuffer` | アップロードするデータ        |

**`UploadResult`**

```ts
{
	filePath: string; // 保存先絶対パス
	fileName: string; // 保存ファイル名
	fileId: number; // ファイル ID
	name: string; // デコード済み元ファイル名
	size: number; // バイト数
	timestamp: number; // mtime（ms）
}
```

## カスタムブロックカタログ

```js
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
					containerProps: { type: 'grid', columns: 3 },
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

カスタムアイテムの作成は [`@burger-editor/core` の README](../core/README.md) を参照。

## 実験的機能

### `experimental.itemOptions.button`

ボタンアイテムの `kinds` 選択肢をマージ・上書き・削除できる。

```js
export default {
	// ...
	experimental: {
		itemOptions: {
			button: {
				kinds: [
					{ value: 'link', label: 'リンクボタン' }, // 既存ラベルを変更
					{ value: 'em', delete: true }, // 既存選択肢を削除
					{ value: 'primary', label: 'プライマリボタン' }, // 新規追加
					{ value: 'secondary', label: 'セカンダリボタン' },
				],
			},
		},
	},
};
```

## 内部構造の注意

`local/src/helpers/{front-matter,html-detection,no-editable-area-error,edit-content}.ts` および `local/src/model/{file-tree,virtual-path-resolver,get-user-config}.ts` は **互換性のためのシム re-export**。本体は `@burger-editor/core` / `@burger-editor/file-io` 側にあるため、修正はそちらで行うこと。

## License

Dual Licensed under MIT OR Apache-2.0
