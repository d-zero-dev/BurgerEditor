# Custom Events

`<bge-wysiwyg-editor>`の内部にある`<bge-wysiwyg>`要素は、以下のカスタムイベントを発火します。

## `transaction`イベント

エディタの状態が変更されるたびに発火します。

### 発火タイミング

- テキスト入力時
- フォーマット変更時（太字、斜体など）
- コンテンツの追加・削除時
- その他のエディタ状態変更時

### 用途

- マークアップボタン（太字、斜体など）の状態を更新
- エディタの現在の状態を取得

### イベント詳細

- `event.detail.state`: TipTapのエディタ状態が含まれる

### 使用例

```typescript
const wysiwygElement = editor.querySelector('bge-wysiwyg');
wysiwygElement.addEventListener('transaction', (event) => {
	console.log('Editor state changed:', event.detail.state);
	// マークアップボタンの状態を更新する処理
});
```

## `bge:structure-change`イベント

構造変更やモード切り替えが発生したときに発火します。

### 発火タイミング

- HTMLモード（`'html'`）に切り替わった時
- HTMLモードからデザインモード（`'wysiwyg'`）への切り替えが構造変更により防止された時
- 構造変更状態が変化した時（`hasStructureChange`の値が変わった時）

### 用途

- マークアップボタンの無効化（HTMLモード時）
- モード切り替えUIの同期（セレクトボックスやHTMLモードボタン）
- デザインモード（`'wysiwyg'`）オプションの有効/無効化

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

## イベント監視のベストプラクティス

### 複数のイベントを監視する

多くのUI要素は複数のイベントを監視する必要があります。

```typescript
const wysiwygElement = editor.querySelector('bge-wysiwyg');

// transactionイベント: エディタ状態の変更を監視
wysiwygElement.addEventListener('transaction', (event) => {
	updateButtonState(button, event.detail.state, this);
});

// structure-changeイベント: モード切り替えを監視
wysiwygElement.addEventListener('bge:structure-change', () => {
	const currentState = getCurrentEditorState(wysiwygElement);
	updateButtonState(button, currentState, this);
});
```

### イベントリスナー登録のタイミング

イベントリスナーは、UI要素の初期化**前**に登録してください。

```typescript
// ✅ 正しい順序
// 1. イベントリスナーを登録
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	modeSelector.value = wysiwygElement.mode;
});

// 2. 初期状態を設定（イベントリスナー登録後）
modeSelector.value = wysiwygElement.mode;
```

```typescript
// ❌ 間違った順序
// 1. 初期状態を設定（イベントリスナー登録前）
modeSelector.value = wysiwygElement.mode;

// 2. イベントリスナーを登録
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	modeSelector.value = wysiwygElement.mode;
});
// → 初期化時点とイベント発火時の状態が不整合になる可能性
```

## 関連ドキュメント

- [Architecture](./ARCHITECTURE.md) - イベント駆動設計の詳細
- [Customization](./CUSTOMIZATION.md) - UI拡張時のイベント監視パターン
