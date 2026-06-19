# `@burger-editor/cli`

BurgerEditor v4 プロジェクトを AI エージェント（Claude Code 等）・スクリプト・CI から非対話で操作する CLI。**stdout には常に JSON のみ** を出力する。`@burger-editor/mcp-server` の v4 ツールはこの CLI のハンドラを内部的にラップしている。

## Quick Start

プロジェクトルートに最小の `burgereditor.config.js` を置く（[`@burger-editor/local`](../local/#quick-start) と同じ設定を共有）:

```js
/** @type {import('@burger-editor/local').LocalServerConfigUserSettings} */
export default {
	documentRoot: './src',
	assetsRoot: './public',
};
```

最初に叩くコマンド:

```sh
# プロジェクトのページツリーを見る
npx @burger-editor/cli page-list

# 単一ページの中身を見る
npx @burger-editor/cli page-get about.html

# 解決済み config を確認
npx @burger-editor/cli config-resolve
```

`page-list` が JSON を返せばインストール成功。

## Related Packages

| パッケージ                                      | 役割                                              | CLI vs MCP の使い分け                                                     |
| ----------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| [`@burger-editor/cli`](./) **（本パッケージ）** | 非対話 CLI（JSON-only stdout）                    | パイプライン・スクリプト統合・人間が直接叩く・CI 組み込み                 |
| [`@burger-editor/mcp-server`](../mcp-server/)   | MCP サーバー（AI クライアント向けインタフェース） | AI クライアントから自然言語で叩く・Claude Desktop / Code / Cursor / Cline |
| [`@burger-editor/local`](../local/)             | ブラウザ UI + HTTP サーバー                       | 編集者が GUI で操作する。CLI / MCP と同じ `burgereditor.config.js` を共有 |
| [`@burger-editor/core`](../core/)               | エディタエンジン本体・カスタムアイテム実装基盤    | 独自ブロック / アイテムを実装するとき                                     |
| [`@burger-editor/file-io`](../file-io/)         | ファイル I/O・virtual-path-resolver の本体        | 本 CLI が内部利用。直接依存する必要はない                                 |

## Installation / Usage

bin はスコープ名 `@burger-editor/cli` で公開し、グローバル PATH を汚さない方針。**npx 経由で呼び出す**:

```sh
npx @burger-editor/cli <subcommand> [args] [flags]
```

引数の細部は `npx @burger-editor/cli --help` を参照。

## 設計判断

コマンド体系の詳細に入る前に、CLI が満たす契約を列挙する。

- **JSON-only stdout**: 成功時は単一 JSON 行のみ。ユーザー側の `dotenv` バナー等は stderr にリダイレクトされ、最終 JSON は drain callback で確実に flush される
- **3-way spec input**: `--spec` / `--spec-file` / **stdin** の優先順で受け取る。シェルクォート地獄を回避するため
- **atomic 操作**: `page-create` は `fs.writeFile(... flag: 'wx')` で原子的に reserve、`page-rename` は rename 失敗時に作成済みディレクトリを巻き戻す
- **ハンドラの再利用**: `src/handlers.ts` の各関数は `mcp-server` の v4 ツールがそのままラップして公開する。CLI と MCP で同じ振る舞い
- **block-move の `to`**: `Array.prototype.splice` 慣用で、**移動後の最終配列における index**
- **パスは documentRoot 起点**: リーディング `/` は OS ルートではなく `documentRoot` 直下として扱う（AI エージェントの直感に合わせるため）

## stdout / stderr / exit code 契約

- `stdout` … 成功時の JSON のみ
- `stderr` … エラー `{"error":{...}}`、警告、デバッグ情報
- `exit code` … 成功 = 0、失敗 = 1

エラーは stderr に `{"error":{"name":"...","message":"..."}}` を返し exit code 1。

## spec の渡し方（3-way input）

`block-insert` / `block-replace` / `front-matter-set` / `page-create` は JSON spec を以下の優先順で受け取る:

1. `--spec '{"catalog":"h2",...}'` — インライン JSON 文字列
2. `--spec-file ./block.json` — ファイルパス
3. **stdin** — TTY ではないとき自動的に読まれる

```sh
# stdin
echo '{"catalog":"h2","items":[[{"name":"title-h2","data":{"titleH2":"見出し"}}]]}' \
  | npx @burger-editor/cli block-insert about.html 0

# --spec インライン
npx @burger-editor/cli block-replace about.html 3 \
  --spec '{"catalog":"wysiwyg","items":[[{"name":"wysiwyg","data":{"wysiwyg":"<p>本文</p>"}}]]}'

# --spec-file
npx @burger-editor/cli block-insert about.html 0 --spec-file ./hero.json

# front-matter 全置換
echo '{"title":"新タイトル"}' \
  | npx @burger-editor/cli front-matter-set about.html --replace
```

## パス指定

実ファイルパス・論理パスの両方を受け付ける。

- 実ファイルパス（documentRoot 配下の絶対 / 相対）
- 仮想 / 論理パス（`virtualTree.enabled: true` 時の Front Matter `path` キー）

リーディング `/` は **OS ルートではなく documentRoot 直下**として扱う（AI エージェントの直感に合わせるため）。

```sh
npx @burger-editor/cli page-get about.html
npx @burger-editor/cli page-get /about.html        # 同じ（documentRoot 起点）
npx @burger-editor/cli page-get foo/bar.html       # 仮想ツリー有効時は論理パスとして lookup
npx @burger-editor/cli page-get /                  # → documentRoot/<indexFileName>
```

## コマンド一覧

すべて成功時は stdout に JSON を 1 行返す。エラーは stderr に `{"error":{"name":"...","message":"..."}}` を返し exit code 1。

### ページ操作

| コマンド                           | 説明                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `page-list`                        | `documentRoot` 配下のページツリーを返す                                                          |
| `page-get <path>`                  | Front Matter と編集可能領域の内容を返す                                                          |
| `page-create <path> [--spec ...]`  | 新規ページを `newFileContent` テンプレートから atomic に作成（同時実行で一方だけが成功）         |
| `page-delete <path>`               | ファイル削除                                                                                     |
| `page-rename <from> <to>`          | ファイル移動。失敗時に作成済みディレクトリを巻き戻す                                             |
| `page-copy <from> <to>`            | ファイル複製                                                                                     |
| `page-concat <target> <source...>` | source の編集可能領域を target に append。source は **1 つ以上必須**、存在しない source はエラー |

### Front Matter

| コマンド                                           | 説明                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `front-matter-get <path>`                          | Front Matter を返す                                                             |
| `front-matter-set <path> [--spec ...] [--replace]` | デフォルトは **merge**（既存キーを保持しつつ上書き）、`--replace` で **全置換** |

### ブロック操作

| コマンド                                     | 説明                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `block-list <path>`                          | 各ブロックのメタ + 構造化されたアイテムデータを返す（`{index, data, html}[]`）    |
| `block-get <path> <index>`                   | 単一ブロックを返す                                                                |
| `block-insert <path> <atIndex> [--spec ...]` | atIndex 位置に挿入(0 = 先頭、配列長以上の値 = 末尾)                               |
| `block-replace <path> <index> [--spec ...]`  | 指定 index のブロックを置き換え                                                   |
| `block-delete <path> <index>`                | 削除                                                                              |
| `block-move <path> <from> <to>`              | 移動。`to` は **移動後の最終配列における index**（`Array.prototype.splice` 慣用） |

### スキーマ・参照

| コマンド                 | 説明                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `catalog-list`           | プロジェクト `config` で使えるブロックカタログ一覧                    |
| `catalog-get <name>`     | 単一カタログ定義                                                      |
| `item-list`              | 標準アイテム名一覧                                                    |
| `item-schema <name>`     | アイテムの template / editor HTML（データキー推定用）                 |
| `style-options-list`     | プロジェクト CSS から抽出した `--bge-options-<軸>--<バリアント>` 一覧 |
| `container-options-list` | 静的なコンテナレイアウト選択肢（grid/inline/float）                   |
| `config-resolve`         | 解決済み `config` の要約                                              |

## block spec フィールド

```ts
interface BlockSpec {
	catalog?: string; // config の catalog から名前で template を選ぶ
	name?: string; // catalog を使わずに直接ブロック名指定
	containerProps?: object; // 例: { type: 'grid', columns: 3 }
	classList?: string[];
	style?: Record<string, string>;
	items?: BlockItemStructure; // [[{ name: 'title-h2', data: { titleH2: '...' } }]]
}
```

**アイテムデータキーは camelCase**。`data-bge="title-h2"` → `titleH2`。詳細はリポジトリルートからの相対パスで [`skills/burger-editor-v4/references/update-page.md`](../../../skills/burger-editor-v4/references/update-page.md) を参照。

## プログラマブル API

CLI ハンドラは JS / TS から直接呼べる:

```ts
import { loadContext, blockList, blockReplace } from '@burger-editor/cli';

const ctx = await loadContext();
const { blocks } = await blockList(ctx, 'about.html');
await blockReplace(ctx, 'about.html', 0, {
	catalog: 'h2',
	items: [[{ name: 'title-h2', data: { titleH2: '新しい見出し' } }]],
});
```

`@burger-editor/mcp-server` の v4 ツールも同じパスを通る。

## メンテナンス責任

- 新コマンド追加 → `src/handlers.ts` にハンドラ、`src/bin.ts` に case、`mcp-server/src/tools/v4.ts` に MCP ラッパーを 1 PR にまとめる
- 出力 JSON shape の変更は **破壊的変更扱い**、CHANGELOG にマイグレーション例必須

## License

Dual Licensed under MIT OR Apache-2.0
