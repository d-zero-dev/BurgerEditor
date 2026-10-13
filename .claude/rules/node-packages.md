---
paths:
  - 'packages/@burger-editor/file-io/src/**'
  - 'packages/@burger-editor/cli/src/**'
  - 'packages/@burger-editor/mcp-server/src/**'
---

# Node 側のパッケージ（file-io / cli / mcp-server）

- `@burger-editor/blocks` はルートエントリだけを import する。`@burger-editor/blocks/editor`・`@burger-editor/client*`・`react` を引き込まない。React を入れていない環境で起動時に落ちるが、モノレポ内ではルートに React があるため普通のテストでは再現しない。ESLint はこれらのパッケージを見ていないので、`yarn verify:packed-install` と cli の `bin.spec.ts` が最後の砦
- ファイルシステム・設定・パスの解釈は `file-io` の `resolveConfig()` / `resolvePathInput()` に任せる。cli や mcp-server で独自に実装しない
- AI エージェント向けツールは cli の `agent-tools/tools/` に定義して `agentTools` に載せる。mcp-server と local はそれを登録するだけ
- `BlockOp` の型は `core` が持つ。cli の `blockOpSchema` は検証するだけ
- cli の stdout は JSON 1 行だけ。ログや警告は stderr に出す
