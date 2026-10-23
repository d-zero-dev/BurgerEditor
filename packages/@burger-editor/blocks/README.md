# `@burger-editor/blocks`

BurgerEditor の標準ブロックと標準アイテムを提供するカタログパッケージ。

ブロック構造の仕様自体は [`@burger-editor/core`](../core/) が定義し、blocks はその上に「すぐ使えるカタログ」を載せる位置づけ。

## Installation

```sh
yarn add @burger-editor/blocks
```

## Usage

2 つのエントリがある。

| エントリ                       | 内容                                                                              | 実行環境                   | React |
| ------------------------------ | --------------------------------------------------------------------------------- | -------------------------- | ----- |
| `@burger-editor/blocks`        | `items`（`Editor` なしの定義）/ `defaultCatalog` / `legacyCatalog` / `generalCSS` | Node.js / ブラウザ         | 不要  |
| `@burger-editor/blocks/editor` | `items`（`Editor` 付き）                                                          | ブラウザ（エディタ UI 用） | 必要  |

### Node.js・設定ファイル（`burgereditor.config.js` など）

```ts
import { items, defaultCatalog } from '@burger-editor/blocks';

const wysiwygItem = items.wysiwyg;
const catalog = defaultCatalog;
```

### ブラウザのエディタ UI

`@burger-editor/client` の `createBurgerEditorClient` に渡す `items` は、`Editor` を含むこちらを使う。

```ts
import { generalCSS } from '@burger-editor/blocks';
import { items } from '@burger-editor/blocks/editor';
```

`@burger-editor/blocks/editor` は `react` と `react-dom`（どちらも 19.3.0）を peerDependencies に持つ（optional）。利用側でインストールするか、アプリのバンドルに 1 つだけ含める。ルートエントリは React を必要としない。

## Related Packages

| パッケージ                            | 関係                                               | 使い分け                                               |
| ------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| [`@burger-editor/core`](../core/)     | ブロック / アイテムの**仕様**を定義                | 仕様や `createItem` を直接触るなら core も必要         |
| [`@burger-editor/css`](../css/)       | blocks の CSS を 1 ファイルに統合した CDN 用配布   | 表示専用サイトなら css 単独で足りる（blocks は不要）   |
| [`@burger-editor/client`](../client/) | エディタ UI。blocks をデフォルトカタログとして利用 | エディタ UI を組み込むなら client が blocks を引き込む |
| [`@burger-editor/local`](../local/)   | ローカル CMS サーバー                              | サーバー経由で使うなら local が blocks を引き込む      |

## 提供アイテム

`items` から個別に import するか、`defaultCatalog` 経由でブロックの構成要素として利用する。実装は `src/items/*` を参照。

| key             | 用途                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `button`        | ボタン                                                                           |
| `carousel`      | カルーセル（複数のスライド画像。各スライドは `image` と同じ項目）                |
| `details`       | 折りたたみ要素                                                                   |
| `download-file` | ダウンロードファイル                                                             |
| `google-maps`   | Google Maps 埋め込み                                                             |
| `hr`            | 水平線                                                                           |
| `image`         | 画像                                                                             |
| `import`        | 他ファイルから HTML を取り込むインポートブロック用（`enableImportBlock` で制御） |
| `table`         | テーブル                                                                         |
| `title-h2`      | 大見出し（h2）                                                                   |
| `title-h3`      | 中見出し（h3）                                                                   |
| `wysiwyg`       | リッチテキストエディタ                                                           |
| `youtube`       | YouTube 動画埋め込み                                                             |

`carousel` の全体設定（自動再生・ループ・矢印・ドット・切り替え効果）は、ラッパーの `data-bge-*` 属性として保存する。表示枚数だけは、CSS が計算に使えるよう、ラッパーの `style` の `--per-view` として保存する（サイトの CSS で上書きすると、runtime もその値に従う）。同梱の CSS だけで、スライドが横に並び、1 枚ずつスナップしてスクロールする。`::scroll-button()` / `::scroll-marker` に対応したブラウザでは、矢印とドットも CSS だけで表示する。自動再生・ループ・フェードと、未対応ブラウザの矢印・ドットは [`@burger-editor/runtime`](../runtime/README.md) が補う。

`image` と `carousel` は、リンクやボタンの名前と、スライド（ドット）の名前を作者の入力から付けるため、編集画面の「決定」が次の入力を拒み、理由を表示する。

- リンク先 URL かポップアップのある `image` は、代替テキスト（alt）が必須。`alt=""` は装飾的な画像を意味し、リンクやボタンの名前にならない
- `carousel` の各スライドは、キャプションか代替テキストのどちらかが必須（リンク・ポップアップのスライドは alt が必須）
- すでに保存された HTML は、開くだけでは変わらない。そのアイテムを編集して「決定」するときに、名前を入れる
- エージェント経由の書き込み（`item_update` など）は、この検査を通らない

## デフォルトカタログ

`defaultCatalog` は以下のカテゴリ構成。実装は `src/catalogs/*` を参照。

### 見出し

| ラベル   | name (block) | 使用アイテム |
| -------- | ------------ | ------------ |
| 大見出し | `h2`         | `title-h2`   |
| 中見出し | `h3`         | `title-h3`   |

### 基本ブロック

| ラベル     | name (block) | 使用アイテム |
| ---------- | ------------ | ------------ |
| テキスト   | `wysiwyg`    | `wysiwyg`    |
| 画像       | `image`      | `image`      |
| カルーセル | `carousel`   | `carousel`   |
| 折りたたみ | `disclosure` | `details`    |
| テーブル   | `table`      | `table`      |
| YouTube    | `youtube`    | `youtube`    |

### カード

| ラベル                 | name (block)      | 構成                                        |
| ---------------------- | ----------------- | ------------------------------------------- |
| 画像 + テキスト        | `image-text`      | `image` + `wysiwyg` を 3 列グリッドで並べる |
| テキスト+画像+テキスト | `text-image-text` | `wysiwyg`+`image`+`wysiwyg` を 3 列グリッド |

### 画像+テキスト

| ラベル                           | name (block)             | レイアウト                              |
| -------------------------------- | ------------------------ | --------------------------------------- |
| 画像右寄せ: テキスト回り込み     | `text-float-image-end`   | `float: end`（画像が右に浮動）          |
| 画像左寄せ: テキスト回り込み     | `text-float-image-start` | `float: start`（画像が左に浮動）        |
| 画像右寄せ: テキスト回り込み無し | `text-start-image-end`   | テキスト → 画像（左右配置・回り込み無） |
| 画像左寄せ: テキスト回り込み無し | `image-start-text-end`   | 画像 → テキスト（左右配置・回り込み無） |

### ボタン

| ラベル                   | name (block)         | 構成                                                   |
| ------------------------ | -------------------- | ------------------------------------------------------ |
| ボタン                   | `button`             | `button` を 3 つ横並び                                 |
| テキストリンク           | `button`             | リンク形式の `button` を 3 つ（`<ul>` セマンティクス） |
| ファイルダウンロード     | `file`               | `download-file` を 3 つ横並び                          |
| コンテンツナビゲーション | `content-navigation` | ページ内リンク `button` を 4 列グリッドで 8 つ         |

### その他

| ラベル      | name (block)  | 使用アイテム  |
| ----------- | ------------- | ------------- |
| Google Maps | `google-maps` | `google-maps` |
| 区切り線    | `hr`          | `hr`          |

## CSS

各アイテムは個別の `style.css` を持つ。すべて統合した CSS を読み込みたい場合は [`@burger-editor/css`](../css/) を使う。

### `general.css` の DOM 契約

`general.css` はブロック全体の基本スタイルを定義し、以下のセレクタ／カスタムプロパティを「契約」として露出する。利用側 CSS はこの契約に依存して上書き／拡張できる。

| セレクタ / 変数                           | 役割                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `[data-bge-container]`                    | ブロックコンテナ。レイアウト・余白・背景色などの基本スタイルを担う   |
| `grid`                                    | CSS 変数ベースのグリッド（auto-fit / auto-fill 対応）                |
| `inline`                                  | Flexbox ベースの横並びレイアウト                                     |
| `float`                                   | テキスト回り込みレイアウト                                           |
| `[data-bgc-flex-box]`                     | Wysiwyg 内の横並び Flexbox                                           |
| `[data-bgc-align]`                        | Wysiwyg 内段落の左寄せ／中央寄せ／右寄せ                             |
| `--bge-repeat-min-inline-size--{variant}` | グリッドの折り返し基準インラインサイズのプリセット（variant で切替） |

## スタイルオプション（`--bge-options-*`）

ブロックオプションダイアログの「ブロックのスタイル拡張」に並ぶプルダウンは、CSS カスタムプロパティから自動生成される。選択肢を増やす・減らす・値を変えるのはすべて CSS 側で行う。

### 宣言の形

```css
[data-bge-container] {
	--bge-options-margin--none: 0; /* 選択肢: --bge-options-{カテゴリ}--{値名} */
	--bge-options-margin--normal: 3rem;
	--bge-options-margin--large: 8rem;
	--bge-options-margin: var(--bge-options-margin--normal); /* 既定値 */
}

:where([data-bge-container]) {
	margin-block-end: var(--bge-options-margin); /* 実際に効かせる箇所 */
}
```

- `--bge-options-{カテゴリ}--{値名}` が 1 つの選択肢になり、カテゴリごとに 1 つのプルダウンにまとまる（表示は `値名 (値)`）
- `--bge-options-{カテゴリ}: var(--bge-options-{カテゴリ}--{値名})` が参照している値名が既定値になる。既定値を選んだブロックには何も書き込まれず、CSS の既定値に従う
- 既定値以外を選ぶと、ブロックのコンテナ要素に `style="--bge-options-{カテゴリ}: var(--bge-options-{カテゴリ}--{値名})"` が書き込まれる。そのため **変数を宣言するだけでは見た目は変わらない**。`var(--bge-options-{カテゴリ})` を使うスタイルも書くこと
- カテゴリ名・値名には `--` を含めず、カテゴリ名の末尾を `-` にしない（`--` でカテゴリ名と値名を区切るため、`--` を 2 つ以上含む名前は選択肢に出ない。カテゴリ名の末尾が `-` だと区切り位置がずれ、選んでも保存後に読み戻せない）

### 標準で用意されているカテゴリ

`general.css` は以下を宣言し、スタイルも実装済み。値は `src/general.css` を参照。

| カテゴリ            | 値名（太字が既定値）                                         | 対象                         |
| ------------------- | ------------------------------------------------------------ | ---------------------------- |
| `max-width`         | **`normal`** / `small` / `large` / `full`                    | コンテナの最大インライン幅   |
| `margin`            | **`normal`** / `none` / `small` / `large`                    | ブロック下の余白             |
| `bg-color`          | **`transparent`** / `white` / `gray` / `blue` / `red`        | 背景色                       |
| `padding-block`     | **`none`** / `small` / `medium` / `large`                    | 上下の内側余白               |
| `padding-inline`    | **`default-gutter`** / `none` / `small` / `medium` / `large` | 左右の内側余白               |
| `column-gap`        | **`normal`** / `none` / `small` / `large`                    | 列間                         |
| `row-gap`           | **`normal`** / `none` / `small` / `large`                    | 行間                         |
| `_grid_subgrid-gap` | **`normal`** / `none` / `small` / `large`                    | グリッド内サブグリッドの間隔 |

### 独自の値・カテゴリを追加する

エディタに読み込ませるプロジェクト CSS（設定の `stylesheets`）に同じ形で書く。`stylesheets` は既定で `general.css` より優先度の高いカスケードレイヤーに入るため、同名の変数を書けば値を上書きでき、新しい値名を書けば選択肢が増える。

```css
[data-bge-container] {
	/* 既存カテゴリに値を追加 */
	--bge-options-bg-color--brand: #eef;

	/* 新しいカテゴリ */
	--bge-options-shadow--none: none;
	--bge-options-shadow--subtle: 0 1px 3px rgb(0 0 0 / 12%);
	--bge-options-shadow: var(--bge-options-shadow--none);
}

:where([data-bge-container]) {
	box-shadow: var(--bge-options-shadow);
}
```

### 選択肢を消す（空値）

値を空にした選択肢はプルダウンから除外される。標準の選択肢を隠したいときに使う。

```css
[data-bge-container] {
	--bge-options-bg-color--red: ; /* コロンとセミコロンの間に半角スペースが必須 */
}
```

`--bge-options-bg-color--red:;` のようにスペースを空けないと宣言自体がパースエラーで無視され、選択肢は消えない。

### コンテナタイプ専用のカテゴリ

カテゴリ名を `_grid_` / `_inline_` / `_float_` で始めると、そのコンテナタイプのブロックでだけ表示される（プルダウンのラベルには接頭辞を除いた名前が出る）。

```css
[data-bge-container] {
	--bge-options-_grid_align-items--stretch: stretch;
	--bge-options-_grid_align-items--center: center;
	--bge-options-_grid_align-items: var(--bge-options-_grid_align-items--stretch);
}

:where([data-bge-container='grid'], [data-bge-container^='grid:'])
	:where([data-bge-container-frame]) {
	align-items: var(--bge-options-_grid_align-items);
}
```

### エディタが検出する宣言・しない宣言

エディタはページに読み込まれたスタイルシートを走査し、セレクタが `[data-bge-container]` そのものであるルールの宣言だけを拾う。

- 検出する: `[data-bge-container] { … }`、CSS Nesting で親の中に書いた `.parent { [data-bge-container] { … } }`、`@layer` / `@scope` の中のルール、`@scope ([data-bge-container]) { :scope { … } }`
- 検出しない: `.parent [data-bge-container]` や `:where([data-bge-container])` のように `[data-bge-container]` 以外を含むセレクタ、`@media` / `@supports` / `@container` の中のルール
- 同じ変数が複数箇所にあるときは CSS のカスケードと同じく、上位のカスケードレイヤー → 後に書かれたものが勝つ。既定値の指定も同様で、親セレクタの中にネストした指定であっても上位レイヤーにあればそちらが既定値になる（同じレイヤーなら `[data-bge-container]` 直下の指定が優先）

### 折り返し基準インラインサイズのプリセット

グリッドの auto-fit / auto-fill で使う折り返し基準幅は、`--bge-options-*` とは別の `--bge-repeat-min-inline-size--{プリセット名}` で宣言する。標準は `small` / **`medium`** / `large`。検出の規則は上と同じだが、空値の選択肢は除外されない。

プリセットを追加する場合、変数の宣言に加えて、選択結果（`data-bge-container` 属性値の `--{プリセット名}`）をグリッドに反映するセレクタも書く必要がある。`general.css` が持つのは `small` / `medium` / `large` の分だけ。

```css
[data-bge-container] {
	--bge-repeat-min-inline-size--x-large: 800px;
}

:where([data-bge-container='grid'], [data-bge-container^='grid:']) {
	&:where([data-bge-container$=':--x-large'], [data-bge-container*=':--x-large:'])
		:where([data-bge-container-frame]) {
		--bge-repeat-min-inline-size: var(--bge-repeat-min-inline-size--x-large);
	}
}
```

## カスタムアイテム

[`@burger-editor/core`](../core/) の `createItem` を使う。

## License

Dual Licensed under MIT OR Apache-2.0
