# styling — 余白・背景色・幅・カラム数の調整

BurgerEditor v4 のブロックの見た目は 3 つの独立した軸で調整する。**軸・変種名はプロジェクト固有の CSS で定義されるので、実在するものしか使えない。推測で値を埋めない。**

1. **CSS カスタムプロパティの軸** — `style: { '<軸>': '<変種>' }`
2. **コンテナタイプ + オプション** — `containerProps.type: 'grid' | 'inline' | 'float'` とその下位オプション（`columns`, `justify`, `align` 等）
3. **クラスリスト** — `classList: [...]`。プロジェクトの CSS/config で意味付けされた任意クラス

## 手順

### 1. 実在する軸を確認する

```
style_options_list
```

戻り値は `{ axes: { <軸名>: [<変種名>, ...] } }`。エディタのブロックオプションダイアログと同じ規則で検出した選択肢なので、ここに無い軸・変種はエディタでも選べない。プロジェクト独自の軸が見当たらないときは、`config.stylesheets` に列挙された CSS が読み込めなかった可能性がある。

`_grid_subgrid-gap` のように `_<コンテナ種別>_` で始まる軸は、そのコンテナ種別のブロックでしか使えない。作るブロックの種別が決まっているなら `style_options_list { containerType: "grid" }` のように渡すと、その種別で使える軸だけが返る。`spec.style` には接頭辞付きの名前のまま書く（`{ '_grid_subgrid-gap': 'small' }`）。

このリポジトリの組み込みブロックが定義している軸の実例（プロジェクトによって増減する）:

```json
{
	"axes": {
		"max-width": ["full", "large", "normal", "small"],
		"margin": ["large", "none", "normal", "small"],
		"bg-color": ["blue", "gray", "red", "transparent", "white"],
		"padding-block": ["large", "medium", "none", "small"],
		"padding-inline": ["default-gutter", "large", "medium", "none", "small"],
		"column-gap": ["large", "none", "normal", "small"],
		"row-gap": ["large", "none", "normal", "small"],
		"_grid_subgrid-gap": ["large", "none", "normal", "small"]
	}
}
```

`width` / `bgcolor` / `border` のような軸名は存在しない。似た意図の軸（`max-width` / `bg-color`）と混同しない。

### 2. コンテナレイアウトの選択肢を確認する

```
container_options_list
```

`grid` / `inline` / `float` の下位オプションが返る。ほとんどはコアの固定の仕様だが、grid の `repeatMinInlineSizeVariants`（自動折り返しの最小幅のプリセット）だけはプロジェクトの CSS から読む。使うときは返ってきた名前をそのまま `containerProps.repeatMinInlineSize` に書く（例: `"small"`）。

### 3. 既存ブロックを参考にする

「他のセクションと同じ見た目で」と言われたら、`page_blocks` + `block_get` で類似ブロックを読み、`data.style` / `data.classList` / `data.containerProps` を**コピー元として再利用**する。これがプロジェクトの見た目に馴染ませる最短経路。

### 4. spec に反映する

```json
{
  "catalog": "image-text",
  "items": [...],
  "containerProps": { "type": "grid", "columns": 2 },
  "style": {
    "margin": "large",
    "bg-color": "blue"
  },
  "classList": ["my-section"]
}
```

`style` のキーは軸名、値は変種名だけを書く（`style_options_list` が返す名前そのまま）。`--bge-options-` や `var()` は付けない — エディタが `--bge-options-<軸>: var(--bge-options-<軸>--<変種>)` に組み立てて書き込む。`classList` はプロジェクトの CSS/config に実在するクラスだけを使い、意味の分からない任意クラス名を勝手に足さない。

候補が複数解釈できるとき（「広めに」が `margin` の `large` か `padding-block` の `large` か等）は、`style_options_list` の実在する軸を提示してユーザーに選ばせる。
