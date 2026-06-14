# `@burger-editor/core`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcore.svg)](https://badge.fury.io/js/@burger-editor%2Fcore)

ブロックエディタのコア。ブロック / アイテムの **HTML 構造契約**、エディタエンジン、UI コンポーネントを提供する。プラットフォーム非依存（ブラウザ / Node どちらでも動く）。

## Installation

```sh
yarn add @burger-editor/core
```

## ブロックの HTML 構造

```html
<div data-bge-name="<ブロック名>" data-bge-container="<タイプ>:<オプション...>">
	<div data-bge-container-frame>
		<div data-bge-group>
			<div data-bge-item><!-- アイテム1 --></div>
			<div data-bge-item><!-- アイテム2 --></div>
		</div>
		<div data-bge-group>...</div>
	</div>
</div>
```

### 要素

| 属性                       | 役割                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| `data-bge-name`            | ブロック名（選択 UI 用、振る舞いには影響しない。**スタイル変更には使わない**）    |
| `data-bge-container`       | コンテナのタイプ + オプション（`grid` / `inline` / `float`）                      |
| `data-bge-container-frame` | コンテナフレーム — `grid` / `inline` を実際に適用する内側ラッパー                 |
| `data-bge-group`           | グループ — 「要素の追加 / 削除」で **増減する単位**（無いとこの機能が無効になる） |
| `data-bge-item`            | アイテム — コンテンツ編集可能な要素のラッパー                                     |

### なぜコンテナとコンテナフレームを分けるか

CSS Container Queries は **自身に再帰的にクエリ / `cq` 単位を使えない**仕様があるため、CSS Container を適用させる外側（コンテナ）と、`grid` / `inline` などレイアウトを適用させる内側（コンテナフレーム）を分けている。コンテナには `container-name: bge-container` が付く。

### コンテナタイプ

- `grid` — `display: block grid;` 。列数指定（1-5）、`auto-fit` / `auto-fill`（折り返し基準インラインサイズプリセット `--bge-repeat-min-inline-size--<variant>` と組み合わせる）
- `inline` — `display: block flex;` 。`justify-content` / `align-items` / `flex-wrap` 制御
- `float` — 先頭アイテムを `float: inline-start | inline-end;` でテキスト回り込み

### 共通オプション

- `immutable` — アイテムの増減を不可、`grid` タイプでは列数変更も不可
- `linkarea` — グループ全体をリンクエリア扱い（各グループに `data-bge-linkarea` 属性が付与される）

### `auto-fit` / `auto-fill` のカスタムプリセット

CSS カスタムプロパティ `--bge-repeat-min-inline-size--<variant>` で折り返し基準サイズを定義する。デフォルトは `--small` (150px) / `--medium` (300px) / `--large` (500px)。プロジェクト独自のプリセットを追加する場合、**値定義に加えて `data-bge-container` 属性からプロパティをマップするセレクタも必要**（`general.css` のデフォルト 3 種はマップ済み）:

```css
:where([data-bge-container='grid'], [data-bge-container^='grid:']) {
	--bge-repeat-min-inline-size--x-small: 100px;

	&:where([data-bge-container$=':--x-small'], [data-bge-container*=':--x-small:'])
		:where([data-bge-container-frame]) {
		--bge-repeat-min-inline-size: var(--bge-repeat-min-inline-size--x-small);
	}
}
```

## カスタムブロックカタログ

`BlockCatalog` / `CatalogItem` / `BlockDefinition` で定義する。詳細な型定義は `src/types.ts` を参照。各アイテムは `createItem(...)` で作成（標準アイテムは [`@burger-editor/blocks`](../blocks/) が提供）。

## エディタエンジン

```ts
import { BurgerEditorEngine } from '@burger-editor/core';
```

UI 抽象（`ui` / `blockMenu` / `initialInsertionButton` / `defineCustomElement`）を差し替え可能にして、プラットフォームごとに別の UI を載せられる設計（ブラウザ用は [`@burger-editor/client`](../client/)）。

詳細な API（`createItem` / `BurgerEditorEngineOptions` / `exportStyleOptions` / block-ops / Front Matter / HTML detection / `NoEditableAreaError` 等）は型定義および各 src ファイルの JSDoc を参照。

## License

Dual Licensed under MIT OR Apache-2.0
