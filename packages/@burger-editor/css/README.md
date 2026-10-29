# @burger-editor/css

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcss.svg)](https://badge.fury.io/js/@burger-editor%2Fcss)

BurgerEditor が生成する HTML 用のスタイルシートパッケージです。

## 公開ファイル

ビルド時に2つの CSS を出力します。

### `bge_style_default.css`（レイアウト）

レイアウトが書かれた CSS です。このファイルを直接変更することはおすすめしません。一部の値はカスタムプロパティ（CSS 変数）で上書きできます。

Vite や PostCSS などのビルドツールを使えば、パッケージ名から読み込めます。

```css
@import '@burger-editor/css';
```

baserCMS プラグインとして利用する場合、`setting.php`で`Bge.loadCSS.bge_style_default`を`false`にすると読み込まれなくなります。

#### カスタムプロパティ

- `--bge-grid-gap: 20px;`カラム間のマージン
- `--bge-column-margin-block-end: 20px;`レスポンシブレイアウトでカラムが落ちた時の下マージン
- `--bge-options-margin-normal: 1.5rem;`マージンのデフォルト値
- `--bge-options-margin-none: 0;`マージンの最小値（ブロックオプション）
- `--bge-options-margin-small: 1rem;`マージンの小さい値（ブロックオプション）
- `--bge-options-margin-large: 4rem;`マージンの大きい値（ブロックオプション）
- `--bge-options-bgcolor-gray: #efefef;`背景色のグレー（ブロックオプション）
- `--bge-options-bgcolor-blue: #d8f4ff;`背景色の青（ブロックオプション）
- `--bge-options-bgcolor-pink: #fee;`背景色のピンク（ブロックオプション）
- `--bge-options-border-bold: solid 5px currentcolor;`枠線の太い値（ブロックオプション）
- `--bge-options-border-thin: solid 1px currentcolor;`枠線の細い値（ブロックオプション）
- `--bge-options-border-dotted: dotted 1px currentcolor;`枠線の点線の値（ブロックオプション）
- `--bge-options-padding-with-border-or-bg: 1.5em;`ブロックオプションで背景色や枠線を使用した時のパディング
- `--bge-popup-max-inline-size: 95%;`画像タイプのポップアップで画像に使える最大の幅（CSS の長さ。`%`は画面に対する割合）
- `--bge-popup-max-block-size: 95%;`画像タイプのポップアップで画像に使える最大の高さ（CSS の長さ。`%`は画面に対する割合）

画像タイプの「クリックでポップアップ」の拡大表示（`<dialog class="bgt-popup">`）のスタイルもこのファイルに含まれます。このファイルを読み込まない場合は、`.bgt-popup`のスタイルを自前で用意してください。生成される要素とクラスの一覧は`@burger-editor/runtime`の README にあります。以前の`window.BgE.options.colorbox`（`maxWidth`/`maxHeight`）は無くなったので、上限は上記のカスタムプロパティで指定します。

### `bge_style.css`（コンテンツスタイルのサンプル）

コンテンツスタイルのサンプルです。テーマに合わせて上書きして使うことを想定しています（パッケージにも同梱されます）。

baserCMS プラグインとして利用する場合の読み込み優先順位:

1. テーマフォルダ: `webroot/theme/<テーマ名>/css/bge_style.css`
2. ウェブルート: `webroot/css/bge_style.css`
3. プラグインフォルダ: `Plugin/BurgerEditor/webroot/css/bge_style.css`

この優先順位を利用してスタイルを変更してください。

## ライセンス

Dual Licensed under MIT OR Apache-2.0
