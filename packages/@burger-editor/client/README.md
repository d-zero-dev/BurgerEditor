# `@burger-editor/client`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fclient.svg)](https://badge.fury.io/js/@burger-editor%2Fclient)

BurgerEditor をブラウザ上の DOM に組み込むための UI レイヤー。React 製の編集 UI（ブロックメニュー・各種ダイアログ・アイテムエディタ）を内部で組み立て、`@burger-editor/core` の編集エンジンに差し込んだ状態でひとつのファクトリ関数として提供する。アイテムエディタ用のフォーム部品とフック群は `@burger-editor/client/ui` として公開される。

## Installation

```sh
yarn add @burger-editor/client @burger-editor/core @burger-editor/blocks
```

## Related Packages

| パッケージ                    | 関係     | このパッケージとの使い分け                                            |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| `@burger-editor/core`         | 依存元   | 編集エンジンと HTML 契約。ブラウザ以外で使うなら core 単体で十分      |
| `@burger-editor/blocks`       | 依存元   | 標準ブロック / アイテム。独自カタログのみなら不要                     |
| `@burger-editor/migrator`     | 連携     | データバージョン移行。client から `Migrator` として再エクスポート済み |
| `@burger-editor/frozen-patty` | 間接依存 | core 経由で HTML ⇄ JSON 変換に利用。直接の API 利用は不要             |

ブラウザで編集 UI を組み込むなら client、Node 単体レンダリングや非ブラウザ環境なら core を直接使う、と判断する。

## Usage

```ts
import { createBurgerEditorClient } from '@burger-editor/client';

const { engine } = await createBurgerEditorClient({
	root: '#editor',
	config: {
		classList: ['content'],
		stylesheets: ['/styles/main.css'],
		sampleImagePath: '/images/sample.jpg',
	},
	items, // 使用するアイテム定義
	catalog, // ブロックカタログ
	generalCSS, // 一般 CSS
	initialContents: '<div data-bge-name="..." ...></div>',
});
```

`options` は `BurgerEditorEngineOptions` から `view` を除いた型。`view`（`BurgerEditorView`）は client が **React 実装で内部的に注入**するため、利用側で渡してはいけない。加えて client はエンジンコマンドのディスパッチテーブル（`registerEngineCommands`）を登録し、ダイアログ群を `engine.uiState` から宣言的にレンダリングするルートをマウントする。

## `createBurgerEditorClient` オプション

### 必須プロパティ

| キー              | 型                                           | 説明                                       |
| ----------------- | -------------------------------------------- | ------------------------------------------ |
| `root`            | `string`                                     | エディタをマウントするルート要素のセレクタ |
| `config`          | `Config`                                     | エディタ設定（後述）                       |
| `items`           | `Record<string, ItemSeed>`                   | 使用するアイテムの定義                     |
| `catalog`         | `BlockCatalog`                               | ブロックカタログの定義                     |
| `generalCSS`      | `string`                                     | 一般 CSS 文字列                            |
| `initialContents` | `string \| { main: string; draft?: string }` | 初期コンテンツの HTML                      |

### 任意プロパティ

| キー                | 型                                                        | 説明                                           |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| `viewAreaClassList` | `string[]`                                                | ビューエリアに適用する CSS クラス              |
| `blocks`            | `BlockDefinition[]`                                       | カスタムブロック定義                           |
| `storageKey`        | `{ blockClipboard?: string; ... }`                        | ストレージキー設定（ブロッククリップボード等） |
| `onUpdated`         | `(main: string, draft?: string) => void \| Promise<void>` | コンテンツ更新時のコールバック                 |
| `fileIO`            | `FileAPI`                                                 | ファイル I/O API 実装（後述）                  |
| `healthCheck`       | `HealthCheckOptions`                                      | ヘルスチェックの設定                           |
| `experimental`      | `ExperimentalOptions`                                     | 実験的機能の設定                               |

### `config` 配下のキー

| キー               | 型                                               | 説明                                                                                                                                          |
| ------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `classList`        | `string[]`                                       | ブロックに適用する CSS クラスの配列                                                                                                           |
| `stylesheets`      | `(string \| { path: string; layer?: string })[]` | 読み込むスタイルシート。`CSS_LAYER` でレイヤー指定可（core より緩い受容形式： `string` を許す。内部で `{ path, layer? }` 形式に正規化される） |
| `sampleImagePath`  | `string`                                         | サンプル画像のパス                                                                                                                            |
| `sampleFilePath`   | `string`                                         | サンプルファイルのパス                                                                                                                        |
| `googleMapsApiKey` | `string \| null`                                 | Google Maps API キー（マップ機能を使う場合のみ）                                                                                              |
| `experimental`     | `object`                                         | 実験的な機能の設定（オプション）                                                                                                              |

## その他のエクスポート

| 名前                          | 種別   | 説明                                                                                   |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `attachDraftSwitcher(engine)` | 関数   | 下書き切り替え UI を手動でアタッチ。`engine.hasDraft()` が `true` の場合のみ UI を生成 |
| `version`                     | 定数   | パッケージのバージョン文字列                                                           |
| `Migrator`                    | クラス | `@burger-editor/migrator` の re-export                                                 |
| `getConfig()`                 | 関数   | `@deprecated` — 後述                                                                   |

### `getConfig()` が非推奨である理由

`getConfig()` は単一の `Config` 型を返す前提で実装されているが、現行設計ではプラットフォーム（client / 他プラットフォーム）ごとに `Config` 型の構造が異なる。グローバル参照として使うと型が一致しないケースが発生し、実行時エラー・型不整合の温床になる。

**代替手段**: 起動時に得られる `engine.config` を直接参照すること。`engine` はそのプラットフォーム向けに型付けされた `config` を保持しているため、整合性が保たれる。

```ts
const { engine } = await createBurgerEditorClient({/* ... */});
// 推奨: engine 経由で参照
const stylesheets = engine.config.stylesheets;
```

## `FileAPI` の実装例

ファイルアップロード機能を有効にする場合、`fileIO` プロパティに以下のインタフェースを満たす実装を渡す。各メソッドはすべて optional で、提供したメソッドに対応する UI 機能（ファイル一覧表示・アップロード・削除）だけが有効になる。

```ts
import type { FileAPI } from '@burger-editor/core';

const fileIO: FileAPI = {
	async getFileList(fileType, options) {
		const res = await fetch(`/api/files/${fileType}?page=${options.page}`);
		return res.json();
	},
	async postFile(fileType, file, progress) {
		const formData = new FormData();
		formData.append('file', file);
		const res = await fetch(`/api/files/${fileType}`, { method: 'POST', body: formData });
		return res.json();
	},
	async deleteFile(fileType, url) {
		const res = await fetch(`/api/files/${fileType}`, {
			method: 'DELETE',
			body: JSON.stringify({ url }),
		});
		return res.json();
	},
};
```

## ブロックのコピー & ペースト

ブロック単位のコピー & ペーストを sessionStorage 経由で提供する。タブを閉じると消去され、ペースト後はクリップボードが自動的にクリアされる。

| 項目     | 値                                                                |
| -------- | ----------------------------------------------------------------- |
| 保存形式 | JSON（`BlockData`）                                               |
| 保存先   | `sessionStorage`                                                  |
| 有効期限 | ブラウザセッション内のみ                                          |
| 既定キー | `engine.storageKey.blockClipboard`（既定値 `'bge-copied-block'`） |

カスタムキーを使うには `storageKey.blockClipboard` を上書きする。

```ts
await createBurgerEditorClient({
	// ...
	storageKey: {
		blockClipboard: 'my-custom-clipboard-key',
	},
});
```

## License

Dual Licensed under MIT OR Apache-2.0
