# @burger-editor/client

[![npm version](https://badge.fury.io/js/@burger-editor%2Fclient.svg)](https://badge.fury.io/js/@burger-editor%2Fclient)

BurgerEditorのクライアント側UIパッケージです。Svelteベースのコンポーネントを提供し、既存のCMSやWebアプリケーションにBurgerEditorを統合できます。

## インストール

```bash
npm install @burger-editor/client @burger-editor/core @burger-editor/blocks
```

または

```bash
yarn add @burger-editor/client @burger-editor/core @burger-editor/blocks
```

## 公開API

### `createBurgerEditorClient(options)`

BurgerEditorのクライアントインスタンスを作成します。この関数は、すべてのUI要素（ブロックカタログ、ブロックオプション、ファイルリストなど）を自動的にセットアップします。

#### 型定義

```typescript
function createBurgerEditorClient(
	options: Omit<BurgerEditorEngineOptions, 'ui' | 'blockMenu'>,
): Promise<{
	engine: BurgerEditorEngine;
}>;
```

#### パラメータ

`options` は `BurgerEditorEngineOptions` から `ui` と `blockMenu` を除いたオプションです。以下の主要なプロパティがあります：

**必須プロパティ:**

- `root` (string): エディタをマウントするルート要素のセレクタ
- `config` (Config): エディタの設定
  - `classList`: ブロックに適用するCSSクラスの配列
  - `stylesheets`: 読み込むスタイルシートのパス配列
  - `sampleImagePath`: サンプル画像のパス
  - `sampleFilePath`: サンプルファイルのパス
  - `googleMapsApiKey`: Google Maps APIキー (使用する場合)
  - `experimental`: 実験的な機能の設定 (オプション)
- `items` (Record<string, ItemSeed>): 使用するアイテムの定義
- `catalog` (BlockCatalog): ブロックカタログの定義
- `generalCSS` (string): 一般的なCSS文字列
- `initialContents` (string | { main: string; draft?: string }): 初期コンテンツのHTML

**オプショナルプロパティ:**

- `viewAreaClassList`: ビューエリアに適用するCSSクラスの配列
- `blocks`: カスタムブロック定義
- `storageKey`: ローカルストレージのキー設定
- `defineCustomElement`: カスタム要素の定義関数
- `onUpdated`: コンテンツ更新時のコールバック
- `fileIO`: ファイルIO APIの実装
- `healthCheck`: ヘルスチェックの設定

#### 戻り値

```typescript
Promise<{
	engine: BurgerEditorEngine;
}>;
```

- `engine`: BurgerEditorエンジンのインスタンス

## 使用例

以下は基本的な使用例です：

```typescript
import { createBurgerEditorClient } from '@burger-editor/client';
import { items, generalCSS, defaultCatalog } from '@burger-editor/blocks';
import { CSS_LAYER } from '@burger-editor/core';
import '@burger-editor/client/style';

async function initEditor() {
	// エディタをマウントする要素を取得
	const mainInput = document.getElementById('main') as HTMLInputElement;

	if (!mainInput) {
		console.error('Editable area not found');
		return;
	}

	// エディタを作成
	const { engine } = await createBurgerEditorClient({
		root: '.editor',
		config: {
			classList: [],
			stylesheets: [
				{
					path: '/path/to/your/styles.css',
					layer: CSS_LAYER.ui,
				},
				{
					path: generalCSS,
					layer: CSS_LAYER.base,
				},
			],
			sampleImagePath: '/images/sample.jpg',
			sampleFilePath: '/files/sample.pdf',
			googleMapsApiKey: null,
		},
		items,
		catalog: defaultCatalog,
		generalCSS,
		initialContents: mainInput.value,
		viewAreaClassList: ['my-editor'],
		onUpdated: async (main, draft) => {
			// コンテンツが更新されたときの処理
			mainInput.value = main;
			console.log('Content updated:', { main, draft });
		},
	});

	console.log('Editor initialized:', engine);
}

// 初期化実行
initEditor();
```

### カスタムブロックカタログの使用

```typescript
import { createBurgerEditorClient } from '@burger-editor/client';
import { items, generalCSS, defaultCatalog } from '@burger-editor/blocks';

const customCatalog = {
	...defaultCatalog,
	カスタムカテゴリ: [
		{
			label: 'カスタムブロック',
			definition: {
				name: 'custom-block',
				containerProps: {
					type: 'grid',
					columns: 2,
				},
				items: [['wysiwyg', 'image']],
			},
		},
	],
};

await createBurgerEditorClient({
	root: '.editor',
	config: {
		classList: [],
		stylesheets: [],
		sampleImagePath: '/images/sample.jpg',
		sampleFilePath: '/files/sample.pdf',
		googleMapsApiKey: null,
	},
	items,
	catalog: customCatalog,
	generalCSS,
	initialContents: '<div class="editable"></div>',
});
```

### ファイルIOの実装

```typescript
import { createBurgerEditorClient } from '@burger-editor/client';
import type { FileAPI } from '@burger-editor/core';

const fileIO: FileAPI = {
	async getFileList(fileType, options) {
		// ファイルリストを取得する実装
		const response = await fetch(`/api/files/${fileType}?page=${options.page}`);
		return response.json();
	},
	async postFile(fileType, file, progress) {
		// ファイルをアップロードする実装
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch(`/api/files/${fileType}`, {
			method: 'POST',
			body: formData,
		});

		return response.json();
	},
	async deleteFile(fileType, url) {
		// ファイルを削除する実装
		const response = await fetch(`/api/files/${fileType}`, {
			method: 'DELETE',
			body: JSON.stringify({ url }),
		});

		return response.json();
	},
};

await createBurgerEditorClient({
	root: '.editor',
	config: {
		classList: [],
		stylesheets: [],
		sampleImagePath: '/images/sample.jpg',
		sampleFilePath: '/files/sample.pdf',
		googleMapsApiKey: null,
	},
	items,
	catalog: defaultCatalog,
	generalCSS,
	initialContents: '<div class="editable"></div>',
	fileIO,
});
```

## ブロックのコピー&ペースト

BurgerEditorは、ブロック単位でのコピー&ペースト機能を提供します。

### 使用方法

1. **ブロックのコピー**
   - コピーしたいブロックを選択
   - ブロックメニューから「ブロックをコピー」をクリック
   - ブロックのデータがクリップボード（sessionStorage）に保存されます

2. **ブロックのペースト**
   - ブロック追加ダイアログを開く
   - クリップボードにデータがある場合、「クリップボードから貼り付け」ボタンが表示されます
   - ボタンをクリックすると、コピーしたブロックが挿入されます

### 仕様

- **保存形式**: JSON形式（BlockData）
- **保存先**: sessionStorage
- **有効期限**: ブラウザセッション内のみ（タブを閉じると消去）
- **保存キー**: `engine.storageKey.blockClipboard`（デフォルト: `'bge-copied-block'`）
- **動作**: ペースト後、クリップボードは自動的にクリアされます

### ストレージキーのカスタマイズ

```typescript
await createBurgerEditorClient({
	root: '.editor',
	config: {
		classList: [],
		stylesheets: [],
		sampleImagePath: '/images/sample.jpg',
		sampleFilePath: '/files/sample.pdf',
		googleMapsApiKey: null,
	},
	items,
	catalog: defaultCatalog,
	generalCSS,
	initialContents: '<div></div>',
	storageKey: {
		blockClipboard: 'my-custom-clipboard-key', // カスタムキー
	},
});
```

## 詳細なAPI仕様

ブロックの構造やアイテムの作成方法など、より詳細な技術仕様については [@burger-editor/core のREADME](../core/README.md) を参照してください。

## カスタマイズのヒント

- **カスタムアイテムの作成**: [@burger-editor/core のREADME](../core/README.md#カスタムアイテムの作成) を参照
- **カスタムブロックカタログ**: [@burger-editor/core のREADME](../core/README.md#カスタムブロックカタログの作成) を参照
- **スタイルのカスタマイズ**: `config.stylesheets` でCSSを指定し、`config.classList` でクラスを追加
- **実験的機能の利用**: `config.experimental` でボタンアイテムのオプションなどをカスタマイズ可能

## ライセンス

Dual Licensed under MIT OR Apache-2.0
