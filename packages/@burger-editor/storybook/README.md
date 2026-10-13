# `@burger-editor/storybook`

管理画面 UI（`@burger-editor/client` のコンポーネントと Front Matter 編集 UI）を、実際のエンジンを立ち上げずに一覧・確認するための Storybook。private パッケージで、npm には公開しない。

## 使い方

リポジトリのルートから実行する。

```sh
yarn storybook        # 開発サーバー（http://localhost:6006）
yarn build-storybook  # 静的ビルド
```

## 方針

- **見た目の確認専用。** 見た目の回帰検出は `client` の VR テスト（`vr` プロジェクト）が担う。Storybook には test-runner や Chromatic を入れない。
- **エンジンは `@burger-editor/client/testing` の `createMockEngine()` で作る。** `uiState` / `commandBus` は本物を使い、コンポーネントが呼ぶメソッドだけを差し込む。
- **モックで再現できないコンポーネントは、描画だけを受け持つ子コンポーネントを切り出してカタログに載せる。** 例: マウス位置から実際のブロックを解決する `BlockMenu` は、描画部分の `BlockMenuView` を載せる。
