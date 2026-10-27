# style-axes — CSS カスタムプロパティ軸の追加

`editing-burger-editor-pages`スキルの`style_options_list`が返すのは、**組み込みの CSS と`burgereditor.config.js`の`stylesheets`に列挙された CSS の中で、エディタのブロックオプションダイアログが選択肢として検出する`--bge-options-<軸>--<変種>`だけ**。新しい軸をエージェントから使えるようにするには、この規則に従って CSS に定義し、かつそのファイルを`stylesheets`に含める必要がある。

## 定義パターン（`@burger-editor/blocks/src/general.css`から抜粋）

```css
/* 宣言: 選択肢と既定変種 */
[data-bge-container] {
	--bge-options-margin--normal: 3rem;
	--bge-options-margin--none: 0;
	--bge-options-margin--small: 1rem;
	--bge-options-margin--large: 8rem;
	--bge-options-margin: var(--bge-options-margin--normal); /* 既定変種 */
}

/* 適用: 実際に使う箇所 */
:where([data-bge-container]) {
	--_margin-block-end: var(--bge-options-margin);
	margin-block-end: var(--_margin-block-end);

	&:where(:last-child) {
		--_margin-block-end: 0;
	}
}
```

1. 各変種を`[data-bge-container]`のルールの中に`--bge-options-<軸>--<変種名>: <値>`で定義する。エディタの UI が選択肢として検出するのは`[data-bge-container]`で宣言した変数だけで、`:root`や`@media`の中に書くとエディタの選択肢にも`style_options_list`にも出ない
2. 既定変種を指す`--bge-options-<軸>: var(--bge-options-<軸>--<既定変種>)`を用意する。これが無いとブロックが未指定のときに値を持てず、エディタも既定の選択肢を決められない
3. 実際の CSS プロパティに`var(--bge-options-<軸>)`を割り当てる。エディタは選択した値を変数としてブロックに書き込むだけなので、この割り当てが無いと見た目は変わらない。割り当ては宣言とは別の`:where([data-bge-container])`に書き、詳細度を 0 に保つ（`[data-bge-container]`に直接書くと、`:last-child`で余白を消すような上書きを打ち消してしまう）
4. 軸名・変種名には`--`を含めず、軸名の末尾を`-`にしない（`--`で軸名と変種名を区切るため、`--`を 2 つ以上含む名前はエディタの選択肢にも`style_options_list`にも出ない。軸名の末尾が`-`だと区切り位置がずれ、選んでも保存後に読み戻せない）

エージェントが`block_insert`/`block_replace`の`spec.style`に書く値は`{ '<軸>': '<変種>' }`の形になる。エディタがそれを`--bge-options-<軸>: var(--bge-options-<軸>--<変種>)`としてブロックに書き込む。

## `stylesheets`への追加を忘れない

新しい軸を定義した CSS ファイルを作っても、`burgereditor.config.js`の`stylesheets: string[]`に加えなければ`style_options_list`には出てこない（エージェントからは「軸が存在しない」ように見える）。既存のスタイル定義ファイルに追記するだけなら不要。

## 軸名の指針

- 軸名はプロパティが対応する CSS の性質を表す名前にする（`margin` `bg-color` `max-width` `padding-block` `padding-inline` `column-gap` `row-gap`のように、対象の CSS プロパティ名に近い語を選ぶと`editing-burger-editor-pages`側が迷わない）
- 変種名は相対的な度合い（`none` `small` `normal`/`medium` `large`）か、色名など具体的な選択肢名にする
- 既存プロジェクトに新しい軸を足すときは、既存の命名パターン（単数形か複数形か、`bg-color`か`background-color`か等）に合わせる。既存 CSS を`style_options_list`で先に確認してから決める
