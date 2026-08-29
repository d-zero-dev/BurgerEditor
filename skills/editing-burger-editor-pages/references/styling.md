# styling — 余白・背景色・幅・カラム数の調整

BurgerEditor v4 のブロックの見た目は 3 つの独立した軸で調整する。**軸・変種名はプロジェクト固有の CSS で定義されるので、実在するものしか使えない。推測で値を埋めない。**

1. **CSS カスタムプロパティの軸** — `style: { '--bge-options-<軸>': 'var(--bge-options-<軸>--<変種>)' }`
2. **コンテナタイプ + オプション** — `containerProps.type: 'grid' | 'inline' | 'float'` とその下位オプション（`columns`, `justify`, `align` 等）
3. **クラスリスト** — `classList: [...]`。プロジェクトの CSS/config で意味付けされた任意クラス

## 手順

### 1. 実在する軸を確認する

```
style_options_list
```

戻り値は `{ axes: { <軸名>: [<変種名>, ...] } }`。**空でも「軸が無い」と決めつけない** — `config.stylesheets` に列挙された CSS が読み込めなかっただけの可能性がある。

このリポジトリの組み込みブロックが定義している軸の実例（プロジェクトによって増減する）:

```json
{
	"axes": {
		"max-width": ["normal", "small", "medium", "large", "full"],
		"margin": ["none", "small", "normal", "large"],
		"bg-color": ["transparent", "white", "gray", "blue", "red"],
		"padding-block": ["none", "small", "medium", "large"],
		"padding-inline": ["none", "small", "medium", "large", "default-gutter"],
		"column-gap": ["none", "small", "normal", "large"],
		"row-gap": ["none", "small", "normal", "large"]
	}
}
```

`width` / `bgcolor` / `border` のような軸名は存在しない。似た意図の軸（`max-width` / `bg-color`）と混同しない。

### 2. コンテナレイアウトの選択肢を確認する

```
container_options_list
```

`grid` / `inline` / `float` の下位オプションが返る。こちらはコアの静的仕様でプロジェクトに依存しない。

### 3. 既存ブロックを参考にする

「他のセクションと同じ見た目で」と言われたら、`page_blocks` + `block_get` で類似ブロックを読み、`data.style` / `data.classList` / `data.containerProps` を**コピー元として再利用**する。これがプロジェクトの見た目に馴染ませる最短経路。

### 4. spec に反映する

```json
{
  "catalog": "image-text",
  "items": [...],
  "containerProps": { "type": "grid", "columns": 2 },
  "style": {
    "--bge-options-margin": "var(--bge-options-margin--large)",
    "--bge-options-bg-color": "var(--bge-options-bg-color--blue)"
  },
  "classList": ["my-section"]
}
```

`--bge-options-<軸>` の値は必ず `var(--bge-options-<軸>--<変種>)` の形にする。`classList` はプロジェクトの CSS/config に実在するクラスだけを使い、意味の分からない任意クラス名を勝手に足さない。

候補が複数解釈できるとき（「広めに」が `margin` の `large` か `padding-block` の `large` か等）は、`style_options_list` の実在する軸を提示してユーザーに選ばせる。
