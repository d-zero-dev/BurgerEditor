---
paths:
  - 'packages/@burger-editor/local/src/app.ts'
  - 'packages/@burger-editor/local/src/routes/**'
  - 'packages/@burger-editor/local/src/agent/**'
  - 'packages/@burger-editor/local/src/commands/**'
---

# local のサーバー側

- ルートは `createApp()` の中で、`hostGuard` → `tokenLogin` → `requireAuth` の `.use('*')` より後に `.route()` する。独自の `Hono` アプリを別に待ち受けさせない
- 静的ファイルのフォールバック（`assetsFallback`）は最後に置く。新しいルートはそれより前に足す（後ろに置くと隠れる）
- `requireAuth` は `/api/health` と `SELF_GUARDED_PREFIXES`（`/api/agent`・`/ws`）を素通しする。この配下にルートを足すときは自分で認証する
- 状態をルートの `let` で持たない。`AppContext`（`config` / `store` / `agent`）経由で受け取る。仮想ファイルツリーの状態を持つのは `createResolverStateStore()` だけ
- 論理パスの入力は `isSafeLogicalPath` で検証する（`..` / `.` / NUL を拒否）
- `helpers/{front-matter,html-detection,no-editable-area-error,edit-content}.ts` と `model/{file-tree,virtual-path-resolver,get-user-config}.ts` は互換用の re-export。直すときは `core` / `file-io` 側を直す
- テストは `app.request()` か `hono/testing` の `testClient` で、ソケットを開かずに行う（プロジェクト `local`）
