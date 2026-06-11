# block-style ワークフロー

ブロックのカスタムスタイル / クラス / レイアウトを扱うときの手順です。

## カスタムスタイルの仕組み

BurgerEditor v4 ではブロックの見た目を 3 つの軸で調整します：

1. **コンテナタイプ + オプション** — `containerProps.type` `'grid' | 'inline' | 'float'` とその下位オプション（`columns`, `justify` 等）
2. **CSS カスタムプロパティ** — `style: { '--bge-options-margin': 'var(--bge-options-margin--small)' }` のように `--bge-options-<軸>--<バリアント>` を CSS で定義しておき、ブロック側で `var()` を割り当てる
3. **クラスリスト** — `classList: ['my-special']` で任意クラス。プロジェクトで意味付けされている

**重要：軸とバリアント名はプロジェクト依存です。推測してはいけません。**

## 標準手順

### 1. 利用可能なスタイル軸を列挙

```
style_options_list
```

戻り例：

```json
{
	"axes": {
		"width": ["normal", "small", "medium", "large", "full"],
		"margin": ["normal", "none", "small", "large"],
		"bgcolor": ["transparent", "white", "gray", "blue", "red"],
		"border": ["none", "solid", "dashed", "dotted", "wide"]
	}
}
```

軸が空なら「このプロジェクトには CSS でカスタムスタイルが定義されていません」とユーザーに伝え、`config.classList` 上のクラス利用に切り替える。

### 2. コンテナレイアウトの選択肢を確認

```
container_options_list
```

`grid` / `inline` / `float` のサブオプションが返る。これは静的（コアの仕様）。

### 3. 既存ブロックのスタイルを参考にする

ユーザーが「他のセクションと同じ見た目で」と言ったら、`block_list` を読み、既存ブロックの `data.style` / `data.classList` / `data.containerProps` を**コピー元として再利用**する。これがプロジェクトに馴染ませる最短経路。

### 4. ユーザーの意図を軸とバリアントに翻訳

| ユーザー語                 | 推定軸           | 候補バリアント                              |
| -------------------------- | ---------------- | ------------------------------------------- |
| 「広めに」「ゆとり」       | `margin`         | `large`, `xlarge`（プロジェクト定義による） |
| 「青系」「ブランドカラー」 | `bgcolor`        | `blue`（プロジェクト定義による）            |
| 「横幅広く」「フル幅」     | `width`          | `full`, `large`（プロジェクト定義による）   |
| 「枠を付けて」             | `border`         | `solid`, `wide`                             |
| 「3 カラムで」             | `containerProps` | `type: 'grid'`, `columns: 3`                |
| 「センター寄せ」           | `containerProps` | `type: 'inline'`, `justify: 'center'`       |

**候補が複数あるときは必ずユーザーに聞く**。

### 5. spec を組み立て

```json
{
  "catalog": "image-text",
  "items": [...],
  "containerProps": { "type": "grid", "columns": 2 },
  "style": {
    "--bge-options-margin": "var(--bge-options-margin--large)",
    "--bge-options-bgcolor": "var(--bge-options-bgcolor--blue)"
  },
  "classList": ["my-section"]
}
```

`--bge-options-<軸>` の値は `var(--bge-options-<軸>--<バリアント>)` 形式が標準。

### 6. 計画提示 → 書き込み → 検証

`update-page.md` の標準手順に従う。

## してはいけないこと

- ❌ `style_options_list` を見ずに「`margin: 2rem` とか書いとけば良いだろう」と直接値を埋める
- ❌ プロジェクト CSS に存在しないバリアント名（`--bge-options-margin--massive` 等）を使う
- ❌ `classList` に任意のクラス名を勝手に追加する（`config.classList` の許可リストか、プロジェクト CSS に存在するもののみ）
