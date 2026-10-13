# よくある落とし穴とデバッグ

症状から原因を引く。ファイルはすべて `packages/@burger-editor/custom-element/` 配下。

## 目次

- [ツールバーボタンが表示されない](#ツールバーボタンが表示されない)
- [ボタンを押しても何も起きない](#ボタンを押しても何も起きない)
- [ボタンの disabled / aria-pressed が更新されない](#ボタンの-disabled--aria-pressed-が更新されない)
- [型エラーで build が落ちる](#型エラーで-build-が落ちる)
- [カスタム属性が保持されない・不正値が残る](#カスタム属性が保持されない不正値が残る)
- [カスタム Paragraph が反映されない](#カスタム-paragraph-が反映されない)
- [構造変更として検出され HTML モードで開く](#構造変更として検出され-html-モードで開く)
- [属性のスタイルが当たらない](#属性のスタイルが当たらない)
- [デバッグ方法](#デバッグ方法)

## ツールバーボタンが表示されない

- 表示可否は `src/bge-wysiwyg-editor-element/index.ts` のテンプレート内 `commands.includes('xxx')` 分岐で決まる。分岐（ボタン HTML）自体が無いと、どの指定でも表示されない
- `commands` 属性が指定されている場合は、その値に含まれるボタンだけが出る。`static defaultCommands` は `commands` 属性が無いときにだけ使われる
- `commands` 属性の値は `trim()` と `toLowerCase()` を通る。ボタン名は小文字の kebab-case にする

## ボタンを押しても何も起きない

- `bindToggle()` の `switch` に該当ボタン名の `case` が無い。`default` が無いので無言で何もしない
- ボタン HTML に `${toggleCommand}`（`command="--wysiwyg-toggle"` と `commandfor`）が付いていない。click ハンドラは使わない規約のため、Invoker Commands が無いと起動しない
- 既知の例: テンプレートには `h1` ボタンがあるが `bindToggle()` に `case 'h1'` が無い（別 issue で扱う既知の不具合）

## ボタンの disabled / aria-pressed が更新されない

- `BUTTON_TO_STATE_KEY_MAP` に kebab-case のボタン名 → camelCase の state キーが無い。`updateButtonState()` は開発ビルドで `console.warn('Unknown button type: <name>')` を出して何もしない
- `getCurrentEditorState`（`src/utils/get-current-editor-state.ts`）に state キーが無い、または `disabled` 判定の `editor.can()...` が誤っている
- `link` / `buttonLikeLink` のように常に有効にしたい場合は `disabled: false` を返す

## 型エラーで build が落ちる

- `EditorState` は `Record<EditorNode, NodeState>` なので、`EditorNode` に足したキーを `getCurrentEditorState` が返さないと型エラーになる（逆も同じ）
- `BUTTON_TO_STATE_KEY_MAP` の値は `keyof EditorState`。`EditorNode` に無いキーは書けない
- カスタム拡張のコマンドは `declare module '@tiptap/core'` で宣言しないと `editor.chain().xxx()` が型エラーになる
- Vitest は型チェックしないため、テストが通っても `yarn build` で必ず確認する

## カスタム属性が保持されない・不正値が残る

- `parseHTML` / `renderHTML` のどちらかが無い
- `renderHTML` が値 `null` のとき `{}` を返していない
- `parseHTML` で許可リスト検証をせず、そのまま値を返している

書き方は [custom-extension.md](custom-extension.md#属性の-parsehtml--renderhtml)。

## カスタム Paragraph が反映されない

- `StarterKit` の `paragraph` と同名の拡張は両方登録され、ソート後の並びで後ろの方がスキーマに採用される。`BgeWysiwygEditorKit` の `addExtensions()` に入れていれば後ろになる
- `priority` を親（1000）より大きくすると前に並び、`StarterKit` 版に負ける
- コンソールの `[tiptap warn]: Duplicate extension names found: ['paragraph']` は同名上書きに伴う想定内の警告

詳細は [custom-extension.md](custom-extension.md#既存ノードと同名で上書きする場合の解決順)。

## 構造変更として検出され HTML モードで開く

TipTap がスキーマで表現できない要素・属性を落として再構築している。

- 拡張が `BgeWysiwygEditorKit` に登録されているか
- `parseHTML` のセレクタが対象要素に一致しているか、属性の `parseHTML` / `renderHTML` が往復で同じ値を返すか
- `expectHTML()` の出力と元 HTML を比べ、`hasStructureChange` が `false` になるテストを書く

## 属性のスタイルが当たらない

`packages/@burger-editor/blocks/src/general.css`（またはアイテムの `style.css`）にスタイルが無い。書き方は [custom-extension.md](custom-extension.md#見た目に影響する属性の-css)。

## デバッグ方法

`transaction` / `bge:structure-change` イベントの監視とモード確認は `packages/@burger-editor/custom-element/docs/CUSTOMIZATION.md` の「デバッグのヒント」を使う。`transaction` の `event.detail.state` はツールバー用の `Record<EditorNode, NodeState>`（`getCurrentEditorState` の結果）であり、ProseMirror の `EditorState` ではない。

TipTap 内部の状態と HTML 出力は `BgeWysiwygElement.editor` から直接見る。

```ts
const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
console.log('Stored marks:', element.editor.state.storedMarks);
console.log('Current node:', element.editor.state.selection.$from.parent);
console.log('Output HTML:', element.editor.getHTML());
```
