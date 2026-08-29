# cli-fallback — MCP が使えない環境向け

`@burger-editor/cli`（`npx @burger-editor/cli <subcommand>`）は MCP サーバーと**同じ機能を持つが契約が違う**。CI やシェルスクリプト、MCP を組み込めないクライアントから操作するときだけ使う。MCP が使える環境では MCP を優先する（このスキルの本体・他の references は MCP 前提で書かれている）。

## MCP との契約差分（最重要）

| 項目                                         | MCP                                                          | CLI                                                           |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `readToken`                                  | 変更系ツールに必須                                           | **一切不要**（ハンドラーを直接呼ぶ）                          |
| ブロックの特定                               | `target: { index }` または `{ id }`                          | **`index` のみ**。`id` 指定は不可                             |
| `page_update`（複数 op のバッチ）            | あり                                                         | **無い**。個別の `block-*` サブコマンドを順に呼ぶ             |
| `editor_state_get` / `editor_wait_for_event` | あり（Agent Hub 連携）                                       | **無い**                                                      |
| `page_blocks`                                | 2 段プロトコル（呼び出し側が `readToken` を挟んで 2 回呼ぶ） | **1 回で完結**し、一覧をそのまま返す（内部で 2 段を処理済み） |
| `--dry-run` の戻り値                         | `diff: { before, after }`（該当ブロックの HTML）             | `previewContent`（**編集可能領域全体**の HTML）               |

## 使い方

```bash
npx @burger-editor/cli page-blocks <path>
npx @burger-editor/cli block-insert <path> <atIndex> --spec '{"catalog":"h2","items":[[{"name":"title-h2","data":{"titleH2":"…"}}]]}'
npx @burger-editor/cli block-replace <path> <index> --spec-file ./spec.json
npx @burger-editor/cli block-delete <path> <index> --dry-run
```

- `--spec` はインライン JSON、`--spec-file` はファイルパス。どちらもキーは camelCase で書く
- stdout は常に JSON 1 行。エラーは stderr に JSON 1 行、終了コード 1
- `page-create` / `page-delete` / `page-rename` / `page-copy` / `page-concat` / `front-matter-get` / `front-matter-set` / `catalog-list` / `catalog-get` / `item-list` / `item-schema` / `style-options-list` / `container-options-list` / `config-resolve` / `block-get` / `block-move` / `block-duplicate` / `block-ensure-id` / `item-update` は MCP 側の同名ツールとほぼ同じ引数で使える（`target.id` が使えない点を除く）

他の references（`blocks-and-items.md` の spec 構造、`styling.md` の軸の考え方、`page-operations.md` のページ操作の順序）はそのまま CLI にも当てはまる。`live-editing.md`（Agent Hub）だけは MCP 経由の local モード専用で、CLI には該当しない。
