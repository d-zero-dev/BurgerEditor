# `@burger-editor/migrator`

BurgerEditor のバージョン間でコンテンツを移行するツール。現状 v3 → v4 をサポート。

## Installation

```sh
yarn add @burger-editor/migrator
```

## Related Packages

| パッケージ                              | 関係                                        | 使い分け                                       |
| --------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| [`@burger-editor/legacy`](../legacy/)   | v3 ブロックテンプレートの定義元（内部依存） | 単体で利用可（migrator が引き込む）            |
| [`@burger-editor/core`](../core/)       | `itemImport` を利用（内部依存）             | 単体で利用可                                   |
| [`@burger-editor/file-io`](../file-io/) | 生成 HTML を実ファイルに書き出すときに併用  | 移行スクリプトでファイル出力するなら追加で必要 |

## Usage

```ts
import { createBlock } from '@burger-editor/migrator/v3';

const html = createBlock('title', [{ titleH2: 'タイトル' }]);
```

`createBlock(blockName, data)` は v3 のブロックテンプレートとアイテムデータから v4 互換 HTML を生成する。内部実装は `@burger-editor/legacy` の v3 テンプレートと `@burger-editor/core` の `itemImport` を組み合わせる。

### パラメータ

| パラメータ  | 型                                                   | 説明                                                                                                         |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `blockName` | `@burger-editor/legacy/v3` の `blocks` export のキー | v3 のブロックテンプレート名。**キャメルケース + 末尾の番号**（例: `'textImage1'`、`'image-text3'` ではない） |
| `data`      | `readonly ItemData[]`                                | アイテムごとのデータ配列（テンプレート内のアイテム数と順序に対応）                                           |

**戻り値**: `string` — 生成された v4 互換 HTML ブロック  
**エラー**: 存在しない `blockName` を渡すと `Error('Block <blockName> not found')` を throw

### 命名規則

`blockName` がキャメルケース + 末尾番号（`textImage1` / `imageText3`）なのは、v3 の元 HTML テンプレートファイル名（`text-image1.html` / `image-text3.html`）にそのまま対応しているため。v3 → v4 移行スクリプトで「v3 のテンプレート参照」と「migrator への入力」が 1 対 1 で対応するように設計されている。v4 のブロック名（kebab-case）とは別系統である点に注意。

## 使用例

### `textImage1`（テキスト + 画像、単一カラム）

```ts
import { createBlock } from '@burger-editor/migrator/v3';

const html = createBlock('textImage1', [
	{ ckeditor: '<p>テキストコンテンツ</p>' },
	{
		popup: false,
		empty: 0,
		hr: false,
		path: '/images/sample.jpg',
		srcset: '',
		alt: 'サンプル画像',
		width: '',
		height: '',
		caption: '',
	},
]);
```

### `imageText3`（3 カラム画像+テキスト）

```ts
import { createBlock } from '@burger-editor/migrator/v3';

const html = createBlock('imageText3', [
	{
		path: '/images/card1.jpg',
		alt: 'カード1',
		popup: false,
		empty: 0,
		hr: false,
		srcset: '',
		width: '',
		height: '',
		caption: '',
	},
	{ ckeditor: '<h3>カード1</h3><p>説明文</p>' },
	{
		path: '/images/card2.jpg',
		alt: 'カード2',
		popup: false,
		empty: 0,
		hr: false,
		srcset: '',
		width: '',
		height: '',
		caption: '',
	},
	{ ckeditor: '<h3>カード2</h3><p>説明文</p>' },
	{
		path: '/images/card3.jpg',
		alt: 'カード3',
		popup: false,
		empty: 0,
		hr: false,
		srcset: '',
		width: '',
		height: '',
		caption: '',
	},
	{ ckeditor: '<h3>カード3</h3><p>説明文</p>' },
]);
```

## 主要な `blockName`

利用頻度の高いものを抜粋。完全な一覧は `@burger-editor/legacy/v3` の `blocks` export を参照。

| `blockName`  | v3 での用途                   |
| ------------ | ----------------------------- |
| `title`      | 大見出し（h2）                |
| `wysiwyg`    | リッチテキスト                |
| `image1`     | 単一画像                      |
| `textImage1` | テキスト + 画像（単一カラム） |
| `imageText3` | 3 カラム画像+テキストカード   |
| `button`     | ボタン                        |

## 対応バージョン

- **v3 → v4**: 完全サポート
- 将来のバージョン間移行: 計画中

## License

Dual Licensed under MIT OR Apache-2.0
