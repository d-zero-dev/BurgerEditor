---
paths:
  - 'packages/@burger-editor/local/src/client/**'
  - 'packages/@burger-editor/local/src/protocol/**'
---

# local のブラウザ側（vite でバンドルされる）

- `@burger-editor/cli` は `@burger-editor/cli/block-op` からしか import しない。メインエントリは `node:fs` / `node:crypto` を引き込み、ブラウザ向けのビルドを壊す
- `protocol/` はサーバーとブラウザで共有するので、Node の組み込みモジュールに依存させない
- バンドルには `core` が 2 つ入る。稼働中のブロックはエンジンのメソッド（`getLiveBlocks()` / `applyLiveBlockOp()` / `getLiveBlockIndex()`）で扱い、エンジンまわりの `core` は `import type` にする。`core` の関数を直接使うのは HTML 文字列の解析だけにする
- アイテムは `@burger-editor/blocks/editor` から取る（ブラウザ専用）
- テストは `*.browser.spec.ts` → `local/client-browser`（Chromium と実エンジン）、それ以外 → `local/client`（jsdom）
