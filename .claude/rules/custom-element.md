---
paths:
  - 'packages/@burger-editor/custom-element/src/**'
---

# custom-element

- 状態（`mode` / `hasStructureChange` / TipTap の状態）は子の `<bge-wysiwyg>` だけが持つ。親の `<bge-wysiwyg-editor>` は読むだけで、同じ状態を持たない
- 子は状態が変わると `transaction` か `bge:structure-change` を発火し、親はそれを購読して UI を更新する。`bge:structure-change` はモード切り替えのたびには発火しないので、モードを切り替える UI は切り替え直後にボタンを直接更新する（詳細は `bge-wysiwyg-editor-element/index.ts` のファイル先頭の JSDoc）
- 初期化は「リスナーを登録 → 現在の状態を読んで UI に反映」の順。リスナーには `AbortController` の signal を付けて後始末する
- 書式やツールバーボタンの追加は Skill `tiptap-extension` に従う
- テストプロジェクトは `custom-element`（Chromium）
