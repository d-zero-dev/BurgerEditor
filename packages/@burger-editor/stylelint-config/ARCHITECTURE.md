# Architecture

`@burger-editor/stylelint-config`の内部構造について説明します。

## ファイル構成

```
src/
├── index.ts        # デフォルト設定のエクスポート
├── plugin.ts       # Stylelintプラグイン本体
└── index.spec.ts   # テストスイート
```

## エクスポート構造

package.jsonで2つのエントリポイントを公開しています：

| エクスポート | ファイル | 用途 |
| --- | --- | --- |
| `.`（メイン） | `index.ts` | デフォルト設定（`extends`用） |
| `./plugin` | `plugin.ts` | プラグイン単体（個別設定用） |

### `index.ts`

プラグインを組み込み済みの設定オブジェクトをエクスポートします。ユーザーは`extends`に指定するだけで使用できます。

### `plugin.ts`

Stylelintプラグインの実装本体です。`stylelint.createPlugin()`でプラグインを生成します。

## プラグインの処理フロー

```
1. オプションのバリデーション（validateOptions）
   ↓
2. パターンの決定（カスタム or デフォルト）
   ↓
3. root.walkRules() — 全CSSルールのセレクタをチェック
   ↓
4. root.walkAtRules('scope') — @scopeのルートセレクタをチェック
```

### 1. オプションバリデーション

`validateOptions`でプライマリオプション（`true`）とセカンダリオプション（`disallowedAttrPatterns`, `disallowedTypePatterns`）を検証します。セカンダリオプションは任意です。

### 2. パターン決定

カスタムパターンが指定された場合、そのカテゴリのデフォルトパターンを**置き換え**ます。もう一方のカテゴリには影響しません。

- `disallowedAttrPatterns`指定あり → 属性パターンのみカスタム、型パターンはデフォルト
- `disallowedTypePatterns`指定あり → 型パターンのみカスタム、属性パターンはデフォルト
- 両方指定あり → 両方カスタム
- 両方未指定 → 両方デフォルト

デフォルトパターン:

- 属性: `/^data-bg[eic]/` — `data-bge`, `data-bgi`, `data-bgc`で始まる属性
- 型: `/^bge-/` — `bge-`で始まるカスタム要素

### 3. セレクタチェック（`checkSelector`）

`postcss-selector-parser`でセレクタ文字列をASTにパースし、全ノードを走査します：

- **`attribute`ノード**: `selectorNode.attribute`（属性名のみ）をパターンと照合
- **`tag`ノード**: `selectorNode.value`（要素名）をパターンと照合

マッチした場合、`stylelint.utils.report()`で警告を報告します。

### 4. `@scope`の処理

`@scope`はCSS at-ruleの中で唯一、パラメータにCSSセレクタを含みます。

```css
@scope (ルートセレクタ) to (リミットセレクタ) { ... }
```

- **ルートセレクタ**: 検出対象（`extractScopeRootSelector`で最初の`(...)`を抽出）
- **リミットセレクタ**: 許可（スコープ境界の定義に使われるため）
- **ボディ内のルール**: `walkRules()`で通常通り検出

## ユーティリティ関数

### `toRegExp(pattern)`

文字列パターンを`RegExp`に変換します。

- `RegExp`インスタンス → そのまま返却
- `/pattern/flags`形式の文字列 → `new RegExp(pattern, flags)`
- それ以外の文字列 → `new RegExp(pattern)`

### `matchesAny(value, patterns)`

値がいずれかのパターンにマッチするか判定します。

### `extractScopeRootSelector(params)`

`@scope`パラメータからルートセレクタを抽出します。正規表現`/^\s*\(([^)]+)\)/`で最初の括弧内の内容を取得します。`to (...)`のリミット部分は無視されます。

## テスト構造

テストは`stylelint.lint()`を使用した統合テストとして実装されています。

| ヘルパー | 用途 |
| --- | --- |
| `lint(code)` | デフォルト設定（`index.ts`経由）でリント |
| `lintWithOptions(code, ruleOptions)` | プラグイン直接使用でオプション指定リント |

テストケースのカテゴリ：

1. 属性セレクタの検出（`data-bge`, `data-bgi`, `data-bgc`系）
2. 属性セレクタ演算子（`~=`, `|=`, `^=`, `$=`, `*=`, `i`フラグ）
3. 型セレクタの検出（`bge-*`）
4. 複合セレクタ（擬似クラス、擬似要素、結合子）
5. `@scope`（ルート検出、リミット許可、ネスト）
6. ネストされたat-rule（`@media`, `@supports`, `@layer`, `@container`）
7. CSSネスティング（`&`、深いネスト、`@media`との組み合わせ）
8. 許可されるセレクタ（非BurgerEditorセレクタ）
9. ルール無効化（`false`）
10. カスタムオプション（パターン置き換え、部分指定、組み合わせ）
