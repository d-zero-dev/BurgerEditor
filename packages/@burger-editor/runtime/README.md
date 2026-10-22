# `@burger-editor/runtime`

BurgerEditor で生成された HTML にインタラクティブ機能を付与するブラウザ用ランタイム。画像モーダル（Invoker Commands API ベース）とカルーセルを提供する。

## Installation

```sh
yarn add @burger-editor/runtime
```

## Usage

```ts
import { autoInit } from '@burger-editor/runtime';

autoInit();
```

手動初期化が必要な場合は `initBurgerEditorRuntime(config)` または個別機能の `initImageModal(config)` / `initCarousel(config)` を使う。機能ごとに `false` を渡すと無効にできる（例: `initBurgerEditorRuntime({ carousel: false })`）。設定値は型定義を参照。

## カルーセル

`carousel` アイテムは、`@burger-editor/css` だけでも横スクロールと 1 枚ずつのスナップで表示できる。`initCarousel()` は、CSS だけでは表現できない次のものを補う。

- `::scroll-button()` / `::scroll-marker` に対応していないブラウザでの、前へ・次へボタンとドット
- ループ（末尾から先頭へ、先頭から末尾へ戻る）
- 自動再生。再生・停止ボタンを置き、キーボードフォーカスが入っている間とポインターが載っている間は止める。`prefers-reduced-motion: reduce` のときは停止した状態で始める
- フェード
- WAI-ARIA の Carousel パターンの役割と名前。名前は作者が書いた内容から付く（スライドとドットはキャプション、キャプションが空なら画像の `alt`）

Invoker Commands API に対応していないブラウザでは、操作部品と自動再生を出さず、CSS だけの表示のままにする。

`root` を渡すとその中だけを初期化する。初期化済みのカルーセルは、もう一度呼んでも初期化し直さない。戻り値の `destroy()` で初期化を取り消せる。

```ts
import { initCarousel } from '@burger-editor/runtime';

const carousel = initCarousel({ root: container, interval: 8000 });
carousel.destroy();
```

## ブラウザサポート

- 画像モーダル: Invoker Commands API（Baseline 2025）
- カルーセル: Baseline の機能（scroll snap・IntersectionObserver・Invoker Commands API・`inert`・`:focus-visible`）で動く。`::scroll-button()` / `::scroll-marker` に対応したブラウザでは、ループ・フェードでない限り矢印とドットを CSS に任せる

## ライセンス

MIT
