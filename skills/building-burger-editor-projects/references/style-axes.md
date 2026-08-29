# style-axes — CSS カスタムプロパティ軸の追加

`editing-burger-editor-pages` スキルの `style_options_list` が読むのは、**`burgereditor.config.js` の `stylesheets` に列挙された CSS の中の `--bge-options-<軸>--<変種>` という命名規則の変数だけ**。新しい軸をエージェントから使えるようにするには、この規則に従って CSS に定義し、かつそのファイルを `stylesheets` に含める必要がある。

## 定義パターン（`@burger-editor/blocks/src/general.css` の実例）

```css
:root {
	--bge-options-margin--normal: 3rem;
	--bge-options-margin--none: 0;
	--bge-options-margin--small: 1rem;
	--bge-options-margin--large: 8rem;
	--bge-options-margin: var(--bge-options-margin--normal); /* 既定変種 */
}

[data-bge-container] {
	margin-block-end: var(--bge-options-margin); /* 実際に使う箇所 */
}
```

1. 各変種を `--bge-options-<軸>--<変種名>: <値>` で定義する
2. 既定変種を指す `--bge-options-<軸>: var(--bge-options-<軸>--<既定変種>)` を必ず用意する（無いと `style_options_list` が軸自体を検出できない、またはブロックが未指定時に値を持てない）
3. ブロック側の実際の CSS プロパティに `var(--bge-options-<軸>)` を割り当てる

エージェントが `block_insert` / `block_replace` の `spec.style` に書く値は `{ '--bge-options-<軸>': 'var(--bge-options-<軸>--<変種>)' }` の形になる。

## `stylesheets` への追加を忘れない

新しい軸を定義した CSS ファイルを作っても、`burgereditor.config.js` の `stylesheets: string[]` に加えなければ `style_options_list` には出てこない（エージェントからは「軸が存在しない」ように見える）。既存のスタイル定義ファイルに追記するだけなら不要。

## 軸名の指針

- 軸名はプロパティが対応する CSS の性質を表す名前にする（`margin` `bg-color` `max-width` `padding-block` `padding-inline` `column-gap` `row-gap` のように、対象の CSS プロパティ名に近い語を選ぶと `editing-burger-editor-pages` 側が迷わない）
- 変種名は相対的な度合い（`none` `small` `normal`/`medium` `large`）か、色名など具体的な選択肢名にする
- 既存プロジェクトに新しい軸を足すときは、既存の命名パターン（単数形か複数形か、`bg-color` か `background-color` か等）に合わせる。既存 CSS を `style_options_list` で先に確認してから決める
