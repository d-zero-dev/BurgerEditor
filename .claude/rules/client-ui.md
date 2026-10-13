---
paths:
  - 'packages/@burger-editor/client/src/**'
  - 'packages/@burger-editor/blocks/src/items/*/editor.tsx'
---

# 管理画面 UI（React）

- `engine` を props で渡さない。`useEngine()` で読む（`engine` を受け取るのは `EngineProvider` だけ）
- ボタンの動作は `command` / `commandfor` で宣言する（click は ESLint で禁止）。エンジンを動かすものは `BGE_COMMAND` と `registerEngineCommands()`、表示だけを変えるものは `useCommand()`。`CommandEvent` はバブリングしないので、`useCommand()` の ref は `commandfor` が指す要素そのものに付ける
- 1 つの document に複数のエンジンが共存する。固定の ID を使わず `useId()` / `engine.commandBus.receiverId` を使う
- 見た目を変えたら `yarn test:vr:docker`。意図した変更なら `yarn test:vr:docker:update` でベースラインを更新する（VR は Docker でしか CI と一致しない）
- テストプロジェクトは `client`（Chromium）。React Compiler なしの確認は `yarn test:no-compiler`
