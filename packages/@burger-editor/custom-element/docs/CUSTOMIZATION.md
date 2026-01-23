# UI Customization Guide

`<bge-wysiwyg-editor>`のUIを拡張・カスタマイズする際のガイドです。

## よくある間違いと解決策

UI拡張時によく発生する問題とその解決策を説明します。

### ❌ 間違い1: イベントの監視不足

#### 症状

ダイアログ表示時やモード切り替え時にUIが正しく更新されない

#### 原因

UI要素が必要なイベントを監視していない

#### 例

マークアップボタンが`transaction`イベントのみを監視し、HTMLモード切り替え時に無効化されない

```typescript
// ❌ 間違い：transactionイベントしか監視していない
wysiwygElement.addEventListener('transaction', (event) => {
	updateButtonState(button, event.detail.state, this);
});
// → HTMLモードに切り替わってもボタンが有効のまま
```

#### 解決策

[Architecture](./ARCHITECTURE.md#ui要素とイベントのマッピング)の「UI要素とイベントのマッピング」表を参照し、必要なイベントを全て監視する

```typescript
// ✅ 正解：両方のイベントを監視
wysiwygElement.addEventListener('transaction', (event) => {
	updateButtonState(button, event.detail.state, this);
});
wysiwygElement.addEventListener('bge:structure-change', () => {
	const currentState = getCurrentEditorState(wysiwygElement);
	updateButtonState(button, currentState, this);
});
```

### ❌ 間違い2: 初期化のタイミングミス

#### 症状

ダイアログ表示直後だけUIの初期状態が間違っている（その後のイベントでは正しく更新される）

#### 原因

イベントリスナー登録**前**に子要素の状態を読み取っている

#### 例

```typescript
// ❌ 間違い：イベントリスナー登録前に初期化
const initialMode = wysiwygElement.mode;
modeSelector.value = initialMode;

wysiwygElement.addEventListener('bge:structure-change', (event) => {
	modeSelector.value = wysiwygElement.mode;
});
// → 初期化時点の状態と、その後のイベント発火時の状態が不整合になる可能性
```

#### 解決策

イベントリスナー登録**後**に初期化する

```typescript
// ✅ 正解：イベントリスナー登録後に初期化
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	modeSelector.value = wysiwygElement.mode;
});

// イベントリスナー登録後に初期状態を設定
modeSelector.value = wysiwygElement.mode;
```

詳細は[Architecture](./ARCHITECTURE.md#初期化パターン)の「初期化パターン」を参照してください。

### ❌ 間違い3: イベントで一部のプロパティしか更新しない

#### 症状

モード切り替え時に、一部のUIだけが更新されない

#### 原因

イベントハンドラーで関連する全てのプロパティを更新していない

#### 例

セレクトボックスのオプションの`disabled`だけ更新し、セレクトボックスの`value`を更新していない

```typescript
// ❌ 間違い：wysiwygOptionのdisabledしか更新していない
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	wysiwygOption.disabled = event.detail.hasStructureChange;
	// modeSelector.valueを更新していない！
});
// → HTMLモードに切り替わってもセレクトボックスの表示が「デザインモード」のまま
```

#### 解決策

関連する全てのプロパティを更新する

```typescript
// ✅ 正解：関連する全てのプロパティを更新
wysiwygElement.addEventListener('bge:structure-change', (event) => {
	wysiwygOption.disabled = event.detail.hasStructureChange;
	modeSelector.value = wysiwygElement.mode; // 表示値も同期
});
```

## デバッグのヒント

問題が発生した場合は、以下を確認してください：

### 1. イベントは発火しているか？

```typescript
wysiwygElement.addEventListener('transaction', (e) =>
	console.log('transaction', e.detail),
);
wysiwygElement.addEventListener('bge:structure-change', (e) =>
	console.log('structure-change', e.detail),
);
```

### 2. 子要素の状態は正しいか？

```typescript
console.log('mode:', wysiwygElement.mode);
console.log('hasStructureChange:', wysiwygElement.hasStructureChange);
```

### 3. イベントリスナーは登録されているか？初期化の順序は正しいか？

- イベントリスナー登録前に初期化していないか確認
- `connectedCallback()`の処理順序を確認

## カスタムUIの追加例

### 例1: カスタムツールバーボタンの追加

```typescript
class CustomWysiwygEditor extends BgeWysiwygEditorElement {
	connectedCallback() {
		super.connectedCallback();

		// 子要素の参照を取得
		const wysiwygElement = this.querySelector('bge-wysiwyg');

		// カスタムボタンを作成
		const customButton = document.createElement('button');
		customButton.textContent = 'Custom';

		// イベントリスナーを登録（初期化前）
		wysiwygElement.addEventListener('transaction', (event) => {
			// ボタンの状態を更新
			updateCustomButtonState(customButton, event.detail.state);
		});

		wysiwygElement.addEventListener('bge:structure-change', () => {
			// モード変更時の処理
			const isNonWysiwygMode = wysiwygElement.mode !== 'wysiwyg';
			customButton.disabled = isNonWysiwygMode;
		});

		// 初期状態を設定（イベントリスナー登録後）
		const initialState = getCurrentEditorState(wysiwygElement);
		updateCustomButtonState(customButton, initialState);
		customButton.disabled = wysiwygElement.mode !== 'wysiwyg';

		// ツールバーに追加
		const toolbar = this.querySelector('[data-bge-toolbar]');
		toolbar.appendChild(customButton);
	}
}
```

### 例2: カスタムモードインジケーターの追加

```typescript
class CustomWysiwygEditor extends BgeWysiwygEditorElement {
	connectedCallback() {
		super.connectedCallback();

		const wysiwygElement = this.querySelector('bge-wysiwyg');

		// インジケーターを作成
		const indicator = document.createElement('div');
		indicator.className = 'mode-indicator';

		// イベントリスナーを登録
		wysiwygElement.addEventListener('bge:structure-change', () => {
			indicator.textContent = `Current mode: ${wysiwygElement.mode}`;
			indicator.dataset.hasStructureChange = wysiwygElement.hasStructureChange.toString();
		});

		// 初期状態を設定
		indicator.textContent = `Current mode: ${wysiwygElement.mode}`;
		indicator.dataset.hasStructureChange = wysiwygElement.hasStructureChange.toString();

		// DOMに追加
		this.appendChild(indicator);
	}
}
```

## ベストプラクティス

### 1. 状態は子要素から読み取る

親要素で状態を複製せず、常に子要素から読み取ります。

```typescript
// ✅ 正しい
const currentMode = wysiwygElement.mode;

// ❌ 間違い
this.currentMode = 'wysiwyg'; // 子要素との不整合が発生
```

### 2. イベント駆動で実装する

ポーリングやタイマーではなく、イベントベースで実装します。

```typescript
// ✅ 正しい
wysiwygElement.addEventListener('bge:structure-change', () => {
	updateUI();
});

// ❌ 間違い
setInterval(() => {
	const mode = wysiwygElement.mode;
	updateUI();
}, 100);
```

### 3. 必要な全てのイベントを監視する

[Architecture](./ARCHITECTURE.md#ui要素とイベントのマッピング)の「UI要素とイベントのマッピング」表を参照して、必要なイベントを漏らさず監視します。

### 4. イベントリスナー登録後に初期化する

[Architecture](./ARCHITECTURE.md#初期化パターン)の「初期化パターン」に従って、正しい順序で初期化します。

## 関連ドキュメント

- [Events](./EVENTS.md) - カスタムイベント仕様
- [Architecture](./ARCHITECTURE.md) - 内部アーキテクチャと設計思想
- [API](./API.md) - API仕様
