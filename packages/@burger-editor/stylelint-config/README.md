# @burger-editor/stylelint-config

BurgerEditorのページ制作者向けのStylelint設定パッケージです。BurgerEditor内部セレクタの誤使用を検出し、意図しないスタイル崩れを防止します。

## インストール

```bash
yarn add -D @burger-editor/stylelint-config stylelint
```

> **注意**: `stylelint` v16.0.0以上がpeer dependencyとして必要です。

## 使い方

### 基本（推奨）

Stylelintの設定ファイルで`extends`に指定します。デフォルト設定ですべての内部セレクタを検出します。

```js
// stylelint.config.js
export default {
	extends: ['@burger-editor/stylelint-config'],
};
```

### プラグインとして使用

ルールの有効/無効やオプションを個別に制御する場合は、プラグインとして直接インポートします。

```js
// stylelint.config.js
import plugin from '@burger-editor/stylelint-config/plugin';

export default {
	plugins: [plugin],
	rules: {
		'@burger-editor/no-internal-selector': true,
	},
};
```

## ルール: `@burger-editor/no-internal-selector`

BurgerEditorが内部的に使用するセレクタへのスタイル指定を禁止します。これらの要素にスタイルを当てると、エディタの動作やアップデート時に意図しない崩れが発生する可能性があります。

### デフォルトで検出される対象

| パターン | 種別 | 説明 |
| --- | --- | --- |
| `data-bge`, `data-bge-*` | 属性セレクタ | エディタ構造・データバインディング属性 |
| `data-bgi`, `data-bgi-*` | 属性セレクタ | アイテムラッパー属性 |
| `data-bgc`, `data-bgc-*` | 属性セレクタ | コンポーネント内部属性 |
| `bge-*` | 型セレクタ | BurgerEditorカスタム要素 |

### 検出例

```css
/* NG: 警告が発生 */
[data-bge] { color: red; }
[data-bge-container] { display: grid; }
[data-bgi] { margin: 0; }
[data-bgc-flex-box] { display: flex; }
bge-wysiwyg { color: red; }

/* OK: 警告なし */
.my-class { color: red; }
[data-custom] { color: red; }
my-component { display: block; }
```

### `@scope`での動作

`@scope`のルートセレクタは検出対象ですが、リミットセレクタ（`to (...)`）は許可されます。リミットにBurgerEditor内部セレクタを使用して、スコープの境界を定義できます。

```css
/* NG: ルートセレクタが検出される */
@scope ([data-bge]) { .child { color: red; } }

/* OK: リミットセレクタは許可 */
@scope (.my-scope) to ([data-bge-item]) { .child { color: red; } }
```

### オプション

カスタムパターンを指定すると、デフォルトパターンを**置き換え**ます（マージではありません）。

#### `disallowedAttrPatterns`

検出対象の属性セレクタパターンを指定します。文字列（正規表現構文）またはRegExpを受け付けます。

```js
// stylelint.config.js
export default {
	extends: ['@burger-editor/stylelint-config'],
	rules: {
		'@burger-editor/no-internal-selector': [
			true,
			{
				disallowedAttrPatterns: ['/^data-bge/', '/^data-custom/'],
			},
		],
	},
};
```

指定した場合、デフォルトの属性パターン（`data-bg[eic]`）は使用されなくなります。型セレクタのデフォルトパターン（`bge-*`）は影響を受けません。

#### `disallowedTypePatterns`

検出対象の型セレクタ（カスタム要素名）パターンを指定します。

```js
// stylelint.config.js
export default {
	extends: ['@burger-editor/stylelint-config'],
	rules: {
		'@burger-editor/no-internal-selector': [
			true,
			{
				disallowedTypePatterns: ['/^bge-/', '/^x-internal-/'],
			},
		],
	},
};
```

指定した場合、デフォルトの型パターン（`bge-*`）は使用されなくなります。属性セレクタのデフォルトパターン（`data-bg[eic]`）は影響を受けません。

#### パターン文字列の書式

パターンは以下の形式で指定できます：

- **正規表現構文**: `/^data-bge/` — スラッシュで囲んだ正規表現（フラグも指定可: `/pattern/i`）
- **プレーン文字列**: `data-bge` — そのまま`new RegExp()`に渡されます

### 検出対象のCSS構文

このルールは以下のすべてのCSS構文内のセレクタを検出します：

- 通常のルール
- `@media`, `@supports`, `@layer`, `@container`内のネストされたルール
- `@scope`のルートセレクタ（リミットは除外）
- CSSネスティング（`&`を含む）
- 上記の任意の組み合わせ（深いネスト）

## ライセンス

Dual Licensed under MIT OR Apache-2.0
