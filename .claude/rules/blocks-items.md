---
paths:
  - 'packages/@burger-editor/blocks/src/**'
---

# blocks の標準アイテム

- アイテムは 3 ファイルに分ける: `definition.ts`（テンプレート・スタイル・`toEditorState` / `toItemData`。React に依存しない）/ `editor.tsx`（名前付きの関数 `XxxEditor`）/ `index.tsx`（`createItem({ ...xxxDefinition, Editor: XxxEditor })`）
- アイテムを追加したら `items/items.ts`（`definition` を import）と `items/editor-items.ts`（`index` を import）の両方に登録する
- ルートエントリ側（`index.ts`・`items/items.ts`・`items/*/definition.ts`・`catalogs/**`）は Node.js から読まれる。`react` / `react-dom` / `@burger-editor/client*` や `editor-items.js`・`*/index.js` を import しない（ESLint が検出し、ビルド後は `yarn verify:blocks-boundary` が検査する）
- `createItem()` の戻り値はスプレッドしない（テスト用 getter `_` が throw する）。合成は素の `xxxDefinition` に対して行う
- `Editor` をオブジェクトのメソッド省略記法で書かない。`eslint-disable-next-line react-hooks/exhaustive-deps` も書かない（どちらも React Compiler が黙って対象外にする）。`useEffectEvent` か client の `useMountEffect()` で避ける
- `yarn verify:react-compiler` がアイテムごとのコンパイル状態を固定している。意図して対象外にしているものは `scripts/check-react-compiler-coverage.mjs` の `EXPECTED_UNCOMPILED` にある
- `Editor` の props は `{ state, setState, item }` だけ。engine や config は `useEngine()` で読む
- 公開型は手書きの `types.d.ts`（ルート）と `editor.d.ts`（`./editor`）。公開する形を変えたら合わせて直す
- テストは `*.spec.ts` → `blocks`、`*.spec.tsx` → `blocks-editor`。React Compiler なしの確認は `yarn test:no-compiler`
