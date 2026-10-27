# UI Customization Guide

`<bge-wysiwyg-editor>`のUIを拡張・カスタマイズする際のガイドです。

## 前提: 状態は子要素`<bge-wysiwyg>`が持つ

`<bge-wysiwyg-editor>`はツールバーとモード切り替えUIを持つ親要素で、編集本体は内部の子要素`<bge-wysiwyg>`です。

```
<bge-wysiwyg-editor>
  ├─ マークアップボタン（太字、斜体など）
  ├─ モード切り替えUI（HTMLモードボタン、または experimental.textOnlyMode 時のセレクトボックス）
  └─ <bge-wysiwyg>（編集本体）
```

`mode`・`hasStructureChange`・エディタの状態はすべて`<bge-wysiwyg>`が持ちます。UIを追加するときは状態を自前で持たず、子要素から読み取り、子要素が発火するイベント（[Events](./EVENTS.md)）で更新します。

```typescript
const wysiwygElement = editorElement.querySelector('bge-wysiwyg');
wysiwygElement.mode; // 'wysiwyg' | 'html' | 'text-only'
wysiwygElement.hasStructureChange; // boolean
wysiwygElement.isActive('bold'); // boolean
```

## UI要素とイベントのマッピング

組み込みUIの各要素が、どのタイミングで状態を同期しているかを示します。同種のUIを追加するときは同じタイミングで更新します。

| UI要素                                            | 更新のきっかけ                         | 理由                                                                                                         |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| マークアップボタン（`aria-pressed`/`disabled`）   | `transaction` + `bge:structure-change` | 選択範囲・書式の変化と、HTMLモード中の構造変更状態の変化の両方に反応する必要がある                           |
| マークアップボタン（`disabled`）                  | モード切り替えUIの操作直後             | `bge:structure-change`はモード切り替えのたびには発火しないため、切り替え成功時に直接更新                     |
| セレクトボックス（値）                            | `bge:structure-change` + `change`      | モード切り替えが拒否されたときに表示値を実際の`mode`へ戻す                                                   |
| セレクトボックス（wysiwygオプションの`disabled`） | `bge:structure-change`                 | 構造変更があるときデザインモード（`'wysiwyg'`）を選べなくする                                                |
| HTMLモードボタン（`aria-pressed`）                | `bge:structure-change` + `command`     | ボタン操作に加え、子が自分でHTMLモードへ切り替えたとき（空の状態に表示できない構造を代入）にも押下状態を同期 |
| HTMLモードボタン（`disabled`）                    | `bge:structure-change` + `command`     | HTMLモード（`'html'`）で構造変更があるとデザインモードに戻れないため無効化                                   |

### なぜマークアップボタンは複数のきっかけで更新するのか？

マークアップボタンの状態は次の2つで変わります。

1. **エディタ状態の変更**（`transaction`イベント）
   - テキスト入力、書式の変更、カーソル移動
   - → ボタンのアクティブ状態（`aria-pressed`）が変わる
2. **モードの変更**
   - HTMLモード（`'html'`）・テキスト編集モード（`'text-only'`）ではボタンを無効化し、デザインモード（`'wysiwyg'`）で有効に戻す
   - → ボタンの有効/無効（`disabled`）が変わる

`bge:structure-change`は`hasStructureChange`の値が変わったときだけ発火し、モード切り替えそのものでは発火しません。そのため、モードの変化はモード切り替えUIのイベント（HTMLモードボタンの`command`、セレクトボックスの`change`）の後に`wysiwygElement.mode`を読み直して反映します。サブクラスで`super.connectedCallback()`の後に登録したリスナーは組み込みのハンドラーより後に実行されるため、その時点の`mode`は切り替え後の値です。

## 初期化パターン

サブクラスでUIを追加するときは、次の順序で初期化します。

1. 子要素`<bge-wysiwyg>`の参照を取得する
2. イベントリスナーを`AbortController`の`signal`付きで登録する
3. 子要素の現在の状態を読み取ってUIを初期化する（リスナー登録後）
4. 要素がDOMから外れたら`abort()`でリスナーをまとめて解除する

組み込みの`<bge-wysiwyg-editor>`も同じ方法でリスナーを管理しています。切断の判定は`queueMicrotask`で1タスク遅らせ、同一タスク内の再接続（DOM移動）では解除・再登録しません。

```typescript
class CustomWysiwygEditor extends BgeWysiwygEditorElement {
	#abortController: AbortController | null = null;

	connectedCallback() {
		super.connectedCallback();

		// DOM移動による再接続では組み込み側も再初期化しないので、こちらも何もしない
		if (this.#abortController && !this.#abortController.signal.aborted) {
			return;
		}
		const abortController = new AbortController();
		this.#abortController = abortController;
		const { signal } = abortController;

		// 1. 子要素の参照を取得
		const wysiwygElement = this.querySelector('bge-wysiwyg');

		// 2. イベントリスナーを登録
		wysiwygElement.addEventListener(
			'transaction',
			(event) => {
				// event.detail.state でボタン状態を更新
			},
			{ signal },
		);
		wysiwygElement.addEventListener(
			'bge:structure-change',
			(event) => {
				// wysiwygElement.mode / event.detail.hasStructureChange でUIを更新
			},
			{ signal },
		);

		// 3. 子要素の現在の状態を読み取ってUIを初期化（イベントリスナー登録後）
		syncUI(wysiwygElement);
	}

	disconnectedCallback() {
		super.disconnectedCallback();

		// 4. 本当に切断されたときだけリスナーを解除
		const abortController = this.#abortController;
		queueMicrotask(() => {
			if (!this.isConnected) {
				abortController?.abort();
			}
		});
	}
}
```

### なぜイベントリスナー登録後に初期化するのか？

`<bge-wysiwyg>`は初期化の過程で自分の状態を変えることがあります（初期値にデザインモードで表示できない構造があるとHTMLモードで開き、`bge:structure-change`を発火する等）。リスナー登録**前**に状態を読み取ると、読み取りから登録までの間に起きた変化を取りこぼし、UIが古い状態のまま残ります。リスナーを**先に**登録してから現在値を読めば、どちらの順で状態が変わっても最終的に一致します。

## よくある間違いと解決策

UI拡張時によく発生する問題とその解決策を説明します。

### ❌ 間違い1: イベントの監視不足

#### 症状

ダイアログ表示時やモード切り替え時にUIが正しく更新されない

#### 原因

UI要素が必要なイベントを監視していない

#### 例

マークアップボタンが`transaction`イベントのみを監視し、HTMLモードで無効化されない

```typescript
// ❌ 間違い：transactionイベントしか監視していない
wysiwygElement.addEventListener('transaction', (event) => {
	button.ariaPressed = String(event.detail.state.bold.active);
});
// → HTMLモードに切り替わってもボタンが有効のまま
```

#### 解決策

[UI要素とイベントのマッピング](#ui要素とイベントのマッピング)を参照し、必要なきっかけを全て監視する

```typescript
// ✅ 正解：エディタ状態とモードの両方の変化で更新
const sync = () => {
	button.ariaPressed = String(wysiwygElement.isActive('bold'));
	button.disabled = wysiwygElement.mode !== 'wysiwyg';
};
wysiwygElement.addEventListener('transaction', sync, { signal });
wysiwygElement.addEventListener('bge:structure-change', sync, { signal });
// モード切り替えUIの操作後（組み込みハンドラーの後に実行される）。
// HTMLモードボタンは command、textOnlyMode のセレクトボックスは change
this.addEventListener('command', sync, { signal });
this.addEventListener('change', sync, { signal });
```

### ❌ 間違い2: 初期化のタイミングミス

#### 症状

ダイアログ表示直後だけUIの初期状態が間違っている（その後のイベントでは正しく更新される）

#### 原因

イベントリスナー登録**前**に子要素の状態を読み取っている

#### 例

```typescript
// ❌ 間違い：イベントリスナー登録前に初期化
modeIndicator.textContent = wysiwygElement.mode;

wysiwygElement.addEventListener('bge:structure-change', () => {
	modeIndicator.textContent = wysiwygElement.mode;
});
// → 読み取りから登録までの間の変化を取りこぼす可能性
```

#### 解決策

イベントリスナー登録**後**に初期化する。詳細は[初期化パターン](#初期化パターン)を参照してください。

```typescript
// ✅ 正解：イベントリスナー登録後に初期化
wysiwygElement.addEventListener(
	'bge:structure-change',
	() => {
		modeIndicator.textContent = wysiwygElement.mode;
	},
	{ signal },
);

modeIndicator.textContent = wysiwygElement.mode;
```

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
// → デザインモードへの切り替えが拒否されても、セレクトボックスの表示が「デザインモード」のまま
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

`bge:structure-change`は`hasStructureChange`の値が変わったときだけ発火します。モードを切り替えても発火しないのは正常です。

### 2. 子要素の状態は正しいか？

```typescript
console.log('mode:', wysiwygElement.mode);
console.log('hasStructureChange:', wysiwygElement.hasStructureChange);
```

### 3. イベントリスナーは登録されているか？初期化の順序は正しいか？

- イベントリスナー登録前に初期化していないか確認
- `connectedCallback()`の処理順序を確認
- `signal`が既に`abort()`された`AbortController`のものになっていないか確認

## カスタムUIの追加例

以下の例は[初期化パターン](#初期化パターン)の`connectedCallback()`内（`signal`取得後）に書く想定です。

### 例1: カスタムツールバーボタンの追加

サブクラスで独自ボタンを足す利用者向けの例。本パッケージに組み込みの TipTap 拡張・ツールバーボタンを追加するコントリビュータは[`.claude/skills/tiptap-extension/SKILL.md`](../../../../.claude/skills/tiptap-extension/SKILL.md)を参照する。

```typescript
// 子要素の参照を取得
const wysiwygElement = this.querySelector('bge-wysiwyg');

// カスタムボタンを作成。起動はInvoker Commands（command/commandfor）で
// 宣言する — clickハンドラは規約で禁止されており、command属性が
// 無いとボタンは何も実行しない
const customButton = document.createElement('button');
customButton.type = 'button';
customButton.textContent = 'Custom';
customButton.setAttribute('command', '--custom-action');
customButton.setAttribute('commandfor', this.id);

const syncCustomButton = () => {
	customButton.ariaPressed = String(wysiwygElement.isActive('myMark'));
	customButton.disabled = wysiwygElement.mode !== 'wysiwyg';
};

// イベントリスナーを登録（初期化前）
this.addEventListener(
	'command',
	(event) => {
		if (event.command === '--custom-action') {
			// カスタムアクションを実行
		}
		// 組み込みのモード切り替え（--wysiwyg-html-mode）の後にも状態を同期
		syncCustomButton();
	},
	{ signal },
);
wysiwygElement.addEventListener('transaction', syncCustomButton, { signal });
wysiwygElement.addEventListener('bge:structure-change', syncCustomButton, { signal });
// textOnlyMode のセレクトボックスによるモード切り替えの後にも同期
this.addEventListener('change', syncCustomButton, { signal });

// 初期状態を設定（イベントリスナー登録後）
syncCustomButton();

// ツールバーに追加
this.querySelector('[data-bge-toolbar-group]').append(customButton);
```

### 例2: カスタムモードインジケーターの追加

```typescript
const wysiwygElement = this.querySelector('bge-wysiwyg');

// インジケーターを作成
const indicator = document.createElement('div');
indicator.className = 'mode-indicator';

const syncIndicator = () => {
	indicator.textContent = `Current mode: ${wysiwygElement.mode}`;
	indicator.dataset.hasStructureChange = String(wysiwygElement.hasStructureChange);
};

// イベントリスナーを登録
wysiwygElement.addEventListener('bge:structure-change', syncIndicator, { signal });
this.addEventListener('command', syncIndicator, { signal });
this.addEventListener('change', syncIndicator, { signal });

// 初期状態を設定
syncIndicator();

// DOMに追加
this.append(indicator);
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

[UI要素とイベントのマッピング](#ui要素とイベントのマッピング)を参照して、必要なきっかけを漏らさず監視します。

### 4. イベントリスナー登録後に初期化し、切断時に解除する

[初期化パターン](#初期化パターン)に従って、正しい順序で初期化し、`AbortController`でリスナーを解除します。

## 関連ドキュメント

- [Events](./EVENTS.md) - カスタムイベント仕様
- [API](./API.md) - API仕様
