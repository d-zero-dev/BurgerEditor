---
name: tiptap-extension
description: '@burger-editor/custom-element の <bge-wysiwyg> / <bge-wysiwyg-editor> に TipTap 拡張（Mark・Node・属性）とツールバーボタンを組み込む手順。型定義・ツールバー状態・ボタン配線・テスト・ドキュメントまでの更新箇所を漏れなく列挙し、検証ループを示す'
when_to_use: '@burger-editor/custom-element の Wysiwyg に新しい書式（Mark）・ブロック（Node）・既存ノードへの属性を追加するとき、または組み込みツールバーボタンを追加・変更するとき。src/tiptap-extentions/ や src/bge-wysiwyg-editor-element/index.ts のツールバーを触るとき'
---

# TipTap 拡張の追加（@burger-editor/custom-element）

利用者がサブクラスで独自ボタンを足す方法は `packages/@burger-editor/custom-element/docs/CUSTOMIZATION.md` が扱う。このスキルはパッケージ本体に組み込みの拡張・ボタンを追加するコントリビュータ向け。

パスはリポジトリルート相対。

## 最重要事項

- ボタン追加は **6 箇所の同期** が必要: `EditorNode` 型 / `BgeWysiwygElement` の操作メソッド / `getCurrentEditorState` / `BUTTON_TO_STATE_KEY_MAP` / テンプレートのボタン HTML / `bindToggle()` の case。1 つでも漏れるとボタンが表示されない・動かない・状態が更新されない（症状は [references/pitfalls.md](references/pitfalls.md)）
- **公式拡張を優先する**。独自の属性・挙動が必要なときだけカスタム拡張を書く
- 依存は **バージョン固定** で追加する（`^` / `~` 禁止）
- Vitest は型チェックしない。型の整合は `yarn build` で確認する

## Mark か Node か

| 種類 | 対象                                     | 例                                                        |
| ---- | ---------------------------------------- | --------------------------------------------------------- |
| Mark | インラインの装飾。複数を同時に適用できる | bold, italic, subscript, superscript, link                |
| Node | ブロック構造。属性と階層を持つ           | paragraph, heading, blockquote, bulletList, note, flexBox |

既存ノードに属性を足すだけなら、そのノードを `extend()` するカスタム拡張にする（例: `ParagraphWithAlign`）。

## 手順

### 1. 依存を追加する（公式拡張を使う場合）

```sh
yarn workspace @burger-editor/custom-element add @tiptap/extension-xxx@<他の @tiptap/* と同じ厳密バージョン>
```

- 既存の `@tiptap/*` のバージョンは `packages/@burger-editor/custom-element/package.json` で確認して揃える
- `@tiptap/*` は Renovate の `group:monorepos` で自動グループ化されるため `.github/renovate.json` の追記は不要。`@tiptap/*` 以外を足す場合はルート `CLAUDE.md`「依存関係の追加」に従いグループ化を判断する

### 2. 拡張を登録する

- 公式拡張: `packages/@burger-editor/custom-element/src/tiptap-extentions/index.ts` でインポートし、`BgeWysiwygEditorKit` の `addExtensions()` の配列に追加する

  ```ts
  import { Extension } from '@tiptap/core';
  import Subscript from '@tiptap/extension-subscript';

  export const BgeWysiwygEditorKit = Extension.create({
  	name: 'bge-wysiwyg-editor-kit',
  	addExtensions() {
  		return [Subscript /* ... */];
  	},
  });
  ```

- カスタム拡張: `packages/@burger-editor/custom-element/src/tiptap-extentions/<name>.ts` を作り、`declare module '@tiptap/core'` でコマンド型を宣言してから同様に登録する。書き方は [references/custom-extension.md](references/custom-extension.md) を読む

### 3. 型とメソッドを追加する

- `packages/@burger-editor/custom-element/src/bge-wysiwyg-element/types.ts` の `EditorNode` に camelCase の state キーを追加する
- `packages/@burger-editor/custom-element/src/bge-wysiwyg-element/index.ts` の `BgeWysiwygElement` に操作メソッドを追加する

  ```ts
  toggleSubscript() {
  	this.editor.chain().focus().toggleSubscript().run();
  }
  ```

### 4. ツールバー状態を追加する

- `packages/@burger-editor/custom-element/src/utils/get-current-editor-state.ts` の `getCurrentEditorState` の戻り値にキーを追加する

  ```ts
  subscript: {
  	disabled: !editor.can().chain().focus().toggleSubscript().run(),
  	active: editor.isActive('subscript'),
  },
  ```

- 同関数の JSDoc にある「全 N ボタン(M state keys)」の数を更新する

### 5. ツールバーボタンを追加する（任意）

すべて `packages/@burger-editor/custom-element/src/bge-wysiwyg-editor-element/index.ts` 内:

- [ ] `@tabler/icons/outline/<icon>.svg?raw` からアイコンをインポートする
- [ ] `BUTTON_TO_STATE_KEY_MAP` に `'kebab-case ボタン名': 'camelCaseStateKey'` を追加する
- [ ] テンプレートにボタンを追加する。起動は Invoker Commands で宣言済みの `toggleCommand` 変数を使う（`this.id` は未指定時に自動採番される）

  ```ts
  ${commands.includes('subscript') ? `<button type="button" ${toggleCommand} data-bge-toolbar-button="subscript">${IconSubscript}</button>` : ''}
  ```

- [ ] `bindToggle()` の `switch` に `case '<ボタン名>'` を追加し、手順 3 のメソッドを呼ぶ
- [ ] 既定で表示する場合のみ `static defaultCommands` に追加する
- `updateButtonState()` はマップ経由で状態を反映するため編集不要
- `bindToggle()` に `case 'h1'` が無いのは既知の不具合（別 issue）。ここでは直さない

### 6. テストを追加する

- `packages/@burger-editor/custom-element/src/bge-wysiwyg-element/index.spec.ts`: `expectHTML` で要素・属性が保持されること、不正な属性値が除去されること、HTML ⇔ Wysiwyg 切替ができること（構造変更として検出されないこと）
- ボタンを足した場合は `packages/@burger-editor/custom-element/src/bge-wysiwyg-editor-element/index.button-state.spec.ts` にボタンの存在・状態・kebab→camel マッピングのテストを追加し、ボタン総数を数えているテスト名・アサーションを更新する

テスト例は [references/custom-extension.md](references/custom-extension.md#テスト例)。

### 7. CSS とドキュメントを更新する

- 見た目に影響する属性は `packages/@burger-editor/blocks/src/general.css`（特定アイテム専用なら各アイテムの `style.css`）にスタイルを追加する。`@burger-editor/css` はビルド時に blocks の CSS を統合するので追加作業は不要
- `packages/@burger-editor/custom-element/docs/API.md` の `commands` 属性「使用可能なコマンド」にボタン名を追加する

## 検証ループ

リポジトリルートで 1 コマンドずつ実行し、失敗したら修正して再実行する。

1. `yarn lint`
2. `yarn build` — git worktree 内では `NX_WORKSPACE_ROOT_PATH=<worktree の絶対パス> yarn build`（付けないと成果物がメインチェックアウト側に出力される）
3. `yarn test --project custom-element`
4. ツールバーの見た目が変わる場合: `yarn test:vr:docker`。意図した変更なら `yarn test:vr:docker:update` でベースラインを更新する

動かないときは [references/pitfalls.md](references/pitfalls.md) を読む。

## 参照実装

subscript / superscript（公式拡張）と段落整列（カスタム拡張）が全手順を通った実例。

- `packages/@burger-editor/custom-element/src/tiptap-extentions/paragraph-with-align.ts` — `ParagraphWithAlign`
- `packages/@burger-editor/custom-element/src/tiptap-extentions/index.ts` — `BgeWysiwygEditorKit`
- `packages/@burger-editor/custom-element/src/bge-wysiwyg-element/types.ts` — `EditorNode`
- `packages/@burger-editor/custom-element/src/bge-wysiwyg-element/index.ts` — `toggleSubscript()` / `toggleAlign()`
- `packages/@burger-editor/custom-element/src/utils/get-current-editor-state.ts` — `getCurrentEditorState`
- `packages/@burger-editor/custom-element/src/bge-wysiwyg-editor-element/index.ts` — `BUTTON_TO_STATE_KEY_MAP` / テンプレート / `bindToggle()` / `defaultCommands`
- `packages/@burger-editor/custom-element/src/bge-wysiwyg-element/index.spec.ts` / `packages/@burger-editor/custom-element/src/bge-wysiwyg-editor-element/index.button-state.spec.ts` — テスト
