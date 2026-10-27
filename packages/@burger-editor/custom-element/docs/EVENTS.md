# Custom Events

`<bge-wysiwyg-editor>`の内部にある`<bge-wysiwyg>`要素は、以下のカスタムイベントを発火します。どちらも`bubbles: true`/`composed: true`のため、`<bge-wysiwyg-editor>`やその祖先でも受け取れます。

## `transaction`イベント

TipTapのトランザクションごとに発火します。

### 発火タイミング

- テキスト入力時
- フォーマット変更時（太字、斜体など）
- カーソル位置・選択範囲の変更時
- コンテンツの追加・削除・置き換え時（HTMLモードからデザインモードへ戻ったときの内容反映を含む）

### 用途

- マークアップボタン（太字、斜体など）の押下状態・有効/無効を更新

### イベント詳細

- `event.detail.state`: ツールバー向けの状態。ノード/マークごとの`{ active: boolean; disabled: boolean }`を持つオブジェクト（`Record<EditorNode, NodeState>`）です。TipTap/ProseMirrorの`EditorState`ではありません

キーは`bold`/`italic`/`underline`/`strike`/`subscript`/`superscript`/`code`/`link`/`buttonLikeLink`/`blockquote`/`bulletList`/`orderedList`/`note`/`h1`〜`h6`/`flexBox`/`image`/`alignStart`/`alignCenter`/`alignEnd`です。これ以外の拡張の状態は`wysiwygElement.isActive(name)`で取得します。

### 使用例

```typescript
const wysiwygElement = editor.querySelector('bge-wysiwyg');
wysiwygElement.addEventListener('transaction', (event) => {
	const { active, disabled } = event.detail.state.bold;
	boldButton.ariaPressed = String(active);
	boldButton.disabled = disabled;
});
```

## `bge:structure-change`イベント

`hasStructureChange`（HTMLモードの内容にデザインモードで表示できない構造が含まれるか）の値が変化したときに発火します。値が変わらなければ、モードを切り替えても発火しません。

### 発火タイミング

- 初期値にデザインモードで表示できない構造があり、HTMLモードで開いた時（`false` → `true`）
- 内容が空のデザインモードのエディタに、デザインモードで表示できない構造を`value`（または親の`innerHTML`）で代入し、HTMLモードへ切り替わった時（`false` → `true`）。接続後でも起きる
- HTMLモードで入力・フォーカスアウトした結果、構造変更の有無が変わった時
- HTMLモードからデザインモード（`'wysiwyg'`）への切り替えが構造変更により拒否された時（それまで`false`だった場合）
- HTMLモードへ切り替えた時点で構造変更の有無が変わった時
- デザインモードへ戻り、構造変更状態が解除された時（`true` → `false`）

HTMLモード中に`value`へ代入しても構造変更の有無は再計算されず、発火しません（再計算は入力・フォーカスアウト・モード切り替えのとき）。

### 用途

- デザインモード（`'wysiwyg'`）への切り替えUIの有効/無効化
- HTMLモード中の構造変更状態の変化に合わせたマークアップボタン・モード切り替えUIの同期

モードの変化そのものを検知する用途には使えません。組み込みUIは、モード切り替えUIの操作（HTMLモードボタンの`command`、セレクトボックスの`change`）の直後に`mode`を読み直して同期しています（[Customization](./CUSTOMIZATION.md#ui要素とイベントのマッピング)）。

### イベント詳細

- `event.detail.hasStructureChange`: 構造変更の有無（boolean）

### 使用例

```typescript
const wysiwygElement = editor.querySelector('bge-wysiwyg');
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	console.log('Structure change:', event.detail.hasStructureChange);
	console.log('Current mode:', wysiwygElement.mode);
	// モード切り替えUIやボタン状態を更新する処理
});
```

## イベント監視のパターン

どのUI要素がどのイベントを監視すべきか、リスナーの登録順序と解除方法は[Customization](./CUSTOMIZATION.md)を参照してください。

- [UI要素とイベントのマッピング](./CUSTOMIZATION.md#ui要素とイベントのマッピング)
- [初期化パターン](./CUSTOMIZATION.md#初期化パターン)

## 関連ドキュメント

- [Customization](./CUSTOMIZATION.md) - UI拡張時のイベント監視パターン
- [API](./API.md) - API仕様
