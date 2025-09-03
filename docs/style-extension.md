# BurgerEditor スタイル拡張ガイド

## 概要

BurgerEditorでは、CSS変数（カスタムプロパティ）を使用してブロックのスタイルを動的に変更できるスタイル拡張機能を提供しています。この機能により、プルダウンメニューからスタイルオプションを選択して、コンテンツの見た目を柔軟にカスタマイズできます。

## CSS変数によるスタイル拡張

BurgerEditorでは、CSS変数（カスタムプロパティ）を使用してブロックのスタイルを動的に変更できます。標準では多くのスタイルオプションが [`general.css`](../packages/@burger-editor/blocks/src/general.css) で定義されており、これらのデフォルト変数は上書き可能です。また、追加で独自のオプションも定義可能です。

### 仕組み

CSS変数は以下の命名規則に従います：

```css
--bge-options-[カテゴリ名]--[プロパティ名]: [値];
```

### 標準提供されるスタイルオプション

[`general.css`](../packages/@burger-editor/blocks/src/general.css) では以下のスタイルオプションが標準で提供されています（通常、利用者はコンパイル済みCSSを使用するため、ソースコードで詳細を確認できます）：

- **max-width**: コンテナの最大幅（normal, small, medium, large, full）
- **margin**: ブロック間のマージン（none, small, normal, large）
- **bg-color**: 背景色（transparent, white, gray, blue, red）
- **padding-block**: 上下パディング（none, small, middle, large）
- **padding-inline**: 左右パディング（none, small, middle, large, default-gutter）
- **column-gap**: 列間の間隔（none, small, normal, large）
- **row-gap**: 行間の間隔（none, small, normal, large）
- **\_grid_subgrid-gap**: gridコンテナ専用のサブグリッド間隔

これらの変数は実際にCSSスタイルとして実装され、ブロックの見た目に反映されます：

```css
:where([data-bge-container]) {
	max-inline-size: var(--bge-options-max-width);
	padding-block: var(--bge-options-padding-block);
	padding-inline: var(--bge-options-padding-inline);
	margin-block-end: var(--bge-options-margin);
	background-color: var(--bge-options-bg-color);
}
```

### 独自スタイルオプションの追加

新しいスタイルオプションを追加する場合：

1. **CSS変数定義**: 選択肢となる変数を定義

```css
[data-bge-container] {
	--bge-options-border-style--none: none;
	--bge-options-border-style--solid: 1px solid #ccc;
	--bge-options-border-style--dashed: 2px dashed #999;
	--bge-options-border-style: var(--bge-options-border-style--none);
}
```

2. **CSS実装**: 変数を実際のスタイルに適用

```css
:where([data-bge-container]) {
	border: var(--bge-options-border-style);
}
```

3. **UI自動反映**: ブロックオプションダイアログのプルダウンメニューに自動表示

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

例：

```css
/* 色カテゴリ（全コンテナ共通） */
--bge-options-color--primary: #007bff;
--bge-options-color--danger: #dc3545;

/* アイテムレイアウト（gridコンテナのみ） */
--bge-options-_grid_item-layout--stretch: stretch;
--bge-options-_grid_item-layout--center: center;
```

上記のCSS定義により、UIには以下が表示されます：

- **color**（全コンテナ共通）: primary (#007bff), danger (#dc3545)
- **item-layout**（gridコンテナのみ）: stretch (stretch), center (center)

#### 3. 独自設定

##### CSSクラス設定

- 任意のCSSクラスを追加可能
- 複数クラスはスペース区切りで入力
- 独自のスタイリングやJavaScriptとの連携に使用

##### ID設定

- アンカーリンク用のID属性を設定
- 実際のIDには自動的に `bge-` プレフィックスが付与
- ページ内リンクや外部からの直接リンクに使用

## 実用例

### 標準スタイルオプションの活用

#### 基本的なレイアウト調整

```css
/* 標準で提供されるオプションをそのまま活用 */
[data-bge-container] {
	/* ブロックオプションで選択可能 */
	--bge-options-max-width: var(--bge-options-max-width--large);
	--bge-options-margin: var(--bge-options-margin--large);
	--bge-options-bg-color: var(--bge-options-bg-color--blue);
	--bge-options-padding-block: var(--bge-options-padding-block--middle);
}
```

### 独自スタイルオプションの実装例

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

## Appendix: 関連実装ファイル

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
