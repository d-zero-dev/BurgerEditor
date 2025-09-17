# ブロックスタイリングガイド

## ブロックオプション

ブロックには`style`プロパティでスタイルオプションを設定できます。設定されたオプションは自動的に`--bge-options-*`のCSSカスタムプロパティとして適用されます。

### 使用方法

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

## 利用可能なオプション

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

## 実用例

### 背景色付きの幅広ブロック

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

## カスタムオプションの追加

独自のオプション値を追加することも可能です：

```css
[data-bge-container] {
	/* カスタム色の追加 */
	--bge-options-bg-color--brand: #your-brand-color;

	/* カスタム幅の追加 */
	--bge-options-max-width--content: calc(1000 / 16 * 1rem);
}
```

```javascript
// カスタムオプションの使用
style: {
	'bg-color': 'brand',
	'max-width': 'content',
}
```
