# @burger-editor/cli

BurgerEditor v4 プロジェクトを AI エージェント（Claude Code 等）から非対話で操作するための CLI です。stdout には常に JSON のみを出力し、`@burger-editor/mcp-server` の v4 ツールはこの CLI のハンドラを内部的にラップしています。

## なぜ存在するか

- AI エージェント / スクリプトから BurgerEditor のページ・ブロックを安全に編集したい
- `@burger-editor/local` の HTTP API はブラウザ UI 前提なので、CI や非対話シェルから使うには重い
- ファイル I/O を直接やると Front Matter・editableArea・カタログ仕様などの不変条件を簡単に破る
- 上記すべてを保ったまま、`npx @burger-editor/cli <subcommand>` で叩ける JSON-only インターフェースが欲しい

## インストール

`bin` をスコープ名 `@burger-editor/cli` で公開しています。グローバルにコマンド名を取らせない（PATH を汚さない）方針なので、**npx 経由で呼び出してください**：

```bash
npx @burger-editor/cli <subcommand> [args] [flags]
```

## コマンド一覧

すべて stdout に JSON を 1 行返します。エラーは stderr に `{"error":{"name":"...","message":"..."}}` を返し、exit code 1 で終了します。

### ページ操作

| コマンド                           | 説明                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `page-list`                        | `documentRoot` 配下のページツリーを返す                                                          |
| `page-get <path>`                  | Front Matter と編集可能領域の内容を返す                                                          |
| `page-create <path> [--spec ...]`  | 新規ページを `newFileContent` テンプレートから作成（atomic — 同時実行で一方だけが成功）          |
| `page-delete <path>`               | ファイル削除                                                                                     |
| `page-rename <from> <to>`          | ファイル移動。失敗時に作成済みディレクトリを巻き戻す                                             |
| `page-copy <from> <to>`            | ファイル複製                                                                                     |
| `page-concat <target> <source...>` | source の編集可能領域を target に append。source は **1 つ以上必須**、存在しない source はエラー |

### Front Matter

| コマンド                                           | 説明                                     |
| -------------------------------------------------- | ---------------------------------------- |
| `front-matter-get <path>`                          | Front Matter を返す                      |
| `front-matter-set <path> [--spec ...] [--replace]` | デフォルトは merge、`--replace` で全置換 |

### ブロック操作

| コマンド                                     | 説明                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `block-list <path>`                          | 各ブロックのメタ + 構造化されたアイテムデータを返す（`{index, data, html}[]`）    |
| `block-get <path> <index>`                   | 単一ブロックを返す                                                                |
| `block-insert <path> <atIndex> [--spec ...]` | atIndex 位置に挿入（0 = 先頭、大きな値 = 末尾）                                   |
| `block-replace <path> <index> [--spec ...]`  | 指定 index のブロックを置き換え                                                   |
| `block-delete <path> <index>`                | 削除                                                                              |
| `block-move <path> <from> <to>`              | 移動。`to` は **移動後の最終配列における index**（`Array.prototype.splice` 慣用） |

### スキーマ・参照

| コマンド                 | 説明                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `catalog-list`           | プロジェクト設定で使えるブロックカタログ一覧                          |
| `catalog-get <name>`     | 単一カタログ定義                                                      |
| `item-list`              | 標準アイテム名一覧                                                    |
| `item-schema <name>`     | アイテムの template / editor HTML（データキー推定用）                 |
| `style-options-list`     | プロジェクト CSS から抽出した `--bge-options-<軸>--<バリアント>` 一覧 |
| `container-options-list` | 静的なコンテナレイアウト選択肢（grid/inline/float）                   |
| `config-resolve`         | 解決済み config の要約                                                |

## block spec の渡し方

`block-insert` / `block-replace` / `front-matter-set` / `page-create` の各コマンドは JSON spec を **3 つの方法**のいずれかで受け取ります（優先順）：

1. `--spec '{"catalog":"h2",...}'` インラインの JSON 文字列
2. `--spec-file ./block.json` ファイルパス
3. **stdin** — TTY ではないとき自動的に読まれる

```bash
# stdin 経由
echo '{"catalog":"h2","items":[[{"name":"title-h2","data":{"titleH2":"見出し"}}]]}' \
  | npx @burger-editor/cli block-insert about.html 0

# --spec インライン
npx @burger-editor/cli block-replace about.html 3 --spec '{"catalog":"wysiwyg","items":[[{"name":"wysiwyg","data":{"wysiwyg":"<p>本文</p>"}}]]}'

# --spec-file
npx @burger-editor/cli block-insert about.html 0 --spec-file ./hero.json
```

### block spec フィールド

```ts
interface BlockSpec {
	catalog?: string; // burgereditor.config.js の catalog から名前で template を選ぶ
	name?: string; // catalog を使わずに直接ブロック名を指定する場合
	containerProps?: object; // 例: { type: 'grid', columns: 3 }
	classList?: string[];
	style?: Record<string, string>; // 例: { '--bge-options-margin': 'var(--bge-options-margin--large)' }
	items?: BlockItemStructure; // [[{ name: 'title-h2', data: { titleH2: '...' } }]]
}
```

**アイテムデータキーは camelCase**。`data-bge="title-h2"` → `titleH2`。詳細は [skills/burger-editor-v4/references/update-page.md](../../../skills/burger-editor-v4/references/update-page.md) 参照。

## パス指定

- 実ファイルパス（documentRoot 配下の絶対 or 相対）
- 仮想 / 論理パス（`virtualTree.enabled: true` 時に Front Matter から構築された path key）

どちらも受け付けます。リーディング `/` は **OS ルートではなく documentRoot 直下** として扱われます。

```bash
npx @burger-editor/cli page-get about.html
npx @burger-editor/cli page-get /about.html       # 同じ
npx @burger-editor/cli page-get foo/bar.html       # 仮想ツリー有効時は logical path として lookup
npx @burger-editor/cli page-get /                  # → documentRoot/<indexFileName>
```

## stdout / stderr の契約

- **stdout**: 成功時の JSON のみ。dotenv 等の banner が user config 読み込み中に発生しても stderr にリダイレクトされる
- **stderr**: エラー JSON、警告、デバッグ情報
- **exit code**: 成功 = 0、失敗 = 1

## 設定

`@burger-editor/file-io` の `resolveConfig()` 経由で `burgereditor.config.{js,mjs,ts,cjs,json}` を解決します。cosmiconfig の `searchStrategy: 'project'` で親方向に walk-up するため、サブディレクトリから起動してもプロジェクトルートの設定が見つかります。

## プログラマブル API

CLI ハンドラはそのまま JS / TS から呼べます：

```ts
import { loadContext, blockList, blockReplace } from '@burger-editor/cli';

const ctx = await loadContext();
const { blocks } = await blockList(ctx, 'about.html');
await blockReplace(ctx, 'about.html', 0, {
	catalog: 'h2',
	items: [[{ name: 'title-h2', data: { titleH2: '新しい見出し' } }]],
});
```

これは `@burger-editor/mcp-server` の v4 ツールが取っているのと同じパスです。

## 開発

```bash
# このパッケージのビルドのみ
npx lerna run build --scope @burger-editor/cli

# モノレポ全体のビルド（推奨）
yarn build

# テスト
npx vitest run --project default packages/@burger-editor/cli/

# E2E（bin spawn）
npx vitest run --project default packages/@burger-editor/cli/src/bin.spec.ts
```

## 関連

- [@burger-editor/mcp-server](../mcp-server/) — このパッケージをラップして MCP ツールとして公開
- [@burger-editor/file-io](../file-io/) — ファイル I/O 層
- [@burger-editor/core](../core/) — block-ops の本体
- [skills/burger-editor-v4/](../../../skills/burger-editor-v4/) — AI エージェント向け SKILL（`npx skills add d-zero-dev/BurgerEditor` で配布）

## 参照

- `@d-zero/roar` — CLI ヘルパー: https://github.com/d-zero-dev/tools/tree/main/packages/%40d-zero/roar
- MCP（Model Context Protocol）: https://modelcontextprotocol.io/
- npx skills: https://github.com/vercel-labs/skills

**検索キーワード**：「BurgerEditor CLI JSON output」「npx scoped bin name」「mcp tool wrap cli handler」

## メンテナンス責任

- 新コマンド追加 → `src/handlers.ts` にハンドラ実装、`src/bin.ts` に case 追加、`mcp-server/src/tools/v4.ts` に MCP ラッパー追加、対応する spec をすべて 1 つの PR に含める
- 出力 JSON shape の変更は **破壊的変更扱い**。CHANGELOG にマイグレーション例を必ず記載

## License

Dual Licensed under MIT OR Apache-2.0
