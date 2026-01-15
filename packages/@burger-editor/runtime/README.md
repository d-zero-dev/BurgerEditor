# @burger-editor/runtime

BurgerEditorで生成されたコンテンツをブラウザで動作させるためのランタイムライブラリです。

このパッケージは、BurgerEditorで生成されたHTMLコンテンツにインタラクティブ機能を提供するクライアントサイドJavaScriptライブラリです。

## 機能

- **画像モーダル**: Invoker Commands APIを使用した画像のモーダル表示

## インストール

```bash
npm install @burger-editor/runtime
```

## 使い方

### クイックスタート

最も簡単な使い方は`autoInit`関数を使用することです：

```typescript
import { autoInit } from '@burger-editor/runtime';

// DOM読み込み完了時に自動初期化
autoInit();
```

### 手動初期化

より細かく制御したい場合は、`initBurgerEditorRuntime`関数を使用します：

```typescript
import { initBurgerEditorRuntime } from '@burger-editor/runtime';

// すべての機能を初期化
initBurgerEditorRuntime({
	imageModal: true,
});

// 機能を無効化
initBurgerEditorRuntime({
	imageModal: false,
});
```

### 個別機能の初期化

機能を個別に初期化することもできます：

```typescript
import { initImageModal } from '@burger-editor/runtime';

// 画像モーダル機能のみ初期化
initImageModal({
	closeButtonLabel: '閉じる',
	closedby: 'any', // 'any' | 'closerequest' | 'none'
});
```

## API リファレンス

### `autoInit(config?)`

DOM読み込み完了時に自動的にランタイムを初期化します。

**パラメータ:**

- `config` (オプション): 設定オブジェクト

**例:**

```typescript
import { autoInit } from '@burger-editor/runtime';

autoInit({
	imageModal: {
		closeButtonLabel: '閉じる',
	},
});
```

### `initBurgerEditorRuntime(config?)`

ランタイム機能を手動で初期化します。

**パラメータ:**

- `config` (オプション): 設定オブジェクト
  - `imageModal`: 画像モーダル機能の有効化/設定 (`boolean | ImageModalConfig`)

**例:**

```typescript
import { initBurgerEditorRuntime } from '@burger-editor/runtime';

// デフォルト設定で初期化
initBurgerEditorRuntime();

// カスタム設定で初期化
initBurgerEditorRuntime({
	imageModal: {
		closeButtonLabel: '閉じる',
		closedby: 'closerequest',
	},
});
```

### `initImageModal(config?)`

画像モーダル機能を初期化します。

**パラメータ:**

- `config` (オプション): 画像モーダルの設定
  - `selector`: ターゲットコンテナのセレクタ (デフォルト: `'[data-bge]'`)
  - `closeButtonLabel`: 閉じるボタンのラベル (デフォルト: `'閉じる'`)
  - `closedby`: ダイアログの閉じ方の制御 (デフォルト: `'any'`)
    - `'any'`: ESCキーまたはバックドロップクリックで閉じる
    - `'closerequest'`: ESCキーのみで閉じる
    - `'none'`: プログラムからのみ閉じる

**例:**

```typescript
import { initImageModal } from '@burger-editor/runtime';

initImageModal({
	closeButtonLabel: '閉じる',
	closedby: 'any',
});
```

## ブラウザサポート

- Invoker Commands API: Chrome 135+, Edge 135+, Safari Technology Preview

## ライセンス

MIT
