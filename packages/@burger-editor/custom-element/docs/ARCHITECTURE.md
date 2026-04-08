# Internal Architecture

`<bge-wysiwyg-editor>`の内部構造と設計思想について説明します。

## コンポーネント構造

`<bge-wysiwyg-editor>`は以下の親子構造を持ちます：

```
<bge-wysiwyg-editor>
  ├─ マークアップボタン（太字、斜体など）
  ├─ モード切り替えUI（セレクトボックスまたはHTMLモードボタン）
  └─ <bge-wysiwyg>（子要素：実際のエディタ）
```

### 親要素: `<bge-wysiwyg-editor>`

**役割**: UIの監視者

- ツールバーボタンを配置
- モード切り替えUIを配置
- 子要素（`<bge-wysiwyg>`）のイベントを監視してUIを更新

**責務**:

- ユーザー操作（ボタンクリック、モード切り替え）の受付
- 子要素のイベントに基づくUI状態の同期

### 子要素: `<bge-wysiwyg>`

**役割**: 状態の所有者

- `mode`: 現在のエディタモード（`'wysiwyg'` | `'html'` | `'text-only'`）
- `hasStructureChange`: 構造変更の有無
- エディタの状態（TipTap Editor State）

**責務**:

- エディタの状態管理
- イベントの発火（状態変更時）
- モード切り替えのロジック

## 設計思想

### 1. 状態の一元管理

**子要素が状態の所有者**

すべてのエディタの状態は`<bge-wysiwyg>`が管理します。親要素は状態を持たず、子要素の状態を読み取るだけです。

```typescript
// ✅ 正しい: 子要素から状態を読み取る
const currentMode = wysiwygElement.mode;
const hasStructureChange = wysiwygElement.hasStructureChange;

// ❌ 間違い: 親要素で状態を複製
this.currentMode = 'wysiwyg'; // 子要素との不整合が発生しやすい
```

### 2. イベント駆動

**親要素がUIの監視者**

親要素は子要素のイベントを監視してUIを更新します。子要素の状態変更は必ずイベントで通知されます。

```typescript
// 子要素: 状態が変わったらイベントを発火
this.dispatchEvent(
	new CustomEvent('bge:structure-change', {
		detail: { hasStructureChange: true },
		bubbles: true,
		composed: true,
	}),
);

// 親要素: イベントを受け取ってUIを更新
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	modeSelector.value = wysiwygElement.mode;
	wysiwygOption.disabled = event.detail.hasStructureChange;
});
```

### 3. 単方向データフロー

**子要素 → イベント → 親要素のUI更新**

データは常に子要素から親要素へ流れます。親要素が子要素の内部状態を直接変更することはありません。

```
子要素の状態変更
    ↓
イベント発火
    ↓
親要素がイベントを受信
    ↓
親要素がUIを更新
```

## UI要素とイベントのマッピング

各UI要素が監視すべきイベントと、その理由を示します。

| UI要素                                          | 監視すべきイベント                     | 理由                                                                                 |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| マークアップボタン                              | `transaction` + `bge:structure-change` | エディタ状態変更と、モード切り替え（HTMLモード時の無効化）の両方に反応する必要がある |
| セレクトボックス（値）                          | `bge:structure-change`                 | モード切り替え時に表示値を同期                                                       |
| セレクトボックス（wysiwygオプションのdisabled） | `bge:structure-change`                 | 構造変更時にデザインモード（`'wysiwyg'`）を無効化                                    |
| HTMLモードボタン（ariaPressed）                 | `bge:structure-change`                 | モード切り替え時に状態を同期                                                         |
| HTMLモードボタン（disabled）                    | `bge:structure-change`                 | HTMLモード（`'html'`）時に構造変更があれば無効化                                     |

### なぜマークアップボタンは2つのイベントを監視するのか？

マークアップボタンは以下の2つの理由で状態が変わります：

1. **エディタ状態の変更** (`transaction`イベント)
   - ユーザーがテキストを入力
   - ユーザーがフォーマットを変更
   - カーソル位置が変わる
   - → ボタンのアクティブ状態（aria-pressed）が変わる

2. **モード切り替え** (`bge:structure-change`イベント)
   - HTMLモード（`'html'`）に切り替わった
   - デザインモード（`'wysiwyg'`）に戻った
   - → ボタンの有効/無効（disabled）が変わる

そのため、両方のイベントを監視する必要があります。

```typescript
// transactionイベント: ボタンのアクティブ状態を更新
wysiwygElement.addEventListener('transaction', (event) => {
	updateButtonState(button, event.detail.state, this);
});

// structure-changeイベント: ボタンの有効/無効を更新
wysiwygElement.addEventListener('bge:structure-change', () => {
	const currentState = getCurrentEditorState(wysiwygElement);
	updateButtonState(button, currentState, this);
});
```

## 初期化パターン

親要素の`connectedCallback()`では、以下の順序で初期化します：

```typescript
connectedCallback() {
	// 1. 子要素の参照を取得
	const wysiwygElement = this.querySelector('bge-wysiwyg');

	// 2. イベントリスナーを登録
	wysiwygElement.addEventListener('transaction', (event) => {
		// ボタン状態を更新
	});

	wysiwygElement.addEventListener('bge:structure-change', (event) => {
		// モードUIを更新
	});

	// 3. 子要素の現在の状態を読み取ってUIを初期化（イベントリスナー登録後）
	const initialState = getCurrentEditorState(wysiwygElement);
	updateButtonState(button, initialState, this);
	modeSelector.value = wysiwygElement.mode;
	wysiwygOption.disabled = wysiwygElement.hasStructureChange;
}
```

### なぜイベントリスナー登録後に初期化するのか？

イベントリスナー登録**前**に初期化すると、以下の問題が発生する可能性があります：

1. 初期化時点の状態を読み取る
2. その後、子要素の初期化が完了してイベントが発火
3. しかしイベントリスナーがまだ登録されていないため、イベントを受け取れない
4. 結果として、初期化時点の状態とその後のイベント発火時の状態が不整合になる

イベントリスナーを**先に**登録することで、初期化時と実行時で一貫した状態管理ができます。

## データフローの例

### 例1: HTMLモードへの切り替え

```
1. ユーザーがHTMLモードボタンをクリック
   ↓
2. 親要素: wysiwygElement.mode = 'html' を実行
   ↓
3. 子要素: モードを変更し、bge:structure-change イベントを発火
   ↓
4. 親要素: イベントを受信
   ↓
5. 親要素: UIを更新
   - modeSelector.value = 'html'
   - マークアップボタンを無効化
   - HTMLモードボタンの ariaPressed = 'true'
```

### 例2: テキスト入力

```
1. ユーザーがテキストを入力
   ↓
2. 子要素（TipTap）: エディタ状態が変更される
   ↓
3. 子要素: transaction イベントを発火
   ↓
4. 親要素: イベントを受信
   ↓
5. 親要素: マークアップボタンの状態を更新
```

## 関連ドキュメント

- [Events](./EVENTS.md) - イベント仕様の詳細
- [Customization](./CUSTOMIZATION.md) - UI拡張時のパターン
