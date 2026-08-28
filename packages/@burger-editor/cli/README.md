# `@burger-editor/cli`

BurgerEditor v4 プロジェクトを AI エージェント（Claude Code 等）・スクリプト・CI から非対話で操作する CLI。**stdout には常に JSON のみ** を出力する。AI エージェント向けツール定義（`src/agent-tools/`）もこのパッケージが持ち、`@burger-editor/mcp-server` と `@burger-editor/local` の Agent Hub はそれを登録して公開する。

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
| [`@burger-editor/cli`](./) **（本パッケージ）** | 非対話 CLI（JSON-only stdout）+ agent ツール定義  | パイプライン・スクリプト統合・人間が直接叩く・CI 組み込み                 |
| [`@burger-editor/mcp-server`](../mcp-server/)   | MCP サーバー（AI クライアント向けインタフェース） | AI クライアントから自然言語で叩く・Claude Desktop / Code / Cursor / Cline |
| [`@burger-editor/local`](../local/)             | ブラウザ UI + HTTP サーバー（Agent Hub 含む）     | 編集者が GUI で操作する。CLI / MCP と同じ `burgereditor.config.js` を共有 |
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
- **ツール定義の一本化**: AI エージェント向けツールは `src/agent-tools/tools/*.ts` に 1 ツール 1 定義で置かれ、`agentTools` 配列として export される。`mcp-server`（stdio）と `local` の Agent Hub（HTTP / WebSocket）は同じ配列を登録するだけなので、どの経路から呼んでも入力・出力・エラーの契約が同一になる
- **block-move の `to`**: `Array.prototype.splice` 慣用で、**移動後の最終配列における index**
- **パスは documentRoot 起点**: リーディング `/` は OS ルートではなく `documentRoot` 直下として扱う（AI エージェントの直感に合わせるため）

## stdout / stderr / exit code 契約

- `stdout` … 成功時の JSON のみ
- `stderr` … エラー JSON、警告、デバッグ情報
- `exit code` … 成功 = 0、失敗 = 1

エラーは stderr に、MCP ツールエラーおよび Agent Hub の `POST /api/agent/invoke` と共通の **フラットな** shape（`agentErrorSchema`、`src/agent-tools/errors.ts`）で 1 行返す:

```json
{ "error": "not-found", "message": "ENOENT: no such file or directory, open '...'" }
```

| フィールド      | 型         | 説明                                                                                                                |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `error`         | `string`   | 機械可読な短いコード（`invalid` / `not-found` / `exists` / `range` / `no-such-area` / `stale` / `read-required` …） |
| `message`       | `string`   | 何が起きたか + 次に何をすべきかを 1 文で                                                                            |
| `next`          | `string[]` | 任意。復旧のための次アクション                                                                                      |
| `readToken`     | `string`   | 任意。`readToken` 検証で失敗したとき同梱される新しいトークン                                                        |
| `currentBlocks` | `object[]` | 任意。`{ index, id, text }` の先頭ブロック要約（再試行の手がかり）                                                  |

## spec の渡し方（3-way input）

`block-insert` / `block-replace` / `item-update` / `front-matter-set` / `page-create` は JSON spec を以下の優先順で受け取る:

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

リーディング `/` は **OS ルートではなく documentRoot 直下**として扱う（AI エージェントの直感に合わせるため）。`documentRoot` の外を指すパス（`../` 等）は `resolvePathInput`（`@burger-editor/file-io`）が `invalid` エラーで拒否する。

```sh
npx @burger-editor/cli page-get about.html
npx @burger-editor/cli page-get /about.html        # 同じ（documentRoot 起点）
npx @burger-editor/cli page-get foo/bar.html       # 仮想ツリー有効時は論理パスとして lookup
npx @burger-editor/cli page-get /                  # → documentRoot/<indexFileName>
```

## コマンド一覧

すべて成功時は stdout に JSON を 1 行返す。エラーは stderr に前述の `{"error":"...","message":"...", ...}` を返し exit code 1。サブコマンドの正は `src/bin.ts` の `commands` テーブル。

### ページ操作

| コマンド                           | 説明                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `page-list`                        | `documentRoot` 配下のページツリーを返す（`invalidPages` 付き、後述）                             |
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

| コマンド                                                               | 説明                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `page-blocks <path>`                                                   | ページ内の全ブロック要約（`index` / `id` / `name` / `itemNames` / `text` / `headings` 等）を返す |
| `block-get <path> <index>`                                             | 単一ブロック（`data` / `html`）を返す                                                            |
| `block-insert <path> <atIndex> [--spec ...] [--dry-run]`               | atIndex 位置に挿入（0 = 先頭、大きな値 = 末尾）                                                  |
| `block-replace <path> <index> [--spec ...] [--dry-run]`                | 指定 index のブロックを置き換え                                                                  |
| `block-delete <path> <index> [--dry-run]`                              | 削除                                                                                             |
| `block-move <path> <from> <to> [--dry-run]`                            | 移動。`to` は **移動後の最終配列における index**（`Array.prototype.splice` 慣用）                |
| `block-duplicate <path> <index> [--dry-run]`                           | 指定ブロックの複製を直後に挿入（複製側の id は付かない）                                         |
| `block-ensure-id <path> <index>`                                       | id を持たないブロックに安定 id `bge-<n>` を付与（idempotent — 既に id があれば無変更）           |
| `item-update <path> <blockIndex> <itemIndex> [--spec ...] [--dry-run]` | ブロック内の 1 アイテムのデータに spec を **マージ**（省略したフィールドは維持）                 |

#### `--dry-run`（プレビュー）

書き込み系ブロックコマンドは `--dry-run` を受け付けます。ファイルを更新せず、書き込まれるはずの編集可能領域 HTML を `previewContent` に入れて返します。CI / レビュー差分プレビュー用途を想定。

```bash
npx @burger-editor/cli block-insert about.html 0 --dry-run --spec '{...}'
# → { "path": "about.html", "atIndex": 0, "dryRun": true, "previewContent": "<...>" }
```

**注意**: dryRun は副作用なし。対象ページが存在しないと「Cannot dry-run mutation on a non-existent page」エラーを返します（空ファイルを残さないため）。

### スキーマ・参照

| コマンド                 | 説明                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `catalog-list`           | プロジェクト設定で使えるブロックカタログ一覧                                           |
| `catalog-get <name>`     | 単一カタログ定義 + そのまま `block-insert --spec` に渡せる `template` 雛形             |
| `item-list`              | 標準アイテム名一覧                                                                     |
| `item-schema <name>`     | アイテムの template + データキー一覧（`fields` / テンプレート由来の `dataKeys`、後述） |
| `style-options-list`     | プロジェクト CSS から抽出した `--bge-options-<軸>--<バリアント>` 一覧                  |
| `container-options-list` | 静的なコンテナレイアウト選択肢（grid/inline/float）                                    |
| `config-resolve`         | 解決済み config の要約                                                                 |

### CLI サブコマンドを持たないツール

`page_update`（`BlockOp[]` の一括適用）、`editor_state_get`、`editor_wait_for_event` は agent ツール（`src/agent-tools/tools/`）としてのみ存在し、MCP / Agent Hub 経由で呼ぶ。CLI からはそれぞれ個別の `block-*` コマンドを順番に叩くことで代替できる。

## `readToken` — 読んでから書く契約

agent ツール（MCP / Agent Hub 経由）では、既存ページへの変更系ツールは直前にそのページを読んだときの `readToken`（ファイル内容ハッシュに束縛したトークン）を要求し、欠落なら `read-required`、内容が変わっていれば `stale` で失敗する。どちらの応答にも新しい `readToken` と `currentBlocks` が同梱されるので、エージェントは再読込なしに再試行できる。**CLI サブコマンドはこのトークンを要求しない** — `src/handlers.ts` を直接呼び、`page-blocks` は 2 段プロトコルを内部で完結させて結果だけを返す。なぜトークンが署名されず「手順」としてのみ強制されるのかは `src/agent-tools/read-token.ts` のファイルレベル JSDoc を参照。

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

## `invalidPages` — 壊れた / 移行待ちページの surface

`virtualTree.enabled: true` のプロジェクトで `pathKey` Front Matter を持たないファイル（移行待ちの legacy stub 等）があっても、**CLI / MCP は停止せずスキップ** します。エージェントの視界から消えないよう、`page-list` の戻り値に `invalidPages` 配列が含まれます。

```json
{
	"tree": [/* ... */],
	"documentRoot": "...",
	"invalidPages": [{ "file": "1.html", "reason": "missing-key", "message": "..." }]
}
```

`reason` は `'missing-key' | 'invalid-type' | 'empty-path'` のいずれか。**I/O エラー（EACCES, EBUSY, EIO 等）は常に伝搬** し、`invalidPages` には入りません（オペレーション上の障害は dirt ではないため silent mask しない）。

ローカルサーバーのブート時のように「Front Matter が壊れていたら止めたい」場合は、内部で `loadResolverState(..., { strict: true })` を直接呼ぶことで strict 挙動に切り替えられます。

## `fields` / `dataKeys` — 確定 camelCase キーセット

`item-schema <name>` の戻り値には、アイテムの **template HTML 内の `data-bge=*` 属性** から導出された camelCase キー一覧が 2 系統含まれます。`fields` は各バインディングを個別にパースした集合、`dataKeys` は template 全体を frozen-patty（`itemExport`）に通して得たキー集合です。

```bash
npx @burger-editor/cli item-schema image
# → { name: "image", template: "...", fields: [...],
#      dataKeys: ["alt","aspectRatio","caption","command","height","href",
#                 "loading","media","node","path","scale","scaleType",
#                 "style","target","width"] }
```

**重要**: エディタ UI の入力名ではなく、template HTML 内の `data-bge=*` が真の contract です。`wysiwyg`（カスタム要素）や `image`（`bge-path[]` の配列名）のようなアイテムでも、template 由来のキー集合なら agent が確実にデータキーを得られます。

## プログラマブル API

CLI ハンドラは JS / TS から直接呼べる。ブロックを指す `target` は `{ index }`（並び順）または `{ id }`（`blockEnsureId` で付与した安定 id）のどちらか:

```ts
import { loadContext, readBlocks, blockEnsureId, blockReplace } from '@burger-editor/cli';

const ctx = await loadContext();
const blocks = await readBlocks(ctx, 'about.html');
console.log(blocks.length);

const { id } = await blockEnsureId(ctx, 'about.html', { index: 0 });
await blockReplace(
	ctx,
	'about.html',
	{ id },
	{
		catalog: 'h2',
		items: [[{ name: 'title-h2', data: { titleH2: '新しい見出し' } }]],
	},
);
```

各関数のシグネチャと戻り値は `src/handlers.ts` の JSDoc を参照。

### `exports`

| サブパス                      | 内容                                                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@burger-editor/cli`          | `loadContext` / ハンドラ群 / `agentTools` と agent ツール関連（`AgentError` / `agentErrorSchema` / `readToken` ユーティリティ等）                               |
| `@burger-editor/cli/block-op` | `blockOpSchema`（zod）と `BlockOp` 型のみ。Node 組み込みモジュールに依存しないため、ブラウザバンドル（`@burger-editor/local` のクライアント）から import できる |

## メンテナンス責任

- 新コマンド追加 → `src/handlers.ts` にハンドラ、`src/bin.ts` の `commands` に登録、agent ツールとしても公開するなら `src/agent-tools/tools/*.ts` に定義を置いて `src/agent-tools/index.ts` の `agentTools` に追加する。`mcp-server` / `local` 側の変更は不要（配列を登録しているだけ）
- 出力 JSON shape の変更は **破壊的変更扱い**、CHANGELOG にマイグレーション例必須

## License

Dual Licensed under MIT OR Apache-2.0
