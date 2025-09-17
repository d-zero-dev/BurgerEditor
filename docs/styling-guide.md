# ブロックスタイリングガイド

## 概要

BurgerEditorでは、CSS変数（カスタムプロパティ）を使用してブロックのスタイルを動的に変更できるスタイル拡張機能を提供しています。この機能により、プルダウンメニューからスタイルオプションを選択して、コンテンツの見た目を柔軟にカスタマイズできます。

## 基本的な使用方法

### カタログ定義でのスタイル設定

ブロックには`style`プロパティでスタイルオプションを設定できます。設定されたオプションは自動的に`--bge-options-*`のCSSカスタムプロパティとして適用されます。

```javascript
export const customCatalog = {
	カスタムブロック: [
		{
			label: 'スタイル付きブロック',
			definition: {
				name: 'styled-block',
				containerProps: {
					type: 'grid',
					columns: 2,
				},
				// シンプルなキー・値でオプション設定
				style: {
					'max-width': 'large',
					'bg-color': 'blue',
					'padding-block': 'middle',
					'padding-inline': 'large',
				},
				items: [['wysiwyg', 'image']],
			},
		},
	],
};
```

### 自動変換の仕組み

カタログ定義の `style` プロパティで設定したオプションは、自動的に対応するCSSカスタムプロパティとして適用されます：

```javascript
// カタログ定義
style: {
  'max-width': 'large',
  'bg-color': 'blue',
  'padding-block': 'middle'
}

// 自動的に以下のCSSカスタムプロパティが設定される
// --bge-options-max-width: var(--bge-options-max-width--large);
// --bge-options-bg-color: var(--bge-options-bg-color--blue);
// --bge-options-padding-block: var(--bge-options-padding-block--middle);
```

## 標準提供されるスタイルオプション

[`general.css`](../packages/@burger-editor/blocks/src/general.css) では以下のスタイルオプションが標準で提供されています：

### 最大幅（max-width）

| オプション | 値                       | 説明              |
| ---------- | ------------------------ | ----------------- |
| `normal`   | `calc(800 / 16 * 1rem)`  | 標準幅（50rem）   |
| `small`    | `calc(400 / 16 * 1rem)`  | 小さい幅（25rem） |
| `medium`   | `calc(600 / 16 * 1rem)`  | 中間幅（37.5rem） |
| `large`    | `calc(1200 / 16 * 1rem)` | 大きい幅（75rem） |
| `full`     | `100dvi`                 | 全幅              |

### マージン（margin）

| オプション | 値     | 説明           |
| ---------- | ------ | -------------- |
| `normal`   | `3rem` | 標準マージン   |
| `none`     | `0`    | マージンなし   |
| `small`    | `1rem` | 小さいマージン |
| `large`    | `8rem` | 大きいマージン |

### 背景色（bg-color）

| オプション    | 値            | 説明               |
| ------------- | ------------- | ------------------ |
| `transparent` | `transparent` | 透明（デフォルト） |
| `white`       | `#fff`        | 白                 |
| `gray`        | `#dfdfdf`     | グレー             |
| `blue`        | `#eaf3f8`     | 青系               |
| `red`         | `#fcc`        | 赤系               |

### パディング（padding-block）

| オプション | 値     | 説明                         |
| ---------- | ------ | ---------------------------- |
| `none`     | `0`    | パディングなし（デフォルト） |
| `small`    | `1rem` | 小さいパディング             |
| `middle`   | `3rem` | 中間パディング               |
| `large`    | `5rem` | 大きいパディング             |

### パディング（padding-inline）

| オプション       | 値     | 説明                           |
| ---------------- | ------ | ------------------------------ |
| `default-gutter` | `2rem` | デフォルトガター（デフォルト） |
| `none`           | `0`    | パディングなし                 |
| `small`          | `1rem` | 小さいパディング               |
| `middle`         | `3rem` | 中間パディング                 |
| `large`          | `5rem` | 大きいパディング               |

### 列間隔（column-gap）

| オプション | 値       | 説明                   |
| ---------- | -------- | ---------------------- |
| `normal`   | `1rem`   | 標準間隔（デフォルト） |
| `none`     | `0`      | 間隔なし               |
| `small`    | `0.5rem` | 小さい間隔             |
| `large`    | `5rem`   | 大きい間隔             |

### 行間隔（row-gap）

| オプション | 値       | 説明                   |
| ---------- | -------- | ---------------------- |
| `normal`   | `1rem`   | 標準間隔（デフォルト） |
| `none`     | `0`      | 間隔なし               |
| `small`    | `0.5rem` | 小さい間隔             |
| `large`    | `5rem`   | 大きい間隔             |

### サブグリッド間隔（\_grid_subgrid-gap、gridタイプのみ）

| オプション | 値       | 説明                   |
| ---------- | -------- | ---------------------- |
| `normal`   | `1rem`   | 標準間隔（デフォルト） |
| `none`     | `0`      | 間隔なし               |
| `small`    | `0.5rem` | 小さい間隔             |
| `large`    | `1rem`   | 大きい間隔             |

## CSS変数による高度なスタイル拡張

### CSS変数の命名規則

CSS変数は以下の命名規則に従います：

```css
--bge-options-[カテゴリ名]--[プロパティ名]: [値];
```

### 独自スタイルオプションの追加

新しいスタイルオプションを追加する場合：

#### 1. CSS変数定義

選択肢となる変数を定義：

```css
[data-bge-container] {
	--bge-options-border-style--none: none;
	--bge-options-border-style--solid: 1px solid #ccc;
	--bge-options-border-style--dashed: 2px dashed #999;
	--bge-options-border-style: var(--bge-options-border-style--none);
}
```

#### 2. CSS実装

変数を実際のスタイルに適用：

```css
:where([data-bge-container]) {
	border: var(--bge-options-border-style);
}
```

#### 3. UI自動反映

ブロックオプションダイアログのプルダウンメニューに自動表示されます。

### CSSの流儀に従った柔軟な活用

CSS変数はコンテナ以外の要素でも活用できます：

```css
/* ブロック内の要素に適用 */
.my-content {
	color: var(--bge-options-text-color--primary, #333);
	font-size: var(--bge-options-font-size--medium, 1rem);
}

/* 疑似要素にも適用可能 */
.my-element::before {
	background: var(--bge-options-accent-color--brand, #007bff);
}

/* メディアクエリと組み合わせ */
@media (min-width: 768px) {
	.responsive-content {
		padding: var(--bge-options-spacing-large--desktop, 3rem);
	}
}
```

### 動的検出

BurgerEditorは以下のパターンでCSS変数を自動検出します：

- `--bge-options-[カテゴリ]--[プロパティ名]` 形式の変数
- `[data-bge-container]` セレクター内で定義された変数のみ検出
- カテゴリごとにグループ化してプルダウンメニューでUI表示
- 各プロパティの値も自動で表示
- **値に `null` を設定すると選択肢から除外される**（条件によって選択肢を制御可能）

### コンテナタイプ固有のスタイル

`_grid_` プレフィックスを使用すると、gridコンテナでのみ表示されるオプションを作成できます：

```css
[data-bge-container] {
	/* 全てのコンテナタイプで表示 */
	--bge-options-color--primary: #007bff;
	--bge-options-color--danger: #dc3545;

	/* gridコンテナでのみ表示 */
	--bge-options-_grid_item-layout--stretch: stretch;
	--bge-options-_grid_item-layout--center: center;
	--bge-options-_grid_item-layout--start: start;
}
```

## 実用例

### 基本的なレイアウト調整

```javascript
{
	label: 'ヒーローセクション',
	definition: {
		name: 'hero-section',
		containerProps: {
			type: 'grid',
			columns: 1,
		},
		style: {
			'max-width': 'full',
			'bg-color': 'blue',
			'padding-block': 'large',
		},
		items: [['wysiwyg']],
	},
}
```

### 間隔の狭い並列レイアウト

```javascript
{
	label: 'タイトなカードレイアウト',
	definition: {
		name: 'tight-cards',
		containerProps: {
			type: 'grid',
			columns: 3,
		},
		style: {
			'column-gap': 'small',
			'row-gap': 'small',
			'padding-inline': 'none',
		},
		items: [
			['image', 'wysiwyg'],
			['image', 'wysiwyg'],
			['image', 'wysiwyg'],
		],
	},
}
```

### 高度なカスタマイズ例

#### テーマカラーシステム

```css
[data-bge-container] {
	/* 独自のカラーオプション定義 */
	--bge-options-theme--primary: #007bff;
	--bge-options-theme--secondary: #6c757d;
	--bge-options-theme--success: #28a745;
	--bge-options-theme--warning: #ffc107;
	--bge-options-theme--danger: #dc3545;
	--bge-options-theme: var(--bge-options-theme--primary);
}

/* ブロック内要素での活用 */
.button {
	background-color: var(--bge-options-theme);
	border-color: var(--bge-options-theme);
}

.text-accent {
	color: var(--bge-options-theme);
}
```

#### 影・エフェクトシステム

```css
[data-bge-container] {
	/* 独自のエフェクトオプション定義 */
	--bge-options-shadow--none: none;
	--bge-options-shadow--subtle: 0 1px 3px rgba(0, 0, 0, 0.12);
	--bge-options-shadow--medium: 0 4px 6px rgba(0, 0, 0, 0.12);
	--bge-options-shadow--strong: 0 10px 25px rgba(0, 0, 0, 0.15);
	--bge-options-shadow--premium: null; /* 条件によって表示/非表示を制御 */
	--bge-options-shadow: var(--bge-options-shadow--none);

	--bge-options-border-radius--none: 0;
	--bge-options-border-radius--small: 4px;
	--bge-options-border-radius--medium: 8px;
	--bge-options-border-radius--large: 16px;
	--bge-options-border-radius: var(--bge-options-border-radius--none);
}

/* 条件によってプレミアムオプションを有効化 */
.premium-enabled [data-bge-container] {
	--bge-options-shadow--premium: 0 20px 40px rgba(0, 0, 0, 0.2);
}

/* 実際のスタイル適用 */
:where([data-bge-container]) {
	box-shadow: var(--bge-options-shadow);
	border-radius: var(--bge-options-border-radius);
}
```

#### gridコンテナ専用オプション

```css
[data-bge-container] {
	/* gridタイプでのみ表示されるオプション */
	--bge-options-_grid_align-items--stretch: stretch;
	--bge-options-_grid_align-items--center: center;
	--bge-options-_grid_align-items--start: start;
	--bge-options-_grid_align-items--end: end;
	--bge-options-_grid_align-items: var(--bge-options-_grid_align-items--stretch);
}

/* gridコンテナに適用 */
:where([data-bge-container='grid'], [data-bge-container^='grid:'])
	[data-bge-container-frame] {
	align-items: var(--bge-options-_grid_align-items);
}
```

## 注意事項

### CSS変数の制約

- 変数名は必ず `--bge-options-[カテゴリ]--[プロパティ]` 形式を守る
- `[data-bge-container]` セレクター内でのみ定義する（検出のため）
- カテゴリ名とプロパティ名にはハイフン区切りの小文字英数字のみ使用
- コンテナタイプ固有にする場合は `--bge-options-_grid_[カテゴリ]--[プロパティ]` のように `_コンテナタイプ_` を追加
- **重要**: 変数を定義するだけでなく、実際のCSSスタイルとして実装する必要がある
- 値の変更はCSS側で行い、UIでは選択のみ
- 値に `null` を設定すると選択肢から除外される（動的な選択肢制御に活用）

### 実装時の注意点

- 標準の [`general.css`](../packages/@burger-editor/blocks/src/general.css) で提供されるオプションは既にスタイル実装済み
- 独自オプションを追加する場合は、変数定義とスタイル実装の両方が必要
- デフォルト値の設定により、未選択時の表示も制御可能

## 関連ドキュメント

- [ブロックアーキテクチャ](./block-architecture.md) - ブロック構造の詳細
- [カスタムブロックカタログの作成](./custom-catalog.md) - 独自ブロック定義の方法
- [`@burger-editor/core`](../packages/@burger-editor/core/README.md) - コアパッケージの概要
- [`@burger-editor/blocks`](../packages/@burger-editor/blocks/README.md) - 標準ブロック・アイテム一覧

## 関連実装ファイル

### Core実装

- [get-custom-properties.ts](../packages/@burger-editor/core/src/dom-helpers/get-custom-properties.ts) - CSS変数の動的検出とカテゴリ分類
- [export-style-options.ts](../packages/@burger-editor/core/src/block/export-style-options.ts) - ブロックからスタイルオプションのエクスポート
- [import-style-options.ts](../packages/@burger-editor/core/src/block/import-style-options.ts) - スタイルオプションのブロックへの適用
- [block-options-dialog.ts](../packages/@burger-editor/core/src/block-options-dialog.ts) - ブロックオプションダイアログの制御
- [const.ts](../packages/@burger-editor/core/src/const.ts) - CSS変数のプレフィックス定義

### UI実装

- [block-options.svelte](../packages/@burger-editor/client/src/block-options.svelte) - ブロックオプションのSvelte UIコンポーネント

### スタイル定義

- [general.css](../packages/@burger-editor/blocks/src/general.css) - 標準スタイルオプションの定義と実装

### テスト

- [get-custom-properties.spec.ts](../packages/@burger-editor/core/src/dom-helpers/get-custom-properties.spec.ts) - CSS変数検出機能のテスト
