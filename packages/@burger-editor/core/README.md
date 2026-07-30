# `@burger-editor/core`

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcore.svg)](https://badge.fury.io/js/@burger-editor%2Fcore)

BurgerEditor のブロック編集エンジンと「HTML 構造契約」を提供するコアパッケージ。ブラウザに依存しない API のみで構成されており、ブラウザ UI を差し替えてもデータ構造とブロック契約は同一に保たれる。

## Installation

```sh
yarn add @burger-editor/core
```

## Related Packages

| パッケージ                    | 関係                                            | このパッケージとの使い分け                                                     |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `@burger-editor/client`       | 依存先（client が core を使う）                 | ブラウザで編集 UI を即組み込むなら client。core 単体だと UI 層は自前実装が必要 |
| `@burger-editor/blocks`       | 依存先（blocks が core の `createItem` を使う） | 標準ブロック / アイテムを使うなら追加。独自アイテムだけなら不要                |
| `@burger-editor/frozen-patty` | 内部依存                                        | core が HTML ⇄ JSON 変換に利用。直接の API 利用は不要                          |
| `@burger-editor/migrator`     | 連携                                            | データバージョン移行を別レイヤーで行う場合に併用                               |

ブラウザで BurgerEditor を組み込む典型ケースは client + blocks + core の 3 点。Node 単体レンダリング・非ブラウザ環境では core を直接使う。

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

CSS Container Queries は **自身を `@container` クエリの対象にできない（`cq*` 単位も自身を参照できない）** 仕様のため、CSS Container を適用させる外側（コンテナ）と、`grid` / `inline` などレイアウトを適用させる内側（コンテナフレーム）を分けている。コンテナには `container-name: bge-container` が付く。

## `data-bge-container` の値仕様

属性値はコロン区切り。先頭がタイプ、続いてオプション。

### `grid`

`display: block grid;`

| オプション    | 効果                                                            |
| ------------- | --------------------------------------------------------------- |
| `1` 〜 `5`    | 固定列数 (`grid-template-columns: repeat(N, minmax(0, 1fr));`)  |
| `auto-fit`    | 自動列数調整（空トラックを折りたたむ）                          |
| `auto-fill`   | 自動列数調整（空トラックを保持）                                |
| `--<variant>` | `auto-fit` / `auto-fill` と併用する折り返し基準サイズプリセット |

例: `grid:3`、`grid:auto-fit:--medium`、`grid:auto-fill:--large`

### `inline`

`display: block flex;`

| オプション       | 対応 CSS                          |
| ---------------- | --------------------------------- |
| `center`         | `justify-content: center;`        |
| `start`          | `justify-content: start;`         |
| `end`            | `justify-content: end;`           |
| `between`        | `justify-content: space-between;` |
| `around`         | `justify-content: space-around;`  |
| `evenly`         | `justify-content: space-evenly;`  |
| `align-center`   | `align-items: center;`            |
| `align-start`    | `align-items: start;`             |
| `align-end`      | `align-items: end;`               |
| `align-stretch`  | `align-items: stretch;`           |
| `align-baseline` | `align-items: baseline;`          |
| `wrap`           | `flex-wrap: wrap;`                |
| `nowrap`         | `flex-wrap: nowrap;`              |

例: `inline:between:wrap`

### `float`

先頭アイテムを `float: inline-start | inline-end;` でテキスト回り込み。

| オプション | 対応 CSS               |
| ---------- | ---------------------- |
| `start`    | `float: inline-start;` |
| `end`      | `float: inline-end;`   |

### 共通オプション

| オプション  | 効果                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `immutable` | アイテムの増減を不可。`grid` では列数変更も不可                                                         |
| `linkarea`  | グループ全体をリンクエリア扱い。各グループに `data-bge-linkarea` 属性が付与され CSS / JS から参照できる |

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

## アイテム

### `data-bge` バインディング DSL

アイテムのテンプレート HTML（`template`）とデータを `data-bge` 属性で紐付ける。エディタ UI は `Editor`（React コンポーネント）が担い、`data-bge` バインディングは使わない。**テンプレート内のフィールド名はケバブケース、TypeScript の型ではキャメルケースに自動変換される**（例: `image-url` ↔ `imageUrl`）。

| 記法                      | 意味                                           |
| ------------------------- | ---------------------------------------------- |
| `data-bge="field"`        | 要素の内容（innerHTML）にバインド              |
| `data-bge="field:attr"`   | `attr` 属性にバインド                          |
| `data-bge=":attr"`        | フィールド名と属性名が同じ場合のショートハンド |
| `data-bge="f1:a1, f2:a2"` | 1 要素に複数バインド                           |
| `data-bge-list` (親要素)  | 子要素を配列データの長さだけ複製               |

`field:attr` の `attr` に指定できる特別な値:

| 特別属性 | 効果                                       |
| -------- | ------------------------------------------ |
| `text`   | テキストノードとしてセット (`textContent`) |
| `html`   | HTML としてセット (`innerHTML`)            |
| `node`   | 要素のタグ名を差し替え                     |

最小例:

```ts
import { createItem } from '@burger-editor/core';

export default createItem<{
	href: string;
	imageUrl: string;
	imageAlt: string;
	text: string;
}>({
	version: '1.0.0',
	name: 'card-link',
	template: `
		<a data-bge=":href, text">
			<img data-bge="image-url:src, image-alt:alt" />
		</a>
	`,
	Editor({ state, setState }) {
		return (
			<>
				<TextField
					label="リンク先"
					value={state.href ?? ''}
					onChange={(href) => setState({ ...state, href })}
				/>
				<TextField
					label="テキスト"
					value={state.text ?? ''}
					onChange={(text) => setState({ ...state, text })}
				/>
			</>
		);
	},
});
```

`Editor` は React コンポーネント（型付き props: `state` / `setState` / `config` / `engine` / `item`）。フォーム部品は `@burger-editor/client/ui` の `TextField` / `SelectField` / `Checkbox` などを利用できる。ボタンを置く場合は Invoker Commands API（`command`/`commandfor`）で宣言する — click ハンドラは禁止。

### `createItem` の引数

| プロパティ      | 型 / 役割                                                                          |
| --------------- | ---------------------------------------------------------------------------------- |
| `version`       | `string` — アイテムのバージョン                                                    |
| `name`          | `string` — アイテムの一意な名前                                                    |
| `template`      | `string` — 表示用 HTML テンプレート（`data-bge` バインディング）                   |
| `style`         | `string` — アイテム専用 CSS（オプション）                                          |
| `Editor`        | React コンポーネント — エディタ UI（controlled form）                              |
| `toEditorState` | `(data, config) => E` — エディタを開く際に保存データをエディタ状態へ変換する純関数 |
| `toItemData`    | `(state, config) => T` — 保存時にエディタ状態を保存データへ変換する純関数          |
| `editorOptions` | オブジェクト — 非エディタ系フック（現在は `isDisable(item): string` のみ）         |

### アイテムのライフサイクル

1. **作成**: `Item.create()` または `render()` でアイテム生成
2. **初期化**: `init()` で初期データ反映
3. **エディタを開く**: UI 層が `engine.uiState.openItemEditor(item)` → `toEditorState(data, config)` で初期状態を導出し `Editor` をレンダリング
4. **編集**: controlled inputs で `state` を更新
5. **保存**: 決定ボタン（フォーム submit）→ `toItemData(state, config)` → `item.import(data)` → 保存

### `dangerouslySetInnerHTML`

アイテムデータは既定で XSS サニタイズされる。データに `dangerouslySetInnerHTML: true` を含めるとそのアイテムのすべてのデータが**サニタイズ無し**で挿入される。

> **警告**: XSS 攻撃の原因になり得る。信頼できるソースから来る HTML にのみ使用すること。

## カスタムブロックカタログ

ブロックカタログは `BlockCatalog` / `CatalogItem` / `BlockDefinition` の 3 型で定義する。

| 型                | 役割                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `BlockCatalog`    | カテゴリ単位でブロック定義を束ねるルート構造                            |
| `CatalogItem`     | カタログ内の 1 ブロックエントリ（表示名・サムネイル・実体定義への参照） |
| `BlockDefinition` | ブロック自体の構造（コンテナ / グループ / アイテムの並び）              |

各アイテム実体は `createItem(...)` で作成する。標準アイテム一式は [`@burger-editor/blocks`](../blocks/) が提供。型の詳細フィールドは型定義（`.d.ts`）を IDE 補完で参照。

## エディタエンジン

```ts
import { BurgerEditorEngine } from '@burger-editor/core';
```

UI 抽象（`BurgerEditorEngineOptions.view` / `defineCustomElement`）を差し替え可能にして、プラットフォームごとに別の UI を載せられる設計（ブラウザ用は [`@burger-editor/client`](../client/)）。`view`（`BurgerEditorView`）はエンジンが UI に要求する唯一の注入点で、`createAreaHost()` が編集エリアごとのホスト UI を生成し、コンテンツを載せる `containerElement` だけをエンジンに返す。詳細は [ARCHITECTURE.md](../../ARCHITECTURE.md) の「headless core と宣言的 UI」を参照。

### `config`

`BurgerEditorEngineOptions.config` で渡す。

| プロパティ                 | 型                                                              | 用途                                                                                                                           |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `classList`                | `string[]`                                                      | エディタ領域のルートに付与する CSS クラス                                                                                      |
| `stylesheets`              | `readonly { readonly path: string; readonly layer?: string }[]` | 読み込むスタイルシート。`layer` で CSS カスケードレイヤーを指定                                                                |
| `sampleImagePath`          | `string`                                                        | プレビュー用サンプル画像のパス                                                                                                 |
| `sampleFilePath`           | `string`                                                        | プレビュー用サンプルファイルのパス                                                                                             |
| `googleMapsApiKey`         | `string \| null`                                                | Google Maps アイテム用 API キー                                                                                                |
| `experimental.itemOptions` | オブジェクト                                                    | 実験的なアイテム別オプション（将来の破壊的変更あり）。`wysiwyg.enableTextOnlyMode`、`button.{kinds,beforeIcons,afterIcons}` 等 |

### `CSS_LAYER` 定数

`stylesheets[].layer` に渡すためのカスケードレイヤー定数。優先順位は下に行くほど高い。

```ts
export const CSS_LAYER = {
	base: 'bge-component-bases', // 一般 CSS / アイテムのベース
	components: 'bge-components', // ブロックコンポーネント
	ui: 'bge-ui', // UI（最高優先度）
} as const;
```

### 主な API 一覧

| 名前                          | 種別   | 役割                                           |
| ----------------------------- | ------ | ---------------------------------------------- |
| `BurgerEditorEngine`          | クラス | 編集エンジン本体。プラットフォーム非依存の中核 |
| `BurgerEditorEngineOptions`   | 型     | エンジン初期化引数                             |
| `createItem`                  | 関数   | アイテム定義のファクトリ                       |
| `render`                      | 関数   | 編集なしでブロックデータを DOM へ変換          |
| `exportStyleOptions`          | 関数   | エクスポート時のスタイル制御オプション組立     |
| `NoEditableAreaError`         | クラス | 編集対象領域が見つからない場合の例外           |
| block-ops 各種                | 関数群 | ブロック単位の移動・複製・削除等の操作         |
| Front Matter ユーティリティ   | 関数群 | コンテンツ前後メタ情報のパース / シリアライズ  |
| HTML detection ユーティリティ | 関数群 | コンテンツ文字列の判定 / 正規化                |

シグネチャ詳細は型定義（`.d.ts`）を IDE 補完で参照。

## `render`（編集なしレンダリング）

```ts
import { render } from '@burger-editor/core';

const el = await render(blockData, { items, config });
```

エディタエンジンなしでブロックデータを DOM 要素に変換する関数。

| 用途           | `render`                            | `BurgerEditorEngine` |
| -------------- | ----------------------------------- | -------------------- |
| 編集 UI        | なし                                | あり                 |
| 想定シーン     | プレビュー / 静的生成 / メール HTML | コンテンツ編集       |
| パフォーマンス | 軽量                                | 重い                 |

## `HealthMonitor`（サブパス: `@burger-editor/core/health`）

```ts
import { HealthMonitor } from '@burger-editor/core/health';
```

サーバーの接続状態を定期的に監視し、オンライン / オフラインの遷移をコールバックで通知するユーティリティ。

| プロパティ    | 型                       | デフォルト         | 役割                                             |
| ------------- | ------------------------ | ------------------ | ------------------------------------------------ |
| `enabled`     | `boolean`                | `true`             | 監視を有効化するか                               |
| `interval`    | `number` (ms)            | `30000`            | ヘルスチェック実行間隔                           |
| `retryCount`  | `number`                 | `3`                | オフライン判定までの連続失敗回数                 |
| `checkHealth` | `() => Promise<boolean>` | （必須・既定なし） | 実際の疎通判定関数。`true` でオンライン扱い      |
| `onOffline`   | `() => void`             | （任意）           | オンライン → オフライン遷移時に 1 度だけ呼ばれる |
| `onOnline`    | `() => void`             | （任意）           | オフライン → オンライン遷移時に 1 度だけ呼ばれる |

## License

Dual Licensed under MIT OR Apache-2.0
