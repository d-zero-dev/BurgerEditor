# カルーセルのスタイル

本パッケージの CSS は、`carousel`アイテムに最小限のスタイル（スライドの横並び・1 枚ずつのスナップ・円形の矢印とドット）のみを適用する。プロジェクトの CSS は、本パッケージの CSS を上書きして、デザインに合わせたスタイルを実装する。矢印とドットの色・大きさ・記号は、プロジェクトの CSS が「矢印とドットのスタイル変数」の変数を 1 か所に記述するだけで変更できる。

編集画面・本パッケージの CSS・プロジェクトの CSS・ランタイム（`@burger-editor/runtime`）の役割分担は、[README の「仕組み」](../README.md#仕組み)を参照。

## HTML の構造

BurgerEditor は、カルーセルを次の構造で保存する（エディタが再読み込みに使用する`data-bge`属性は省略）。

```html
<div data-bgi="carousel">
	<!-- ラッパー: 全体設定と表示枚数 -->
	<div
		data-bge-autoplay="false"
		data-bge-loop="false"
		data-bge-arrows="true"
		data-bge-dots="true"
		data-bge-effect="slide"
		style="--per-view: 1">
		<!-- スライドのリスト（スクロールする要素） -->
		<div data-bge-list tabindex="0">
			<!-- スライド -->
			<figure
				data-bge-slide-label="説明1"
				style="--css-width: 100cqi; --object-fit: cover; --aspect-ratio: revert">
				<!-- 通常は div、リンクの場合は a、ポップアップの場合は button -->
				<div>
					<picture data-bge-list>
						<source srcset="/sp1.png" media="(max-width: 767px)" />
						<img src="/pc1.png" alt="説明1" width="400" height="300" loading="lazy" />
					</picture>
				</div>
				<figcaption></figcaption>
			</figure>
			<!-- スライドの数だけ figure が繰り返される -->
		</div>
	</div>
</div>
```

ラッパーとスライドのリストには class 属性がない。本パッケージの CSS は、次のセレクタでそれらを選択している。プロジェクトの CSS も同じセレクタで選択する。

| 選択する要素     | セレクタ                                                            |
| ---------------- | ------------------------------------------------------------------- |
| ラッパー         | `[data-bgi='carousel'] > :has(> [data-bge-list])`                   |
| スライドのリスト | `[data-bgi='carousel'] > :has(> [data-bge-list]) > [data-bge-list]` |
| スライド         | `[data-bgi='carousel'] [data-bge-list] > figure`                    |

スライドの`<picture>`も`data-bge-list`属性を持つ。`[data-bgi='carousel'] [data-bge-list]`のような子孫セレクタは、画像のリストにも一致する。プロジェクトの CSS は、スライドのリストを選択する場合に、ラッパーから子結合子（`>`）で指定する。

## CSS カスタムプロパティ

本パッケージの CSS は、次のカスタムプロパティを参照してカルーセルのレイアウトを決定する。

| プロパティ           | 出力元と出力先                                                                     | 値                                                                                  | 本パッケージの CSS での用途                                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--per-view`         | BurgerEditor がラッパーの`style`属性に出力する                                     | 編集画面の「表示枚数」（1 以上の整数）                                              | 本パッケージの CSS が、この値とプロジェクトの CSS の上限（`--bge-carousel-max-per-view`）から実際の表示枚数（`--bge-carousel-per-view`）を計算し、スライド 1 枚の幅に使う。ランタイムも実際の表示枚数を参照し、矢印と自動再生で切り替える枚数にする |
| `--bge-carousel-gap` | 本パッケージの CSS がラッパーで宣言する                                            | ブロックの列の間隔（`--bge-options-column-gap`）の値                                | スライド間の余白（`column-gap`）と、スライドの幅の計算。`@property`で`<length>`として登録している                                                                                                                                                   |
| `--css-width`        | BurgerEditor がスライド（`figure`）の`style`属性に出力する                         | 編集画面の画像の幅。「コンテナに合わせる」の場合は`cqi`、「元のサイズ」の場合は`px` | スライドの内容（`div`/`a`/`button`）と`img`の幅。`cqi`はスライドの幅が基準                                                                                                                                                                          |
| `--object-fit`       | BurgerEditor がスライドの`style`属性に出力する（「コンテナに合わせる」の場合のみ） | 常に`cover`                                                                         | `img`の`object-fit`                                                                                                                                                                                                                                 |
| `--aspect-ratio`     | BurgerEditor がスライドの`style`属性に出力する（「コンテナに合わせる」の場合のみ） | 編集画面の縦横比（`16/9`など）。指定なしの場合は`revert`                            | `img`の`aspect-ratio`                                                                                                                                                                                                                               |

`--per-view`・`--css-width`・`--object-fit`・`--aspect-ratio`は、作者が編集画面で決める値。プロジェクトの CSS は、これらを上書きしない。例外は、次の「表示枚数を画面幅に応じて変更する」だけ。

### 表示枚数を画面幅に応じて変更する

表示枚数は作者が編集画面で決める値だが、編集画面では 1 つの数しか指定できない。狭い画面で枚数を減らすなど、画面幅に応じた調整は、プロジェクトの CSS で上限の変数を記述して行う。

| 変数                          | 記述する者                                                          | 意味                                                                                          |
| ----------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `--per-view`                  | BurgerEditor（`style`属性）                                         | 作者が編集画面で決めた表示枚数                                                                |
| `--bge-carousel-max-per-view` | プロジェクトの CSS（`[data-bgi='carousel']`、またはその祖先の要素） | 表示枚数の上限。指定しなければ上限なし                                                        |
| `--bge-carousel-per-view`     | 本パッケージの CSS（ラッパー）                                      | 実際の表示枚数。`min(--per-view, --bge-carousel-max-per-view)`。プロジェクトの CSS は参照のみ |

本パッケージの CSS は、実際の表示枚数をスライドの幅の計算に使う。ランタイムも実際の表示枚数を参照する。上限が変更されてスライドの幅が変わると、ランタイムは表示枚数を再取得するため、矢印と自動再生で切り替える枚数も追従する。上限なので、作者が上限より少ない枚数を設定したカルーセルは、その枚数のまま表示される。

例: 狭い画面では、表示枚数を 1 にする。

```css
@media (max-width: 767px) {
	[data-bgi='carousel'] {
		--bge-carousel-max-per-view: 1;
	}
}
```

- `--per-view`自体は上書きしない。`style`属性の値なので`!important`が必要になり、作者が編集画面で設定した値を無視することになる
- `--bge-carousel-max-per-view`には、単位なしの 1 以上の整数を指定する。0 の場合は 1 として扱う。`2px`のような数値でない値は無効になり、作者の値ではなく 1 として扱う（エラーは表示されない）。ランタイムは小数を切り捨てて参照するが、本パッケージの CSS はスライドの幅を小数のまま計算するため、小数を指定するとスクロール位置が一致しなくなる
- `grid-auto-columns`を直接上書きしない。ランタイムは`--bge-carousel-per-view`を参照し続けるため、切り替える枚数と表示される枚数が一致しなくなる

### スライド間の余白を変更する

プロジェクトの CSS でラッパーの`--bge-carousel-gap`を再宣言すると、スライド間の余白が変更される。`style`属性ではないため、`!important`は不要（必要な詳細度は「上書きに必要な詳細度」を参照）。再宣言しない場合、本パッケージの CSS はブロックの列の間隔の値を適用する。

## 矢印とドットのスタイル変数

矢印とドットは、ブラウザによって CSS の疑似要素で描画される場合と、ランタイムが生成する`<button>`で描画される場合がある（「矢印とドットの表示方法」を参照）。本パッケージの CSS は、どちらの描画にも次の変数を参照する。プロジェクトの CSS で変数を`[data-bgi='carousel']`に記述すると、両方に同じ値が適用される。

本パッケージの CSS は、既定値を`[data-bgi='carousel']`で宣言している。プロジェクトの CSS も`[data-bgi='carousel']`（または、その内側の要素）に記述する。`:root`に記述すると、`[data-bgi='carousel']`の既定値に負ける。

```css
[data-bgi='carousel'] {
	--bge-carousel-button-color: #fff;
	--bge-carousel-button-background: #333;
	--bge-carousel-button-border: none;
	--bge-carousel-previous-icon: url('/icons/arrow-left.svg');
	--bge-carousel-next-icon: url('/icons/arrow-right.svg');
	--bge-carousel-marker-current-background: #e00;
}
```

### 矢印・再生ボタン

| 変数                                     | 既定値                   | 適用先                                                                                                          |
| ---------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `--bge-carousel-button-size`             | `2.5rem`                 | 最小の幅と高さ                                                                                                  |
| `--bge-carousel-button-font-size`        | `1.5rem`                 | 文字の記号の大きさ。`url()`の画像には効かず、画像の固有サイズで描画される                                       |
| `--bge-carousel-button-color`            | `currentcolor`           | 記号と枠線の色                                                                                                  |
| `--bge-carousel-button-background`       | `transparent`            | 背景                                                                                                            |
| `--bge-carousel-button-border`           | `1px solid currentcolor` | 枠線                                                                                                            |
| `--bge-carousel-button-radius`           | `50%`                    | 角丸                                                                                                            |
| `--bge-carousel-button-disabled-opacity` | `0.3`                    | 先頭・末尾で無効になった矢印の不透明度                                                                          |
| `--bge-carousel-previous-icon`           | `'‹'`                    | 前へボタンの記号。文字列または`url()`（SVG などの画像）。それ以外の値（`none`など）は無視され、既定の記号に戻る |
| `--bge-carousel-next-icon`               | `'›'`                    | 次へボタンの記号。文字列または`url()`                                                                           |

再生・停止ボタンは、記号の変数以外の変数を矢印と共有する。記号（`❚❚`/`▶`）の大きさは`--bge-carousel-button-font-size`の半分。プロジェクトの CSS が再生・停止ボタンだけを変更する場合は、`[data-bge-carousel-button='play']`に直接記述する（ランタイムが生成する要素のみで、CSS の疑似要素版はない）。

### ドット

| 変数                                       | 既定値         | 適用先                                                                                                                                                    |
| ------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bge-carousel-marker-size`               | `0.75rem`      | 円の直径                                                                                                                                                  |
| `--bge-carousel-marker-target-size`        | `1.5rem`       | 押せる範囲の幅と高さ。円はその中央に描画される                                                                                                            |
| `--bge-carousel-marker-color`              | `currentcolor` | 枠線と塗りの基準色                                                                                                                                        |
| `--bge-carousel-marker-border-width`       | `1px`          | 円の枠線の太さ。`0`で枠線なし                                                                                                                             |
| `--bge-carousel-marker-border-color`       | `currentcolor` | 円の枠線の色                                                                                                                                              |
| `--bge-carousel-marker-radius`             | `50%`          | 円の角丸。押せる範囲の角丸は、この値に余白（押せる範囲と円の差の半分）を足した値。`0`にすると、円は正方形になり、押せる範囲は角丸 0.375rem の正方形になる |
| `--bge-carousel-marker-current-background` | `currentcolor` | 現在のドットの塗り                                                                                                                                        |
| `--bge-carousel-marker-gap`                | `0.5rem`       | ドット（押せる範囲）の間隔                                                                                                                                |

ドットの色は、矢印の色（`--bge-carousel-button-color`）とは別の変数で決まる。矢印だけを白にしてもドットは変わらない。

`--bge-carousel-marker-size`・`--bge-carousel-marker-target-size`・`--bge-carousel-marker-border-width`は長さを指定する（`0`は単位なしでよい）。数値だけの値（`0.75`など）や`auto`は無効になり、既定の大きさ（円 12px・押せる範囲 24px・枠線 1px）に戻る。

ドットの押せる範囲は、既定で 1.5rem 四方（ルートの`font-size`が 16px の場合は 24px。WCAG 2.5.8 のターゲットの最小サイズ）。本パッケージの CSS は、CSS の疑似要素版とランタイムの`<button>`版のどちらも同じ方法で描画する。円の直径と押せる範囲の差を透明な枠線にし、円の枠線を内側の影（`box-shadow: inset`）で描画し、塗りを`background-clip: padding-box`で円の内側に限る。

### 記号を変更した場合のアクセシブルな名前

記号を変数で変更しても、矢印のアクセシブルな名前（支援技術が読み上げるテキスト）は変わらない。CSS の疑似要素版では、本パッケージの CSS が`content`の代替テキストに名前を記述している。ランタイムの`<button>`では、ランタイムが入れる`aria-hidden`の`<span>`の`::before`に記号を描画するため、名前は`[data-bge-carousel-text]`のテキストのまま。

### 変数で変更できないもの

変数は、両方の描画方法に共通する性質だけを持つ。次のものは、変数を介さずにプロジェクトの CSS で直接記述する。

- 矢印・ドットの位置: ラッパーのグリッド（「配置」を参照）。どちらの描画方法でも同じ領域名に配置されるため、1 か所の記述で両方に適用される
- フェードの切り替え時間: 「フェード」を参照
- 変数にない性質（ホバー時の見た目、影など）: 「部品ごとのセレクタ」のとおり、両方の描画方法に記述する

## 矢印とドットの表示方法

矢印とドットの描画方法は、ブラウザとランタイムの有無によって 3 とおりに分かれる。「矢印とドットのスタイル変数」の変数は、A と B の両方に適用される。プロジェクトの CSS が変数にない性質を変更する場合は、A と B の両方に記述する必要がある。

| 状況                                                                                                                                     | 描画方法                                                                                           | 判別方法                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A. `::scroll-marker`に対応したブラウザ（Chromium）で、ループでもフェードでもない場合                                                     | 本パッケージの CSS が、疑似要素`::scroll-button()` / `::scroll-marker`で描画する                   | ラッパーに`data-bge-carousel-controls`属性がない               |
| B. ランタイムを読み込んでいて、Invoker Commands API に対応したブラウザで、A に該当しない場合（疑似要素に未対応、またはループ・フェード） | ランタイムが`<button>`を生成し、本パッケージの CSS がそのスタイルを適用する                        | ラッパーに`data-bge-carousel-controls`属性がある               |
| C. ランタイムを読み込んでいない、または Invoker Commands API に未対応で、疑似要素にも未対応の場合                                        | 描画されない。閲覧者はスクロールバーと横スクロール（タッチ・トラックパッド）でスライドを切り替える | `data-bge-carousel-controls`属性がなく、疑似要素も表示されない |

自動再生の再生・停止ボタンと、フェードは、ランタイムを読み込んでいて Invoker Commands API に対応したブラウザでのみ動作する。

- 再生・停止ボタンは、A と同時に表示されることがある（Chromium で、ループもフェードも使用せずに自動再生のみを有効にした場合）
- フェードで矢印またはドットを表示する場合は、常に B になる
- ランタイムを読み込んでいない場合、フェードを選択したカルーセルもスライドとして横方向に配置される

## 部品ごとのセレクタ

A では本パッケージの CSS の疑似要素が、B ではランタイムの`<button>`が、同じ部品を描画する。「矢印とドットのスタイル変数」にない性質をプロジェクトの CSS で変更する場合は、両方に同じ宣言を記述する必要がある。

表のセレクタは末尾の部分である。プロジェクトの CSS は、実際には`[data-bgi='carousel']`から記述する。A のセレクタは、さらにラッパーを`[data-bge-arrows='true']:not([data-bge-carousel-controls])`（ドットは`[data-bge-dots='true']:not([data-bge-carousel-controls])`）で限定する必要がある。記述例は、この節の末尾にある。

| 部品                         | A（本パッケージの CSS の疑似要素）                       | B（ランタイムの`<button>`）                                                                 |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 前へ                         | `[data-bge-list]::scroll-button(inline-start)`           | `[data-bge-carousel-button='previous']`                                                     |
| 次へ                         | `[data-bge-list]::scroll-button(inline-end)`             | `[data-bge-carousel-button='next']`                                                         |
| 先頭・末尾で無効になった矢印 | `[data-bge-list]::scroll-button(*):disabled`             | `[data-bge-carousel-button][aria-disabled='true']`                                          |
| ドットのグループ             | `[data-bge-list]::scroll-marker-group`                   | `[data-bge-carousel-markers]`                                                               |
| ドット                       | `[data-bge-list] > figure::scroll-marker`                | `[data-bge-carousel-markers] > [data-bge-carousel-button]`                                  |
| 現在のドット                 | `[data-bge-list] > figure::scroll-marker:target-current` | `[data-bge-carousel-markers] > [aria-current='true']`                                       |
| 再生・停止ボタン             | （なし）                                                 | `[data-bge-carousel-button='play']`。状態は`[data-bge-carousel-state='playing']`/`'paused'` |

ランタイムが生成するボタンの内容は、表示用の記号の`<span aria-hidden="true">`（ドットにはない）と、視覚的に非表示にしたアクセシブルな名前のテキスト（`<span data-bge-carousel-text>`）。矢印の`<span aria-hidden="true">`は空で、本パッケージの CSS がその`::before`に`--bge-carousel-previous-icon`/`--bge-carousel-next-icon`の記号を描画する。再生・停止ボタンの記号（`❚❚`/`▶`）は、ランタイムが`<span aria-hidden="true">`の文字として切り替える。本パッケージの CSS は、ドットの円をボタンの`::before`で描画し、ボタン自体を押せる範囲（`--bge-carousel-marker-target-size`）にする。

### A と B を 1 つのルールに統合しない

プロジェクトの CSS で、A のセレクタと B のセレクタを 1 つのセレクタリストに統合してはならない。ブラウザは、未対応の疑似要素を含むセレクタリストを、ルールごと無効にする。統合すると、`::scroll-button()`に未対応のブラウザでは、B 側の宣言まで適用されなくなる。`:is()`/`:where()`は疑似要素を受け付けないため、統合する手段にならない。

プロジェクトの CSS は、A のルールを、本パッケージの CSS と同様に`@supports selector(::scroll-marker)`の中に記述し、ラッパーを`:not([data-bge-carousel-controls])`で限定する。B が表示されている場合に A の疑似要素を非表示にする処理は、本パッケージの CSS がすでに行っている。プロジェクトの CSS で再度非表示にする必要はない。

```css
/* A: 本パッケージの CSS の疑似要素の矢印 */
@supports selector(::scroll-marker) {
	[data-bgi='carousel']
		[data-bge-arrows='true']:not([data-bge-carousel-controls])
		> [data-bge-list]::scroll-button(*) {
		color: #fff;
		background: #333;
		border: none;
	}
}

/* B: ランタイムのボタン */
[data-bgi='carousel']
	:is([data-bge-carousel-button='previous'], [data-bge-carousel-button='next']) {
	color: #fff;
	background: #333;
	border: none;
}
```

### 矢印とドットのアクセシブルな名前

- A の矢印のアクセシブルな名前（支援技術が読み上げるテキスト）は、本パッケージの CSS の`content: var(--bge-carousel-previous-icon) / '前のスライド'`（次へは`var(--bge-carousel-next-icon) / '次のスライド'`）で決まる。記号は変数で変更する。プロジェクトの CSS で`content`を直接上書きする場合は、`/`の後ろの名前も記述する必要がある。省略すると、記号が名前になる
- B の矢印のアクセシブルな名前は、ランタイムの設定（`previousLabel`/`nextLabel`）で決まる。文言を変更する場合は、A の`content`の代替テキストと B の設定の両方を変更する
- A のドットのアクセシブルな名前は、本パッケージの CSS の`content: '' / attr(data-bge-slide-label)`で決まる。プロジェクトの CSS でドットの`content`を上書きする場合は、`/ attr(data-bge-slide-label)`を維持する

## 配置

本パッケージの CSS は、ラッパーを次のグリッドにし、各部品を領域名で配置する。A の疑似要素も B のボタンも、同じ領域名に配置される。

```css
/* 本パッケージの CSS の既定 */
grid-template-areas:
	'list list list list'
	'play previous markers next';
grid-template-columns: auto auto 1fr auto;
row-gap: 0.5rem;
```

| 領域名     | 配置される部品                       |
| ---------- | ------------------------------------ |
| `list`     | スライドのリスト                     |
| `play`     | 再生・停止ボタン（ランタイムが生成） |
| `previous` | 前へ                                 |
| `markers`  | ドットのグループ                     |
| `next`     | 次へ                                 |

プロジェクトの CSS でラッパーの`grid-template-areas`と`grid-template-columns`を上書きすると、部品の並び順を変更できる。表示されない部品（矢印なし・ドットなし・自動再生なしの場合）の領域は、空の領域になる。

## スライドの幅と画像

本パッケージの CSS は、スライドと画像に次のスタイルを適用する。

- スライドの幅は`(100% - var(--bge-carousel-gap) * (var(--bge-carousel-per-view) - 1)) / var(--bge-carousel-per-view)`。スライドのリストは`grid-auto-flow: column`で横方向に配置され、各スライドの先頭でスナップする（`scroll-snap-align: start`）
- スライド（`figure`）は`container-type: inline-size`のコンテナ。`--css-width`の`cqi`は、スライドの幅を基準にする。プロジェクトの CSS でスライド内にコンテナクエリーを記述した場合も、スライドの幅が基準になる
- スライドの内容（`div`/`a`/`button`）の幅は`var(--css-width, 100%)`。`img`は`inline-size: var(--css-width, auto)`・`aspect-ratio: var(--aspect-ratio, revert)`・`object-fit: var(--object-fit, unset)`
- `figcaption`は、空の場合は`display: none`

## フェード

ランタイムがフェードを有効にすると、ラッパーに`data-bge-carousel-fade`属性を追加する。本パッケージの CSS は、この属性がある場合にスライドを 1 つのセルに重ねて配置する。ランタイムは表示中のスライドにのみ`data-bge-carousel-current`属性を追加し、それ以外のスライドを`inert`にする。本パッケージの CSS は、`data-bge-carousel-current`属性のないスライドに`opacity: 0`と`visibility: hidden`を適用する。

本パッケージの CSS は、切り替えに`transition: opacity 0.5s, visibility 0.5s`を適用する。プロジェクトの CSS で`[data-bge-carousel-fade] > [data-bge-list] > figure`の`transition`を上書きすると、切り替え時間を変更できる。`visibility`の遷移を削除すると、非表示になるスライドがフェードせずに即座に非表示になる。

## 上書きに必要な詳細度

本パッケージの CSS は、カスケードレイヤーを使用していない。プロジェクトの CSS もレイヤーなしで記述する場合、本パッケージの CSS を上書きするには、同じかそれ以上の詳細度で、本パッケージの CSS より後に読み込む必要がある。「矢印とドットのスタイル変数」の変数は`[data-bgi='carousel']`（詳細度 0,1,0）で宣言されているため、プロジェクトの CSS も`[data-bgi='carousel']`に記述すれば足りる。本パッケージの CSS の主なルールの詳細度:

| 対象                                       | 詳細度  |
| ------------------------------------------ | ------- |
| ラッパー                                   | (0,2,0) |
| スライドのリスト                           | (0,3,0) |
| スライド・`img`・`figcaption`              | (0,1,1) |
| B のボタン（`[data-bge-carousel-button]`） | (0,2,0) |
| B の無効になった矢印                       | (0,3,0) |
| B のドット                                 | (0,3,0) |
| B の現在のドットの`::before`               | (0,4,1) |
| フェードで表示中のスライド                 | (0,4,0) |
| A の矢印                                   | (0,4,1) |
| A の無効になった矢印                       | (0,5,1) |
| A のドット                                 | (0,4,2) |
| A の現在のドット                           | (0,5,2) |

プロジェクトの CSS で本パッケージの CSS をカスケードレイヤーに読み込むと、詳細度に関係なく上書きできる（[README の「プロジェクトの CSS で変更できること」](../README.md#プロジェクトの-css-で変更できること)を参照）。`style`属性に出力された値（`--per-view`など、作者が編集画面で決めた値）は、レイヤーに読み込んでも上書きの対象にしない（「表示枚数を画面幅に応じて変更する」を参照）。

## アクセシビリティのために維持すること

本パッケージの CSS は、次の処理を行っている。プロジェクトの CSS で上書きする場合も、同じ処理を維持する必要がある。

- **動きを減らす設定**: 本パッケージの CSS は、`prefers-reduced-motion: no-preference`の場合のみ、スクロールを`smooth`にし、フェードに`transition`を適用する。プロジェクトの CSS でアニメーションを追加する場合も、同じメディアクエリーの中に記述する
- **強制カラーモード**: 本パッケージの CSS は、現在のドットを背景色で示し、`forced-colors: active`では`forced-color-adjust: none`と`background: CanvasText`で区別を維持する。プロジェクトの CSS で現在のドットの表示方法を変更する場合は、強制カラーモードでも区別できるようにする
- **スクロールバー**: 本パッケージの CSS は、矢印またはドットが表示されている場合（A または B）のみスクロールバーを非表示にする。プロジェクトの CSS で C の場合にスクロールバーを非表示にすると、マウスの利用者はスライドを切り替えられなくなる
- **アクセシブルな名前のテキスト**: ランタイムが生成するボタンの`[data-bge-carousel-text]`は、本パッケージの CSS が視覚的に非表示にしているだけで、ボタンのアクセシブルな名前になる。プロジェクトの CSS で`display: none`にすると、ボタンのアクセシブルな名前がなくなる

## 必要なブラウザ機能

本パッケージの CSS は、CSS Nesting・`:has()`・`@property`・コンテナクエリーの単位（`cqi`）・`infinity`定数（`min()`の中）を使用する。いずれも Baseline。ただし、`@property`の`syntax`に`<string>`を指定できるかどうかは、Chromium 以外のブラウザで確認していない。対応していないブラウザでは、`@property`のルール全体が無効になり、矢印の記号に不正な値を指定した場合に既定の記号へ戻る保護が働かない（既定値の宣言は残るため、記号の表示自体は変わらない）。

- CSS Nesting または`:has()`に対応していないブラウザでは、本パッケージの CSS のカルーセルのルールが適用されず、スライドが縦方向に配置される
- `@property`に対応していないブラウザでは、`column-gap`が単位なしの`0`（変種`none`）の場合、本パッケージの CSS のスライドの幅の計算が無効になる
- `::scroll-button()`/`::scroll-marker`/`:target-current`には Chromium のみが対応していて、Baseline ではない。A になるのは Chromium のみ
