# @burger-editor/blocks

## 概要

ブロックエディタの標準ブロックと標準アイテムを提供するパッケージです。

## ブロックの仕様

### ブロックの構成

```html
<div data-bge-name="{ブロック名}" data-bge-container="inline:center:wrap">
	<div data-bge-group>
		<div data-bge-item>{アイテムの01HTML}</div>
		<div data-bge-item>{アイテムの02HTML}</div>
	</div>
	<div data-bge-group>
		<div data-bge-item>{アイテムの01HTML}</div>
		<div data-bge-item>{アイテムの02HTML}</div>
	</div>
	<div data-bge-group>
		<div data-bge-item>{アイテムの01HTML}</div>
		<div data-bge-item>{アイテムの02HTML}</div>
	</div>
</div>
```

### ブロックを構成する要素

#### コンテナ

`data-bge-container`属性はコンテナの性質を表します。ブロックのルート要素にあたります。属性値はコロン区切りで表現し、先頭はコンテナのタイプを表し、その後にオプションが続きます。

`data-bge-name`属性はブロックの名前を表します。ブロック選択の際に利用されますが、振る舞いには影響しません（⚠️ つまり、この属性を利用したスタイル変更は推奨されません）。

##### コンテナタイプ

アイテムの配置方法を表します。

- `grid`: グリッドに並べる（ `display: block grid;` ）
- `inline`: インライン方向に並べる（ `display: block flex;` ）
- `float`: 先頭のアイテムを回り込みさせる

##### `grid`オプション

- `[数値]`: グリッドの列数（ `grid-template-columns: repeat([数値], 1fr);` ） 1〜5の範囲で指定可能

例: `data-bge-container="grid:3"`

##### `inline`オプション

- `center`: 中央寄せ（ `justify-content: center;` ）
- `start`: 左寄せ（ `justify-content: start;` ）
- `end`: 右寄せ（ `justify-content: end;` ）
- `between`: 両端寄せ（ `justify-content: space-between;` ）
- `around`: 左右余白均等（ `justify-content: space-around;` ）
- `evenly`: 要素間均等（ `justify-content: space-evenly;` ）
- `align-center`: 垂直中央寄せ（ `align-items: center;` ）
- `align-start`: 上寄せ（ `align-items: start;` ）
- `align-end`: 下寄せ（ `align-items: end;` ）
- `align-stretch`: 伸縮（ `align-items: stretch;` ）
- `align-baseline`: ベースライン（ `align-items: baseline;` ）
- `wrap`: 折り返し（ `flex-wrap: wrap;` ）
- `nowrap`: 折り返さない（ `flex-wrap: nowrap;` ）

例: `data-bge-container="inline:space-between:wrap"`

##### `float`オプション

- `start`: 左寄せ（ `float: inline-start;` ）
- `end`: 右寄せ（ `float: inline-end;` ）

例: `data-bge-container="float:start"`

##### 共通オプション

- `immutable`: コンテナのタイプやオプションを変更できない

#### グループ

グループは`data-bge-group`属性をもつ任意の要素です。コンテナ内の直下に配置され、アイテムのまとまりをつくります。このグループは「要素の追加/削除」機能で**増減することができます**。グループがない場合は「要素の追加/削除」機能が無効になります。

#### アイテム

アイテムは`data-bge-item`属性をもつ要素で、コンテンツ編集可能な要素をラップします。
