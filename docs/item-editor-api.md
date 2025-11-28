# アイテムエディターAPIガイド

## 概要

BurgerEditorでは、カスタムアイテムを作成する際に`editorOptions`を使用してエディターの動作をカスタマイズできます。このドキュメントでは、`ItemEditorDialog`のAPIを使用した実践的なユースケースとパターンを紹介します。

詳細な型定義については、[`item-editor-dialog.ts`](../packages/@burger-editor/core/src/item-editor-dialog.ts)を参照してください。

## エディターHTMLのname属性

エディターHTML（`editor.html`）内のフォームコントロールは、`name`属性によってデータと紐付けられます。この`name`属性の命名規則が非常に重要です。

### 命名規則

1. **`bge-`プレフィックス**: すべての`name`属性は`bge-`で始める必要があります
2. **ケバブケース**: HTMLではケバブケース（`kebab-case`）を使用します
3. **自動変換**: TypeScriptの型定義ではキャメルケース（`camelCase`）に自動変換されます
4. **配列データ**: 配列データの場合は`[]`サフィックスを付けます

### 実践例

```html
<!-- editor.html -->
<input type="text" name="bge-title" />
<input type="number" name="bge-width" />
<input type="checkbox" name="bge-lazy" />
<!-- 配列データ -->
<input type="hidden" name="bge-path[]" />
```

```typescript
// index.ts
export default createItem<{
	// bge-title → title
	title: string;
	// bge-width → width
	width: number;
	// bge-lazy → lazy
	lazy: boolean;
	// bge-path[] → path
	path: string[];
}>({
	// ...
});
```

### エディターAPIでの参照方法

エディターAPIでは、`$`プレフィックスを付けたキャメルケースで参照します：

```typescript
// bge-title の値を取得
editor.get('$title');
// bge-width の値を更新
editor.update('$width', 100);
editor.onChange('$lazy', (value) => {
	/* ... */
});
```

## 基本的なユースケースとパターン

### 1. 値の取得・更新

#### 値の取得（`get`）

エディター内のフォームコントロールの値を取得します。

```html
<!-- editor.html -->
<input type="text" name="bge-title" />
<input type="number" name="bge-width" />
<input type="checkbox" name="bge-lazy" />
<select name="bge-target">
	<option value="">指定なし</option>
	<option value="_blank">新しいウィンドウ</option>
</select>
<textarea name="bge-description"></textarea>
<output name="bge-css-width-unit">px</output>
<input type="hidden" name="bge-path[]" />
```

```typescript
editorOptions: {
	open(data, editor) {
		// 単純な値の取得
		const title = editor.get('$title'); // string (text input)
		const width = editor.get('$width'); // number (number input)
		// checkbox の場合は boolean
		const lazy = editor.get('$lazy'); // boolean (checkbox)
		const target = editor.get('$target'); // string (select)
		const description = editor.get('$description'); // string (textarea)
		const cssWidthUnit = editor.get('$cssWidthUnit'); // string (output)

		// 配列データの取得
		// string[]
		const paths = editor.get('$path');
		const firstPath = paths[0];
	},
}
```

**注意**: `get`メソッドは`<input>`, `<textarea>`, `<select>`, `<output>`要素に対して動作します。

**実装例**: [download-file](../packages/@burger-editor/blocks/src/items/download-file/index.ts)

```typescript
import { formatByteSize } from '@burger-editor/utils';

export default createItem<{
	// ...
}>({
	// ...
	editorOptions: {
		open(data, editor) {
			// ファイルサイズを取得してフォーマット
			const fileSize = Number.parseFloat(data.size ?? '0');
			editor.update('$formatedSize', formatByteSize(fileSize));
			editor.update('$size', fileSize.toString());
		},
	},
});
```

#### 値の更新（`update`）

エディター内のフォームコントロールの値を更新します。

```html
<!-- editor.html -->
<input type="text" name="bge-title" />
<input type="number" name="bge-width" />
<select name="bge-target">
	<option value="">指定なし</option>
	<option value="_blank">新しいウィンドウ</option>
</select>
<textarea name="bge-description"></textarea>
<output name="bge-css-width-unit">px</output>
<input type="hidden" name="bge-path[]" />
```

```typescript
editorOptions: {
	open(data, editor) {
		// 直接値を設定
		editor.update('$title', '新しいタイトル'); // text input
		editor.update('$width', 100); // number input
		editor.update('$target', '_blank'); // select
		editor.update('$description', '説明文'); // textarea
		editor.update('$cssWidthUnit', 'px'); // output

		// 関数を使って値を変換
		// 関数は (currentValue, element) => newValue の形式
		editor.update('$title', (currentValue) => {
			if (currentValue === 'デフォルト値') {
				return '';
			}
			return currentValue;
		});

		// 配列データの更新
		const paths = [...editor.get('$path')];
		paths[0] = '/new/path.jpg';
		editor.update('$path', paths);
	},
}
```

**注意**: `update`メソッドは`<input>`, `<textarea>`, `<select>`, `<output>`要素に対して動作します。

**実装例**: [youtube](../packages/@burger-editor/blocks/src/items/youtube/index.ts)

```typescript
editorOptions: {
	open({ title }, editor) {
		const FALLBACK_TITLE = 'YouTube動画';
		editor.update('$title', (value) => {
			if (title === FALLBACK_TITLE) {
				return '';
			}
			return value;
		});
	},
}
```

### 2. 値変更の監視とリアクティブなUI更新（`onChange`）

フォームコントロールの値が変更されたときに処理を実行します。

```html
<!-- editor.html -->
<input type="radio" name="bge-scale-type" value="container" />
<input type="radio" name="bge-scale-type" value="original" />
<input type="text" name="bge-media-input" />
<input type="range" name="bge-scale" min="1" max="100" step="1" value="100" />
<input type="number" name="bge-css-width-number" min="1" step="1" value="100" />
```

```typescript
editorOptions: {
	open(data, editor) {
		// 値変更を監視して他のフィールドを更新
		// ハンドラーは (newValue, oldValue) => void の形式
		// radio buttonの値変更を監視
		editor.onChange('$scaleType', (scaleType) => {
			// scaleTypeが変更されたら、関連する値を再計算
			if (scaleType === 'container') {
				editor.update('$cssWidth', '100cqi');
			} else {
				editor.update('$cssWidth', '100px');
			}
		});

		// テキスト入力の変更を監視して配列データを更新
		editor.onChange('$mediaInput', (value) => {
			const media = [...editor.get('$media')];
			// 最初の要素を更新
			media[0] = value;
			editor.update('$media', media);
		});

		// 初期値でも実行する（デフォルト: true）
		// rangeスライダーの値変更を監視
		editor.onChange('$scale', (scale) => {
			// scaleが変更されたら、幅を再計算
			const newWidth = scale * 10;
			editor.update('$cssWidth', `${newWidth}px`);
		}, true);

		// 初期値では実行しない
		// number入力の値変更を監視
		editor.onChange('$cssWidthNumber', (widthNumber) => {
			// 値が変更されたときだけ処理を実行
			if (widthNumber > 100) {
				editor.update('$cssWidth', '100px');
			}
		}, false);
	},
}
```

**実装例**: [image](../packages/@burger-editor/blocks/src/items/image/index.ts)

### 3. 条件に応じた入力欄の有効/無効化（`disable`）

他のフィールドの値に応じて、入力欄を有効/無効化します。

```html
<!-- editor.html -->
<label>
	<input type="checkbox" name="bge-popup" />
	<span>ポップアップで画像を開く</span>
</label>
<input type="url" name="bge-href" />
<label>
	<input type="checkbox" name="bge-target-blank" />
	<span>別タブで開く</span>
</label>
```

```typescript
editorOptions: {
	open(data, editor) {
		// チェックボックスの状態に応じて入力欄を無効化
		editor.onChange('$popup', (isPopup) => {
			// popupがtrueのとき、hrefとtargetBlankを無効化
			editor.disable('$href', isPopup);
			editor.disable('$targetBlank', isPopup);
		});
	},
}
```

**注意**: `disable`メソッドは`<input>`, `<textarea>`, `<select>`要素に対して動作します。`<output>`要素は`disabled`プロパティをサポートしていないため、`disable`メソッドは`output`要素に対しては動作しません。

**実装例**: [image](../packages/@burger-editor/blocks/src/items/image/index.ts)

```typescript
editorOptions: {
	open(data, editor) {
		editor.onChange('$popup', (disable) => {
			editor.disable('$href', disable);
			editor.disable('$targetBlank', disable);
		});
	},
}
```

### 4. 数値入力の最大値設定（`max`）

数値入力フィールド（`<input type="number">`や`<input type="range">`）の最大値を動的に設定します。

```html
<!-- editor.html -->
<input type="number" name="bge-css-width-number" min="1" step="1" value="100" />
<input type="range" name="bge-scale" min="1" max="100" step="1" value="100" />
```

```typescript
editorOptions: {
	open(data, editor) {
		// 画像の幅に応じて最大値を設定（type="number"）
		const imageWidth = editor.get('$width');
		editor.max('$cssWidthNumber', imageWidth);

		// 固定値で最大値を設定（type="range"）
		editor.max('$scale', 100);
	},
}
```

**注意**: `max`メソッドは`<input type="number">`と`<input type="range">`要素に対して動作します。

**実装例**: [image](../packages/@burger-editor/blocks/src/items/image/index.ts)

### 5. 配列データの扱い

複数の値を扱う場合（例：複数画像、リスト項目）は配列データを使用します。

```html
<!-- editor.html -->
<!-- 配列データは name 属性に [] サフィックスを付ける -->
<input type="hidden" name="bge-path[]" />
<input type="hidden" name="bge-alt[]" />
<input type="hidden" name="bge-width[]" />
```

```typescript
export default createItem<{
	path: string[];
	alt: string[];
	width: number[];
}>({
	editorOptions: {
		open(data, editor) {
			// 配列データの取得
			// string[]
			const paths = editor.get('$path');
			const firstPath = paths[0] ?? '';

			// 配列データの更新（特定のインデックスを更新）
			const updatedPaths = [...editor.get('$path')];
			// 最初の要素を更新
			updatedPaths[0] = '/new/path.jpg';
			editor.update('$path', updatedPaths);

			// 配列の各要素を個別に更新
			const alt = [...editor.get('$alt')];
			alt[0] = '新しい代替テキスト';
			editor.update('$alt', alt);
		},
	},
});
```

**実装例**: [image](../packages/@burger-editor/blocks/src/items/image/index.ts)

```typescript
editorOptions: {
	open(data, editor) {
		// 画像が読み込まれたときに配列データを更新
		const path = [...editor.get('$path')];
		path[0] = '/path/to/image.jpg';
		editor.update('$path', path);

		const width = [...editor.get('$width')];
		width[0] = 800;
		editor.update('$width', width);

		const height = [...editor.get('$height')];
		height[0] = 600;
		editor.update('$height', height);
	},
}
```

### 6. ファイル選択などの外部イベント連携（`componentObserver`）

エディターの`componentObserver`を使用して、外部コンポーネント（ファイルアップローダーなど）と連携します。

```typescript
editorOptions: {
	open(data, editor) {
		// ファイル選択イベントを発火（ファイルアップローダーに通知）
		editor.componentObserver.notify('file-select', {
			path: data.path,
			fileSize: Number.parseFloat(data.size ?? '0'),
			isEmpty: data.path === '',
			isMounted: false,
		});

		// ファイル選択イベントを監視
		editor.componentObserver.on('file-select', ({ path, fileSize, isEmpty }) => {
			if (isEmpty) {
				return;
			}

			// ファイルが選択されたら、エディターの値を更新
			editor.update('$path', path);
			// formatByteSize関数を使用（@burger-editor/utilsからインポート）
			editor.update('$formatedSize', formatByteSize(fileSize));
			editor.update('$size', fileSize.toString());
		});
	},
}
```

**実装例**: [download-file](../packages/@burger-editor/blocks/src/items/download-file/index.ts)

```typescript
import { formatByteSize } from '@burger-editor/utils';

export default createItem<{
	// ...
}>({
	// ...
	editorOptions: {
		open(data, editor) {
			editor.componentObserver.notify('file-select', {
				path: data.path,
				fileSize: Number.parseFloat(data.size ?? '0'),
				isEmpty: data.path === '',
				isMounted: false,
			});

			editor.componentObserver.on('file-select', ({ path, fileSize, isEmpty }) => {
				if (isEmpty) {
					return;
				}

				editor.update('$path', path);
				editor.update('$formatedSize', formatByteSize(fileSize));
				editor.update('$size', fileSize.toString());
			});
		},
	},
});
```

### 7. データ変換（`beforeOpen`/`beforeChange`）

エディターで扱うデータ形式と保存データ形式が異なる場合、`beforeOpen`と`beforeChange`で変換を行います。

#### `beforeOpen`: 保存データ → エディター用データ

エディターを開く前に、保存されているデータをエディター用の形式に変換します。

```typescript
editorOptions: {
	beforeOpen(data) {
		// 保存データ（HTML）をエディター用データ（Markdown）に変換
		return {
			...data,
			td: data.td.map((html) => {
				// HTMLをMarkdownに変換する処理
				return html.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
			}),
		};
	},
}
```

**実装例**: [table](../packages/@burger-editor/blocks/src/items/table/index.ts)

```typescript
editorOptions: {
	beforeOpen(data) {
		return {
			...data,
			// HTMLをMarkdownに変換（htmlToMarkdown関数を使用）
			// htmlToMarkdown関数は外部からインポートする必要があります
			td: data.td.map(htmlToMarkdown),
		};
	},
}
```

**実装例**: [image](../packages/@burger-editor/blocks/src/items/image/index.ts)

```typescript
editorOptions: {
	beforeOpen(data) {
		// 保存データ（('eager' | 'lazy')[]）をエディター用（boolean）に変換
		const lazy = data.loading.includes('lazy');
		const popup = data.node === 'button' && data.command === 'show-modal';
		const targetBlank = data.node === 'a' && data.target === '_blank';

		return {
			...data,
			lazy,
			popup,
			targetBlank,
		};
	},
}
```

#### `beforeChange`: エディター用データ → 保存データ

保存する前に、エディター用のデータを保存用の形式に変換します。

```typescript
editorOptions: {
	beforeChange(newData) {
		// エディター用データ（Markdown）を保存データ（HTML）に変換
		return {
			...newData,
			td: newData.td.map((markdown) => {
				// MarkdownをHTMLに変換する処理
				return markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
			}),
		};
	},
}
```

**実装例**: [table](../packages/@burger-editor/blocks/src/items/table/index.ts)

```typescript
editorOptions: {
	beforeChange(newData) {
		return {
			...newData,
			// MarkdownをHTMLに変換（markdownToHtml関数を使用）
			// markdownToHtml関数は外部からインポートする必要があります
			td: newData.td.map(markdownToHtml),
		};
	},
}
```

**実装例**: [image](../packages/@burger-editor/blocks/src/items/image/index.ts)

```typescript
editorOptions: {
	beforeChange(newData) {
		// エディター用（boolean）を保存データ（配列形式）に変換
		const loading: ('eager' | 'lazy')[] = [newData.lazy ? 'lazy' : 'eager'];
		const node = newData.popup ? 'button' : newData.href ? 'a' : 'div';
		const target = node === 'a' && newData.targetBlank ? '_blank' : null;
		const command = node === 'button' ? 'show-modal' : null;

		return {
			...newData,
			loading,
			node,
			target,
			command,
		};
	},
}
```

**実装例**: [download-file](../packages/@burger-editor/blocks/src/items/download-file/index.ts)

```typescript
editorOptions: {
	beforeChange(newValues) {
		return {
			...newValues,
			// チェックボックスの状態に応じてdownload属性を設定
			download: newValues.downloadCheck ? (newValues.name ?? newValues.path) : '',
		};
	},
}
```

### 8. カスタムデータの使用（`getCustomData`/`setCustomData`）

エディターのライフサイクルを超えて保持したいデータ（例：イベントハンドラーの参照）を扱います。

```typescript
export default createItem<
	{
		lat: number;
		lng: number;
		// ...
	},
	{
		// カスタムデータの型定義
		search: (() => void) | null;
	}
>({
	editorOptions: {
		customData: {
			// 初期値
			search: null,
		},
		open(_, editor) {
			const search = (): void => {
				// 検索処理
				const address = editor.get('$search');
				// ...
			};

			// カスタムデータとして保存（他の場所から参照可能）
			editor.setCustomData('search', search);
		},
		beforeChange(newData, editor) {
			// カスタムデータを取得
			const search = editor.getCustomData('search');
			// ...
		},
	},
});
```

**実装例**: [google-maps](../packages/@burger-editor/blocks/src/items/google-maps/index.ts)

```typescript
editorOptions: {
	customData: {
		search: null,
	},
	open(_, editor) {
		const search = (): void => {
			const address = editor.get('$search');
			// 検索処理...
		};

		// editor.findメソッドでCSSセレクタを使って要素を検索
		const searchButton = editor.find<HTMLInputElement>('[name="bge-search-button"]');
		searchButton?.addEventListener('click', search);
		editor.setCustomData('search', search);
	},
}
```

## 実装例のまとめ

| パターン                     | 実装例                                                                              | 説明                            |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| 基本的な値の取得・更新       | [download-file](../packages/@burger-editor/blocks/src/items/download-file/index.ts) | `get`と`update`の基本的な使い方 |
| 値変更に応じたプレビュー更新 | [youtube](../packages/@burger-editor/blocks/src/items/youtube/index.ts)             | `onChange`とDOM操作の組み合わせ |
| 配列データの扱い             | [image](../packages/@burger-editor/blocks/src/items/image/index.ts)                 | 複数画像の管理、配列の更新      |
| 条件付き有効/無効化          | [image](../packages/@burger-editor/blocks/src/items/image/index.ts)                 | `disable`による入力欄制御       |
| データ形式変換               | [table](../packages/@burger-editor/blocks/src/items/table/index.ts)                 | Markdown ↔ HTML の変換         |
| 外部イベント連携             | [download-file](../packages/@burger-editor/blocks/src/items/download-file/index.ts) | `componentObserver`の使用       |
| カスタムデータ               | [google-maps](../packages/@burger-editor/blocks/src/items/google-maps/index.ts)     | イベントハンドラーの保存        |

## 関連ドキュメント

- [アイテムの仕様](../packages/@burger-editor/core/README.md#アイテムの仕様) - アイテムの基本的な作成方法
- [ItemEditorDialog実装](../packages/@burger-editor/core/src/item-editor-dialog.ts) - APIの詳細な型定義と実装
