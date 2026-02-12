# CSS カスタムプロパティの検出ルール

`getCustomProperties` / `getCustomProperty` がどのCSSからどの値を検出するかをまとめる。

---

## 基本: 検出されるCSS

`[data-bge-container]` セレクター内の `--bge-options-` で始まるカスタムプロパティが検出される。

```css
/* 検出される */
[data-bge-container] {
	--bge-options-width--normal: 800px;
	--bge-options-width--small: 400px;
	--bge-options-width: var(--bge-options-width--normal);
}

/* 検出されない: セレクターが違う */
.my-class {
	--bge-options-width--normal: 800px;
}
```

結果:

- カテゴリ `width` が作られる。
- 選択肢 `normal: 800px` と `small: 400px` が検出される。
- `--bge-options-width: var(--bge-options-width--normal)` により `normal` がデフォルトになる。

---

## CSS Nesting: 検出される

親セレクターの中にネストされた `[data-bge-container]` も検出される。

```css
/* 検出される: CSS nesting は再帰的に走査される */
.parent {
	[data-bge-container] {
		--bge-options-width--a: 100%;
	}
}

/* 何階層でも検出される */
.grandparent {
	.parent {
		[data-bge-container] {
			--bge-options-width--a: 100%;
		}
	}
}
```

---

## `@layer`: 検出される（優先度に影響する）

`@layer` 内のルールは検出される。レイヤーの宣言順で優先度が決まる。

### 後に宣言されたレイヤーが優先

```css
@layer a, b;

@layer a {
	[data-bge-container] {
		--bge-options-width--x: 100%; /* 低優先度 */
	}
}

@layer b {
	[data-bge-container] {
		--bge-options-width--x: 200%; /* 高優先度 */
	}
}
```

結果: `200%`（`b` は `a` より後に宣言されているので優先）。

### レイヤーなし（unlayered）はレイヤーありより常に優先

```css
@layer a {
	[data-bge-container] {
		--bge-options-width--x: 100%; /* レイヤー内 */
	}
}

[data-bge-container] {
	--bge-options-width--x: 200%; /* レイヤー外 */
}
```

結果: `200%`（unlayered は常に最高優先度）。

### ネストされたレイヤー

```css
@layer x, y;

@layer y {
	@layer p, q;

	@layer q {
		[data-bge-container] {
			--bge-options-width--a: 400%;
		}
	}
}
```

結果: `400%`。親レイヤーの優先度が先に比較され、同じ親内ではサブレイヤーの宣言順で決まる。

### レイヤー順序はスタイルシートごとに独立

```html
<!-- style1 の @layer statement は style2 に影響しない -->
<style>
	@layer a, b;
</style>
<style>
	@layer a {
		[data-bge-container] {
			--bge-options-width--x: 100%;
		}
	}
	@layer b {
		[data-bge-container] {
			--bge-options-width--x: 200%;
		}
	}
</style>
```

結果: `200%`。style2 内の出現順（`a` → `b`）で `b` が優先。style1 の `@layer a, b;` は style2 のレイヤー順序に影響しない。

---

## `@scope`: 検出される（優先度に影響しない）

`@scope` はセレクターの適用範囲を制限するだけで、カスケード優先度は変わらない。中のルールは透過的に検出される。

```css
[data-bge-container] {
	--bge-options-width--a: 100%;
}

/* 検出される: 後に出現するので 200% が採用される */
@scope (.wrapper) {
	[data-bge-container] {
		--bge-options-width--a: 200%;
	}
}
```

結果: `200%`（`@scope` は優先度に影響しないので、単純に後勝ち）。

### `@scope` with limit も同様

```css
@scope (.component) to (.child) {
	[data-bge-container] {
		--bge-options-width--a: 100%;
	}
}
```

結果: `100%`（検出される）。

### `@scope ([data-bge-container])` + `:scope` セレクター

`@scope` のルートが `[data-bge-container]` の場合、内部の `:scope` セレクターもマッチする。

```css
/* 検出される: :scope は @scope のルート（= [data-bge-container]）を指す */
@scope ([data-bge-container]) {
	:scope {
		--bge-options-width--a: 100%;
		--bge-options-width: var(--bge-options-width--a);
	}
}
```

結果: `100%`（検出される）。

```css
/* 検出されない: @scope のルートが [data-bge-container] ではない */
@scope (.other) {
	:scope {
		--bge-options-width--a: 100%;
	}
}
```

結果: 検出されない（`:scope` は `.other` を指すので `[data-bge-container]` と一致しない）。

---

## `@media` / `@supports` / `@container`: 検出されない

条件付き at-rule 内のルールは走査しない。これらはビューポートやコンテナのサイズによって適用が変わるため、静的な検出の対象外としている。

```css
[data-bge-container] {
	--bge-options-width--a: 100%;
}

/* 検出されない */
@media all {
	[data-bge-container] {
		--bge-options-width--a: 200%;
	}
}

/* 検出されない */
@supports (display: grid) {
	[data-bge-container] {
		--bge-options-width--a: 200%;
	}
}

/* 検出されない */
@container (min-width: 0px) {
	[data-bge-container] {
		--bge-options-width--a: 200%;
	}
}
```

結果: すべて `100%`（`@media` / `@supports` / `@container` 内は無視される）。

---

## At-rule の組み合わせ

入れ子にした場合、外側から順に走査可否が判定される。外側が非走査なら、中がどうあれ検出されない。

### 検出される組み合わせ

```css
/* @layer > @scope > selector */
@layer a {
	@scope (.wrapper) {
		[data-bge-container] {
			--bge-options-width--a: 100%; /* 検出される。レイヤー優先度あり */
		}
	}
}

/* @scope > @layer > selector */
@scope (.wrapper) {
	@layer a {
		[data-bge-container] {
			--bge-options-width--a: 100%; /* 検出される。レイヤー優先度あり */
		}
	}
}

/* @layer > CSS nesting > selector */
@layer a {
	.parent {
		[data-bge-container] {
			--bge-options-width--a: 100%; /* 検出される。レイヤー優先度あり */
		}
	}
}
```

### 検出されない組み合わせ

```css
/* @layer > @media: @media で止まる */
@layer a {
	[data-bge-container] {
		--bge-options-width--a: 100%;
	} /* これは検出される */
	@media all {
		[data-bge-container] {
			--bge-options-width--a: 200%;
		} /* これは検出されない */
	}
}
/* 結果: 100% */

/* @media > @layer: @media で止まるので中の @layer にも到達しない */
@media all {
	@layer a {
		[data-bge-container] {
			--bge-options-width--a: 200%;
		} /* 検出されない */
	}
}

/* @scope > @media: @scope は通過するが @media で止まる */
@scope (.wrapper) {
	@media all {
		[data-bge-container] {
			--bge-options-width--a: 200%;
		} /* 検出されない */
	}
}
```

### まとめ

| パターン                         | 検出     | 理由                                  |
| -------------------------------- | -------- | ------------------------------------- |
| `@layer` > `selector`            | される   | `@layer` は走査対象（優先度付き）     |
| `@scope` > `selector`            | される   | `@scope` は走査対象（優先度変化なし） |
| CSS nesting > `selector`         | される   | CSS nesting は走査対象                |
| `@media` > `selector`            | されない | `@media` は走査対象外                 |
| `@supports` > `selector`         | されない | `@supports` は走査対象外              |
| `@container` > `selector`        | されない | `@container` は走査対象外             |
| `@layer` > `@scope` > `selector` | される   | 両方走査対象                          |
| `@scope` > `@layer` > `selector` | される   | 両方走査対象                          |
| `@layer` > `@media` > `selector` | されない | `@media` で止まる                     |
| `@media` > `@layer` > `selector` | されない | `@media` で止まる                     |
| `@scope` > `@media` > `selector` | されない | `@media` で止まる                     |

---

## 同じプロパティが複数箇所で定義された場合

### 同じレイヤー深度なら後勝ち

```css
[data-bge-container] {
	--bge-options-width--a: 100%;
}
[data-bge-container] {
	--bge-options-width--a: 200%;
}
```

結果: `200%`。

### 複数 `<style>` でも同じ

```html
<style>
	[data-bge-container] {
		--bge-options-width--a: 100%;
	}
</style>
<style>
	[data-bge-container] {
		--bge-options-width--a: 200%;
	}
</style>
```

結果: `200%`（両方 unlayered なので後勝ち）。

### レイヤー間ではレイヤー優先度で決まる（出現順は関係ない）

```css
@layer a, b;

/* b が先に書かれているが、宣言順で b > a なので b が勝つ */
@layer b {
	[data-bge-container] {
		--bge-options-width--a: 200%;
	}
}
@layer a {
	[data-bge-container] {
		--bge-options-width--a: 100%;
	}
}
```

結果: `200%`（`@layer a, b;` により `b` が高優先度。コード上の出現順は関係ない）。

---

## デフォルト値の判定

キーなしの変数が `var(--bge-options-[category]--[key])` を参照していると、そのキーがデフォルトになる。

```css
[data-bge-container] {
	--bge-options-width--normal: 800px;
	--bge-options-width--small: 400px;
	--bge-options-width: var(--bge-options-width--normal);
	/*                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ */
	/*                   この参照により normal が isDefault: true になる */
}
```

---

## 選択肢の除外（`null`）

値が文字列 `null` のプロパティは結果から除外される。

```css
[data-bge-container] {
	--bge-options-shadow--none: none;
	--bge-options-shadow--premium: null; /* UIに表示されない */
	--bge-options-shadow: var(--bge-options-shadow--none);
}
```

結果: `shadow` カテゴリには `none` のみ。`premium` は除外される。

---

## コンテナタイプ別のオプション

`_[type]_` プレフィックス付きのカテゴリは、対応するコンテナタイプでのみ検出される。

```css
[data-bge-container] {
	--bge-options-_grid_columns--2: 2;
	--bge-options-_grid_columns--3: 3;
	--bge-options-_grid_columns: var(--bge-options-_grid_columns--3);

	--bge-options-_inline_align--left: left;
	--bge-options-_inline_align--center: center;
	--bge-options-_inline_align: var(--bge-options-_inline_align--left);

	--bge-options-width--normal: 800px;
	--bge-options-width: var(--bge-options-width--normal);
}
```

- `getCustomProperties(doc, 'grid')` → `_grid_columns` と `width` が返る。
- `getCustomProperties(doc, 'inline')` → `_inline_align` と `width` が返る。
- `getCustomProperties(doc)` → `width` のみ。タイプ付きカテゴリは除外される。

---

## `@scope` 未対応ブラウザでの振る舞い

`CSSScopeRule` が存在しない環境では、`@scope` 内のルールは単にスキップされる（エラーにならない）。`@scope` 以外のルールは通常通り検出される。
