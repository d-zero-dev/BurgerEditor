# `@burger-editor/cli`

BurgerEditor v4 プロジェクトを AI エージェント（Claude Code 等）から非対話で操作する CLI。**stdout には常に JSON のみ**を出力する。`@burger-editor/mcp-server` の v4 ツールはこの CLI のハンドラを内部的にラップしている。

## Installation / Usage

bin はスコープ名 `@burger-editor/cli` で公開し、グローバル PATH を汚さない方針。**npx 経由で呼び出す**:

```sh
npx @burger-editor/cli <subcommand> [args] [flags]
```

コマンド一覧と引数仕様は `src/bin.ts` / `src/handlers.ts` および `--help` を参照。代表的なコマンド: `page-list` / `page-get` / `page-create` / `page-delete` / `page-rename` / `page-copy` / `page-concat`, `front-matter-get` / `front-matter-set`, `block-list` / `block-get` / `block-insert` / `block-replace` / `block-delete` / `block-move`, `catalog-list` / `catalog-get` / `item-list` / `item-schema` / `style-options-list` / `container-options-list` / `config-resolve`。

## 設計判断

- **JSON-only stdout**: 成功時は単一 JSON 行のみ。ユーザー設定の `dotenv` バナー等は stderr にリダイレクトされ、最終 JSON は drain callback で確実に flush される
- **3-way spec input**: `--spec '...'`（インライン JSON）/ `--spec-file <path>` / **stdin**（TTY ではないとき自動）の優先順で受け取る。シェルクォート地獄を回避するため
- **atomic 操作**: `page-create` は `fs.writeFile(... flag: 'wx')` で原子的に reserve、`page-rename` は rename 失敗時に作成済みディレクトリを巻き戻す
- **ハンドラの再利用**: `src/handlers.ts` の各関数は `mcp-server` の v4 ツールがそのままラップして公開する
- **block-move の `to`**: `Array.prototype.splice` 慣用で、**移動後の最終配列における index**

## stdout / stderr / exit code 契約

- `stdout` … 成功時の JSON のみ
- `stderr` … エラー `{"error":{...}}`、警告、デバッグ情報
- `exit code` … 成功 = 0、失敗 = 1

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

**アイテムデータキーは camelCase**。`data-bge="title-h2"` → `titleH2`。詳細は `skills/burger-editor-v4/references/update-page.md`。

## パス指定

- 実ファイルパス（documentRoot 配下の絶対 / 相対）
- 仮想 / 論理パス（`virtualTree.enabled: true` 時の Front Matter path key）

リーディング `/` は **OS ルートではなく documentRoot 直下**として扱う（AI エージェントの直感に合わせるため）。

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

## メンテナンス責任

- 新コマンド追加 → `src/handlers.ts` にハンドラ、`src/bin.ts` に case、`mcp-server/src/tools/v4.ts` に MCP ラッパーを 1 PR にまとめる
- 出力 JSON shape の変更は **破壊的変更扱い**、CHANGELOG にマイグレーション例必須

## License

Dual Licensed under MIT OR Apache-2.0
