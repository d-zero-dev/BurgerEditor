# `@burger-editor/css`

BurgerEditor で作成したページを公開サイトで表示するための CSS。公開ページでこの CSS を読み込むと、ブロックがグリッド・横並び・回り込みでレイアウトされ、画像・カルーセル・テーブルなどのアイテムに既定のスタイルが適用される。

内容は、[`@burger-editor/blocks`](../blocks/)の`general.css`と各アイテムの`style.css`を 1 ファイルに統合したもの。本パッケージの CSS は、エディタの JavaScript に依存しない。画像のポップアップやカルーセルの自動再生などの動作が必要な場合は、[`@burger-editor/runtime`](../runtime/)も読み込む。カルーセルでは、ランタイムと同じ版の本パッケージを読み込む必要がある（ランタイムは、本パッケージの CSS が計算した表示枚数を参照し、矢印の記号の描画も本パッケージの CSS に任せるため）。

## Installation

```sh
yarn add @burger-editor/css
```

## Usage

プロジェクトの CSS から`@import`し、バンドラー（Vite など）が`style`条件（`package.json`の`exports`）で解決して統合する。

```css
@import '@burger-editor/css';
```

## Related Packages

| パッケージ                            | 関係                                               | 使い分け                                       |
| ------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| [`@burger-editor/blocks`](../blocks/) | CSS の一次ソース（本パッケージはここから統合生成） | 表示のみの用途では本パッケージのみで十分       |
| [`@burger-editor/core`](../core/)     | DOM 契約（`[data-bge-container]`等）の定義元       | 表示のみの用途では不要                         |
| [`@burger-editor/client`](../client/) | エディタ UI。`blocks`の CSS を直接参照             | エディタ UI を組み込む場合、本パッケージは不要 |

## 仕組み

公開ページの表示は、次の 3 つで決まる。

1. **BurgerEditor**（編集画面）は、作者が選択した設定を HTML の属性（`data-bge-container`など）と`style`属性に出力する
2. **本パッケージの CSS** は、その属性を参照して既定のスタイルを適用する
3. **プロジェクトの CSS** は、本パッケージの CSS の既定のスタイルを上書きする

カルーセルでは、ランタイム（[`@burger-editor/runtime`](../runtime/)）が公開ページで操作部品（矢印・ドット・再生ボタン）を生成し、属性を追加する。本パッケージの CSS は、それらにも既定のスタイルを適用する。

プロジェクトの CSS を`burgereditor.config.js`の`stylesheets`に追加すると、編集画面のプレビューにもプロジェクトの CSS が適用される。また、プロジェクトの CSS で宣言した変種（「ブロックのスタイル拡張の軸」を参照）が、編集画面の選択肢に表示される。

## ブロックのレイアウト

### HTML の構造

BurgerEditor は、ブロックを次の構造で保存する。

```html
<div
	data-bge-name="image3"
	data-bge-container="grid:3"
	class="（編集画面の「独自class設定」）"
	id="bge-（編集画面の「ID設定」）"
	style="--bge-options-margin: var(--bge-options-margin--large)">
	<div data-bge-container-frame>
		<div data-bge-group>
			<div data-bge-item>
				<div data-bgi="image"><!-- アイテムの内容 --></div>
			</div>
		</div>
		<!-- グループの数だけ data-bge-group が繰り返される -->
	</div>
</div>
```

| 要素                         | 役割                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `[data-bge-container]`       | ブロック全体。本パッケージの CSS は、この要素に余白・最大幅・背景色を適用する                             |
| `[data-bge-container-frame]` | グループを配置する要素。本パッケージの CSS は、この要素にグリッド・横並び・回り込みのレイアウトを適用する |
| `[data-bge-group]`           | 1 列分のグループ。アイテムが縦方向に配置される                                                            |
| `[data-bge-item]`            | アイテム 1 つを格納する要素                                                                               |
| `[data-bgi]`                 | アイテムの内容。値はアイテム名（`image`・`carousel`など）                                                 |

### 編集画面の設定と HTML

作者がブロックオプションで選択した値を、BurgerEditor は次のように出力する。BurgerEditor は、`data-bge-container`の値をコロン区切りで連結する（例: `grid:auto-fit:--large`）。

| 編集画面の項目                   | 出力先                                        | 値                                                                                                                                               |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| コンテナタイプ                   | `data-bge-container`の先頭                    | `grid`（グリッド）/ `inline`（横並び）。`float`（左右折り返し）はブロック定義で決まる値で、作者は変更できない                                    |
| 列の自動調整                     | `data-bge-container`                          | 自動調整の場合は`auto-fill`または`auto-fit`。固定列数の場合は出力されない                                                                        |
| 基準列数（固定列数の場合）       | `data-bge-container`                          | `1`〜`5`                                                                                                                                         |
| 折り返し基準幅（自動調整の場合） | `data-bge-container`                          | `--small` / `--medium` / `--large`                                                                                                               |
| 横方向配置（横並びの場合）       | `data-bge-container`                          | `start` / `center` / `end` / `between` / `around` / `evenly`                                                                                     |
| 縦向配置（横並びの場合）         | `data-bge-container`                          | `align-start` / `align-center` / `align-end` / `align-stretch` / `align-baseline`                                                                |
| 回り込み（左右折り返しの場合）   | `data-bge-container`                          | `start` / `end`                                                                                                                                  |
| セマンティック要素               | `data-bge-container`と要素名                  | `ul` / `ol`。選択すると、BurgerEditor は`[data-bge-container-frame]`を`ul`/`ol`に、`[data-bge-group]`を`li`に変換する。`div`の場合は出力されない |
| リンクエリア機能                 | 各`[data-bge-group]`の`data-bge-linkarea`属性 | 有効な場合、BurgerEditor は値のない属性を出力する                                                                                                |
| ブロックのスタイル拡張           | ブロックの`style`属性                         | `--bge-options-<軸>: var(--bge-options-<軸>--<変種>)`。既定の変種を選択した軸は出力されない                                                      |
| 独自class設定                    | ブロックの`class`属性                         | 入力した文字列                                                                                                                                   |
| ID設定                           | ブロックの`id`属性                            | 入力した文字列の先頭に`bge-`を付加したもの                                                                                                       |

`immutable`（作者がコンテナタイプを変更できないブロック）と`wrap`/`nowrap`は、ブロック定義（カタログ）が`data-bge-container`に出力する値で、作者は編集画面で変更できない。

### 本パッケージの CSS が適用するスタイル

#### すべてのブロック

本パッケージの CSS は、`[data-bge-container]`に次のスタイルを適用する。`var()`の値は、本パッケージの CSS がブロックのスタイル拡張の軸（「ブロックのスタイル拡張の軸」を参照）として定義している。

| CSS プロパティ     | 値                                                         |
| ------------------ | ---------------------------------------------------------- |
| `inline-size`      | `100%`                                                     |
| `max-inline-size`  | `var(--bge-options-max-width)`                             |
| `padding-block`    | `var(--bge-options-padding-block)`                         |
| `padding-inline`   | `var(--bge-options-padding-inline)`                        |
| `margin-block-end` | `var(--bge-options-margin)`。親要素内の最後のブロックは`0` |
| `margin-inline`    | `auto`（中央揃え）                                         |
| `background-color` | `var(--bge-options-bg-color)`                              |
| `container`        | `bge-container / inline-size`                              |

`[data-bge-container-frame]`が`ul`/`ol`の場合、本パッケージの CSS はリストの余白とマーカーをリセットする。`li`の`[data-bge-group]`のマーカーもリセットする。

#### グリッド（`grid`）

- 本パッケージの CSS は、`[data-bge-container-frame]`に`display: grid`を適用する
- 固定列数の場合、本パッケージの CSS は列数を`data-bge-container`の数値にする（数値がない場合は 1 列）。本パッケージの CSS は、この数値を`[data-bge-container-frame]`の`--bge-grid-col`に設定する
- `auto-fit`/`auto-fill`の場合、本パッケージの CSS は`repeat(auto-fit, minmax(最小幅, 1fr))`で列を生成し、列数はブラウザがコンテナ幅から決定する。1 列の最小幅は`--bge-repeat-min-inline-size`の値で、既定は`--medium`（300px）。`--small`は 150px、`--large`は 500px。コンテナ幅が最小幅より狭い場合、本パッケージの CSS は最小幅をコンテナ幅まで縮小する（コンテナからはみ出さない）
- 本パッケージの CSS は、列の間隔に`--bge-options-column-gap`、行の間隔に`--bge-options-row-gap`の値を適用する
- 1 つのグループに 1〜8 個の`[data-bge-item]`がある場合、本パッケージの CSS は`[data-bge-group]`を subgrid にする。1 個は既定の span 1、2〜8 個は個数ぶん親の行にまたがる。隣接する列の同じ順番のアイテム（例: 画像の下の見出し）の高さが揃う。9 個以上の場合は subgrid を使わず、グループ内で縦に並べる（隣列との行揃えは行わない）
- 本パッケージの CSS は、`[data-bge-item]`を`bge-item`という名前のコンテナ（`container-type: inline-size`）にする

#### 横並び（`inline`）

- 本パッケージの CSS は、`[data-bge-container-frame]`に`display: flex`と`flex-wrap: wrap`を適用する
- 本パッケージの CSS は、横方向配置を`justify-content`に適用する。指定がない場合は`center`。`between`は`space-between`、`around`は`space-around`、`evenly`は`space-evenly`に対応する
- 本パッケージの CSS は、縦向配置を`align-items`に適用する。指定がない場合は`stretch`。`align-start`/`align-center`/`align-end`/`align-stretch`/`align-baseline`はそれぞれ`start`/`center`/`end`/`stretch`/`baseline`に対応する
- `nowrap`の場合、本パッケージの CSS は`flex-wrap: nowrap`を適用する
- `immutable`のブロックでは、本パッケージの CSS は各グループに`flex: 1 1 auto`を適用する。グループが 2 つで、一方に幅を指定した画像（`[data-bge-scale]`）がある場合は、その画像のグループの幅を固定し、もう一方のグループを伸縮させる
- 間隔には、本パッケージの CSS がグリッドと同じ変数を適用する

#### 左右折り返し（`float`）

- 本パッケージの CSS は、`[data-bge-container-frame]`の最初の子要素（画像のグループ）を、`start`の場合は左、`end`の場合は右に回り込ませる（`float`）。最初の子要素の幅は内容に合わせる（`fit-content`）
- 本パッケージの CSS は、回り込ませた要素とテキストの間隔に`--bge-options-column-gap`の値を適用する
- 本パッケージの CSS は、`[data-bge-container-frame]`の末尾で回り込みを解除する

### ブロックのスタイル拡張の軸

BurgerEditor は、編集画面の「ブロックのスタイル拡張」の選択肢を、`[data-bge-container]`のルールにある`--bge-options-<軸>--<変種>`の宣言から生成する。本パッケージの CSS は、次の軸と変種を宣言している。

| 軸                  | 変種と値                                                                       | 既定の変種       | 用途                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `max-width`         | `small` 25rem / `normal` 50rem / `large` 75rem / `full` 100dvi                 | `normal`         | ブロックの最大幅                                                                                          |
| `margin`            | `none` 0 / `small` 1rem / `normal` 3rem / `large` 8rem                         | `normal`         | ブロックの下の余白                                                                                        |
| `bg-color`          | `transparent` / `white` #fff / `gray` #dfdfdf / `blue` #eaf3f8 / `red` #fcc    | `transparent`    | ブロックの背景色                                                                                          |
| `padding-block`     | `none` 0 / `small` 1rem / `medium` 3rem / `large` 5rem                         | `none`           | ブロックの上下の内側の余白                                                                                |
| `padding-inline`    | `none` 0 / `small` 1rem / `medium` 3rem / `large` 5rem / `default-gutter` 2rem | `default-gutter` | ブロックの左右の内側の余白                                                                                |
| `column-gap`        | `none` 0 / `small` 0.5rem / `normal` 1rem / `large` 5rem                       | `normal`         | 列の間隔。左右折り返しでは画像とテキストの間隔                                                            |
| `row-gap`           | `none` 0 / `small` 0.5rem / `normal` 1rem / `large` 5rem                       | `normal`         | 行の間隔                                                                                                  |
| `_grid_subgrid-gap` | `none` 0 / `small` 0.5rem / `normal` 1rem / `large` 1rem                       | `normal`         | グループ内のアイテム同士の間隔。グリッドのブロックでのみ表示される。編集画面では`subgrid-gap`と表示される |

本パッケージの CSS は、変種の値を`--bge-options-<軸>--<変種>`として、既定の変種を`--bge-options-<軸>: var(--bge-options-<軸>--<変種>)`として宣言している。作者が既定以外の変種を選択すると、BurgerEditor はブロックの`style`属性に`--bge-options-<軸>: var(--bge-options-<軸>--<変種>)`を出力する。

### プロジェクトの CSS で変更できること

本パッケージの CSS は、レイアウトのルールの大部分を`:where()`で囲んでいて、詳細度は 0。プロジェクトの CSS は、属性セレクタ 1 つ（詳細度 0,1,0）でそれらを上書きできる。詳細度が 0 でないルールは次のとおり。これらを上書きするには、同じかそれ以上の詳細度で、本パッケージの CSS より後に読み込む必要がある。

| ルール                                                            | 詳細度  |
| ----------------------------------------------------------------- | ------- |
| 軸と変種の宣言（`[data-bge-container]`）                          | (0,1,0) |
| `ul`/`ol`/`li`のリストのリセット                                  | (0,0,1) |
| グリッドで各グループが占める行数（`--item-count`）                | (0,4,0) |
| グリッドで 9 個以上のグループを縦に積む                           | (0,3,0) |
| `immutable`の横並びで、グループが 2 つの場合の伸縮                | (0,4,0) |
| Wysiwyg 内の`data-bgc-flex-box`・`data-bgc-align`の値ごとのルール | (0,1,0) |

プロジェクトの CSS で本パッケージの CSS をカスケードレイヤーに読み込むと、詳細度に関係なく上書きできる。レイヤーに属さないルールは、レイヤー内のルールより常に優先されるため。

```css
@import '@burger-editor/css' layer(bge);
```

HTML の`style`属性に出力された値（作者が編集画面で決めた値）は、プロジェクトの CSS では上書きしない。画面幅に応じたカルーセルの表示枚数の調整には、専用の変数がある（[`docs/carousel.md`](./docs/carousel.md)を参照）。

#### 変種の値を変更する

プロジェクトの CSS で変種の値を再宣言すると、その変種を選択したすべてのブロックで値が変更される。編集画面の選択肢に表示される値も変更される。

```css
[data-bge-container] {
	--bge-options-margin--large: 6rem;
	--bge-options-bg-color--blue: #e6f0ff;
}
```

`@media`の中で再宣言すると、公開ページでは画面幅ごとに値が変更される。BurgerEditor は`@media`内の宣言を参照しないため、編集画面の選択肢に表示される値（`large (8rem)`など）は`@media`の外の値のまま。

```css
@media (max-width: 767px) {
	[data-bge-container] {
		--bge-options-margin--large: 4rem;
	}
}
```

#### 既定の変種を変更する

プロジェクトの CSS で`--bge-options-<軸>`を再宣言すると、作者が何も選択していないブロックの値が変更される。編集画面で既定として表示される変種も変更される。

```css
[data-bge-container] {
	--bge-options-padding-block: var(--bge-options-padding-block--small);
}
```

#### 変種を追加・削除する

プロジェクトの CSS で`[data-bge-container]`のルールに新しい変種を宣言すると、BurgerEditor はそれを編集画面の選択肢に追加する。値を空（`: ;`。コロンとセミコロンの間に空白が必要）にすると、BurgerEditor はその変種を選択肢から除外する。

```css
[data-bge-container] {
	--bge-options-margin--xlarge: 12rem; /* 選択肢に追加される */
	--bge-options-bg-color--red: ; /* 選択肢から除外される */
}
```

新しい軸を追加する場合は、変種の宣言に加えて、その値を CSS プロパティに適用するルールもプロジェクトの CSS に記述する必要がある。記述方法は[`style-axes`](https://github.com/d-zero-dev/BurgerEditor/blob/dev/skills/building-burger-editor-projects/references/style-axes.md)を参照。

#### 折り返し基準幅を変更する

プロジェクトの CSS で`--bge-repeat-min-inline-size--small`/`--medium`/`--large`を`[data-bge-container]`のルールで再宣言すると、`auto-fit`/`auto-fill`の 1 列の最小幅が変更される。

本パッケージの CSS が対応するのは、`data-bge-container`の`:--small`/`:--medium`/`:--large`の 3 つのみ。別の名前の変種（例: `--bge-repeat-min-inline-size--xlarge`）をプロジェクトの CSS で宣言すると、BurgerEditor は編集画面の選択肢に追加して`:--xlarge`を出力するが、本パッケージの CSS はそれを参照しない。`:--xlarge`の場合に`--bge-repeat-min-inline-size`を切り替えるルールも、プロジェクトの CSS に記述する必要がある。

#### レイアウトを上書きする

例: 狭い画面では、固定列数のグリッドをすべて 1 列にする。本パッケージの CSS は`--bge-grid-col`を詳細度 0 で宣言しているため、プロジェクトの CSS は属性セレクタ 1 つで上書きできる。

```css
@media (max-width: 767px) {
	[data-bge-container-frame] {
		--bge-grid-col: 1;
	}
}
```

## Wysiwyg 内の属性

リッチテキストアイテム（`wysiwyg`）のツールバーで作者が横並びや文字揃えを選択すると、BurgerEditor は次の属性を出力する。本パッケージの CSS は、属性の値に応じたスタイルを適用する。

| 属性                  | BurgerEditor が出力する値                                                                                                    | 本パッケージの CSS が適用するスタイル                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[data-bgc-flex-box]` | ツールバーの横並びボタンは`start`を出力する。本パッケージの CSS は`center`/`end`/`between`/`around`/`evenly`にも対応している | `display: flex`・`flex-wrap: wrap`・`align-items: center`と、ブロックと同じ変数の`gap`。`justify-content`は値に応じて`start`/`center`/`end`/`space-between`/`space-around`/`space-evenly` |
| `[data-bgc-align]`    | `start` / `center` / `end`                                                                                                   | 値に応じた`text-align`                                                                                                                                                                    |

本パッケージの CSS は、属性の有無で適用するルールを`:where()`で囲んでいて（詳細度 0）、値ごとのルールは詳細度 (0,1,0)。

## 含まれるアイテムスタイル

`button`/`carousel`/`details`/`download-file`/`google-maps`/`hr`/`image`/`import`/`table`/`title-h2`/`title-h3`/`wysiwyg`/`youtube`の計 13 種。

アイテムごとの HTML の構造・CSS カスタムプロパティ・プロジェクトの CSS での上書き方法は、次のドキュメントを参照。

- [`docs/carousel.md`](./docs/carousel.md) — カルーセル（矢印とドットのスタイル変数、セレクタ、CSS だけの描画とランタイムの描画の違い、詳細度）

## License

Dual Licensed under MIT OR Apache-2.0
