# カスタムブロックカタログの作成

## 概要

BurgerEditorでは、独自のブロックカタログを定義することで、プロジェクトに適した自由なブロック構成を作成できます。カタログはブロックエディターで利用可能なブロックを分類・整理したものです。

## データ構造

カスタムブロックカタログは TypeScript の型定義に基づいて作成されます。詳細な型定義は [`@burger-editor/core`の`src/types.ts`](../packages/@burger-editor/core/src/types.ts) を参照してください。

### 主要な型

- `BlockCatalog`: カタログ全体の型（カテゴリごとのブロック一覧）
- `CatalogItem`: カタログ内の個別ブロック項目の型
- `BlockDefinition`: ブロックの定義情報の型
- `BlockItemStructure`: ブロック内のアイテム構造の型
- `BlockItem`: 個別アイテムの型

## カスタムカタログの例

### 基本的なカスタムカタログ

```javascript
export const customCatalog = {
	// カテゴリ名
	カスタムブロック: [
		{
			label: 'カスタムテキスト+画像',
			definition: {
				name: 'custom-text-image',
				containerProps: {
					type: 'grid',
					columns: 2,
				},
				classList: ['custom-block'],
				style: {
					'max-width': 'large',
					'bg-color': 'blue',
				},
				items: [
					// 第一グループ：テキストと画像
					['wysiwyg', 'image'],
					// 第二グループ：ボタン
					['button'],
				],
			},
		},
	],
	特殊レイアウト: [
		{
			label: '3列カード',
			definition: {
				name: 'three-column-card',
				containerProps: {
					type: 'grid',
					columns: 3,
					justify: 'center',
				},
				items: [
					// 各列に画像とテキストを配置
					[
						{ name: 'image', data: { alt: 'カード1' } },
						{ name: 'wysiwyg', data: { wysiwyg: '<h3>タイトル1</h3>' } },
					],
					[
						{ name: 'image', data: { alt: 'カード2' } },
						{ name: 'wysiwyg', data: { wysiwyg: '<h3>タイトル2</h3>' } },
					],
					[
						{ name: 'image', data: { alt: 'カード3' } },
						{ name: 'wysiwyg', data: { wysiwyg: '<h3>タイトル3</h3>' } },
					],
				],
			},
		},
	],
};
```

### カタログの結合

既存のデフォルトカタログと独自カタログを組み合わせることも可能です：

```javascript
import { defaultCatalog } from '@burger-editor/blocks';

export const catalog = {
	...defaultCatalog,
	...customCatalog,
};
```

## ブロック構成のポイント

### アイテム構造の理解

- **`items`配列**: 第1階層がグループ、第2階層がアイテムを表します
- **アイテム指定**:
  - 文字列でアイテム名のみ: `'wysiwyg'`
  - オブジェクトで初期データ付き: `{ name: 'wysiwyg', data: { wysiwyg: '<h3>初期テキスト</h3>' } }`

### コンテナプロパティ

レイアウト方法を指定します：

- `type`: `'grid'` | `'inline'` | `'float'`
- `columns`: グリッドの列数（gridタイプの場合）
- `justify`, `align`, `wrap`: インラインタイプの場合の配置オプション
- `float`: フロートタイプの場合の方向

詳細は[ブロックアーキテクチャ](./block-architecture.md)を参照してください。

### スタイリングオプション

- **`classList`**: CSS クラスの配列
- **`style`**: スタイルオプションのキーバリューペア
- **`id`**: ブロックのID（実際は`bge-`プレフィックス付きで適用）

スタイリングの詳細は[スタイリングガイド](./styling-guide.md)を参照してください。

## 高度な利用例

### 条件付きアイテム構成

```javascript
export const conditionalCatalog = {
	動的ブロック: [
		{
			label: 'レスポンシブカード',
			definition: {
				name: 'responsive-card',
				containerProps: {
					type: 'grid',
					columns: 2, // デスクトップでは2列
					autoRepeat: 'auto-fit', // 自動調整
				},
				style: {
					'max-width': 'full',
					'padding-block': 'large',
				},
				items: [
					[
						{ name: 'image', data: { alt: 'メイン画像' } },
						{ name: 'wysiwyg', data: { wysiwyg: '<h2>タイトル</h2><p>説明文</p>' } },
						'button',
					],
				],
			},
		},
	],
};
```

### プリセットデータ付きブロック

```javascript
export const presetCatalog = {
	プリセット: [
		{
			label: 'お知らせバナー',
			definition: {
				name: 'notice-banner',
				containerProps: {
					type: 'inline',
					justify: 'center',
					align: 'center',
				},
				classList: ['notice-banner'],
				style: {
					'bg-color': 'blue',
					'padding-block': 'middle',
					'padding-inline': 'large',
				},
				items: [
					[
						{
							name: 'wysiwyg',
							data: {
								wysiwyg: '<strong>🎉 お知らせ:</strong> 新機能がリリースされました！',
							},
						},
						{
							name: 'button',
							data: {
								text: '詳細を見る',
								url: '/news/latest',
								target: '_self',
							},
						},
					],
				],
			},
		},
	],
};
```

## 利用可能なアイテム

標準で提供されているアイテムについては、[`@burger-editor/blocks`のREADME](../packages/@burger-editor/blocks/README.md)を参照してください。

## 関連ドキュメント

- [ブロックアーキテクチャ](./block-architecture.md) - ブロック構造の詳細
- [スタイリングガイド](./styling-guide.md) - ブロックの見た目カスタマイズ
- [`@burger-editor/core`](../packages/@burger-editor/core/README.md) - コアパッケージの概要
- [`@burger-editor/blocks`](../packages/@burger-editor/blocks/README.md) - 標準ブロック・アイテム一覧
