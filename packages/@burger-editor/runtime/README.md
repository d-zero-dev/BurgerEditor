# @burger-editor/runtime

[![npm version](https://badge.fury.io/js/@burger-editor%2Fruntime.svg)](https://badge.fury.io/js/@burger-editor%2Fruntime)

BurgerEditor で作成したコンテンツを公開ページで動かすスクリプト（`bge_functions.min.js`）です。jQuery などのライブラリは必要ありません。

## 使い方

スタイル（`@burger-editor/css`の`bge_style_default.css`）と一緒に読み込みます。

```html
<link rel="stylesheet" href="/path/to/bge_style_default.css" />
<script src="/path/to/bge_functions.min.js" defer></script>
```

読み込むと`DOMContentLoaded`でページ全体（`document`）を初期化します。初期化するのは次のコンテンツです。

- 画像タイプの「クリックでポップアップ」（`[data-bge-popup="1"]`/`[data-bge-popup="true"]`の中のリンクと、古い`.bgt-colorbox`）
- ギャラリータイプ（`[data-bgt="gallery"]`）
- YouTube タイプ（`.bgt-youtube`）。YouTube IFrame API はこのスクリプトが読み込みます
- Google Maps タイプ（`.bgt-google-maps`）。Google Maps JavaScript API をページで読み込んでいるときだけ初期化します

### 後から追加したコンテンツを初期化する

Ajax などで後から差し込んだコンテンツは、`window.BgE.execute()`に起点の要素を渡して初期化します。同じ要素を二度初期化しても二重にはなりません。

```js
window.BgE.execute(document.querySelector('#inserted'));
```

### ギャラリーの初期化処理を差し替える

`window.BgE.options.gallery`に関数を置くと、組み込みのスライドショーの代わりに呼ばれます。`this`と第 2 引数はギャラリーのルート要素（`[data-bgt="gallery"]`）です。`false`を返すと以降のギャラリーを処理しません。スクリプトを読み込む前に定義します。

```html
<script>
	window.BgE = {
		options: {
			gallery(i, el) {
				mySlider(el.querySelector('.bgt-gallery'));
			},
		},
	};
</script>
<script src="/path/to/bge_functions.min.js" defer></script>
```

`window.BgE.execute(root, options)`の第 2 引数にも同じ形のオプションを渡せます。

## 画像のポップアップ

ページ内のポップアップ画像をまとめて 1 つのグループとして扱い、`<dialog class="bgt-popup">`を`body`の末尾に 1 つ生成して表示します。

- 表示中の画像をクリック、`←`/`→`キー、前へ・次へのボタンで移動します（末尾の次は先頭）
- `Esc`、閉じるボタン、背景のクリックで閉じ、最後に表示していた画像のリンクにフォーカスが戻ります
- タイトルはリンクの`title`属性、拡大画像の代替テキストは元の画像の`alt`です
- 画像は画面の 95% に収まるよう縮小します。上限は CSS カスタムプロパティ`--bge-popup-max-inline-size`/`--bge-popup-max-block-size`（`:root`に指定。CSS の長さで、`%`は画面に対する割合）で変えられます

生成する要素は次のとおりです。`bge_style_default.css`を読み込まない場合は、これらのスタイルを自前で用意してください。

```html
<dialog class="bgt-popup" aria-label="拡大画像">
	<div class="bgt-popup__box">
		<div class="bgt-popup__content">
			<div class="bgt-popup__loaded">
				<img class="bgt-popup__photo" />
				<p class="bgt-popup__error" hidden>This image failed to load.</p>
				<div class="bgt-popup__loading"></div>
			</div>
			<div class="bgt-popup__title"></div>
			<div class="bgt-popup__current">1 / 3</div>
			<button class="bgt-popup__prev">前の画像</button>
			<button class="bgt-popup__next">次の画像</button>
			<button class="bgt-popup__close">閉じる</button>
		</div>
	</div>
</dialog>
```

- 画像の読み込み中は`<dialog>`に`bgt-popup--loading`が付きます
- タイトルが無いとき、画像が 1 枚だけのとき（前へ・次へ・枚数）は要素に`hidden`属性が付きます

## ギャラリー

`[data-bgt="gallery"]`の中の`.bgt-gallery`の`data-gallery-*`属性（効果・時間・自動再生・コントローラ・マーカー）を読んでスライドショーにします。生成する要素は次のとおりです。

- `ul.bgt-gallery-marker > li`（`[data-bgt="gallery"]`の末尾）。表示中の`li`と`.bgt-gallery__item`に`current`が付きます
- `data-gallery-ctrl="true"`のとき`.bgt-gallery-ctrl`（`.bgt-gallery`の末尾）と、その中の`button.bgt-gallery-ctrl__prev`/`button.bgt-gallery-ctrl__next`。先頭・末尾で`bgt-gallery-ctrl__state-is-first`/`bgt-gallery-ctrl__state-is-last`が付きます

## 動作環境

`<dialog>`要素の`showModal()`に対応したブラウザで動きます。対応していないブラウザでは画像のポップアップは開きません。

## ライセンス

Dual Licensed under MIT OR Apache-2.0
