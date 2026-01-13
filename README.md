# BurgerEditor

[![Test](https://github.com/d-zero-dev/BurgerEditor/actions/workflows/test.yml/badge.svg)](https://github.com/d-zero-dev/BurgerEditor/actions/workflows/test.yml)

BurgerEditorは、プラットフォーム非依存のブロックエディタです。既存のCMSに統合したり、ローカル環境で利用できます。

## 対象ユーザー別ガイド

### 🏗️ CMS実装者向け

既存のCMSやWebアプリケーションにBurgerEditorを統合したい開発者の方は、[@burger-editor/client](./packages/@burger-editor/client/) のREADMEをご覧ください。

**主な内容:**

- BurgerEditorの統合方法
- `createBurgerEditorClient` APIの使用方法
- 実装例とカスタマイズ方法

### 🖥️ Local App利用者向け

ローカルファイルシステムでBurgerEditorを使いたい方は、[@burger-editor/local](./packages/@burger-editor/local/) のREADMEをご覧ください。

**主な内容:**

- インストールと起動方法
- 設定ファイルのカスタマイズ
- カスタムブロックの追加方法

### 👨‍💻 Contributor向け

BurgerEditorの開発に貢献したい開発者の方は、以下の情報をご覧ください。

#### モノレポ構成

BurgerEditorはLernaを使用したモノレポ構成を採用しています。各パッケージは明確な責任を持ち、再利用性とプラットフォーム非依存性を重視した設計になっています。

詳細なアーキテクチャについては [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。

#### パッケージ一覧

| パッケージ                                                                 | バージョン                                                                                                                               | 説明                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [@burger-editor/core](./packages/@burger-editor/core/)                     | [![npm version](https://badge.fury.io/js/@burger-editor%2Fcore.svg)](https://badge.fury.io/js/@burger-editor%2Fcore)                     | エディタエンジンのコア実装                |
| [@burger-editor/client](./packages/@burger-editor/client/)                 | [![npm version](https://badge.fury.io/js/@burger-editor%2Fclient.svg)](https://badge.fury.io/js/@burger-editor%2Fclient)                 | SvelteベースのクライアントUI              |
| [@burger-editor/blocks](./packages/@burger-editor/blocks/)                 | [![npm version](https://badge.fury.io/js/@burger-editor%2Fblocks.svg)](https://badge.fury.io/js/@burger-editor%2Fblocks)                 | 標準ブロックとアイテムの定義              |
| [@burger-editor/css](./packages/@burger-editor/css/)                       | [![npm version](https://badge.fury.io/js/@burger-editor%2Fcss.svg)](https://badge.fury.io/js/@burger-editor%2Fcss)                       | ブロック用スタイルシート                  |
| [@burger-editor/custom-element](./packages/@burger-editor/custom-element/) | [![npm version](https://badge.fury.io/js/@burger-editor%2Fcustom-element.svg)](https://badge.fury.io/js/@burger-editor%2Fcustom-element) | TipTap統合のWeb Components                |
| [@burger-editor/frozen-patty](./packages/@burger-editor/frozen-patty/)     | [![npm version](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty.svg)](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty)     | HTMLとJSONデータの相互変換ライブラリ      |
| [@burger-editor/inspector](./packages/@burger-editor/inspector/)           | [![npm version](https://badge.fury.io/js/@burger-editor%2Finspector.svg)](https://badge.fury.io/js/@burger-editor%2Finspector)           | HTML検査・検索ユーティリティ              |
| [@burger-editor/legacy](./packages/@burger-editor/legacy/)                 | [![npm version](https://badge.fury.io/js/@burger-editor%2Flegacy.svg)](https://badge.fury.io/js/@burger-editor%2Flegacy)                 | v3互換性サポート                          |
| [@burger-editor/local](./packages/@burger-editor/local/)                   | [![npm version](https://badge.fury.io/js/@burger-editor%2Flocal.svg)](https://badge.fury.io/js/@burger-editor%2Flocal)                   | ローカルファイルシステム向けCMS実装       |
| [@burger-editor/mcp-server](./packages/@burger-editor/mcp-server/)         | [![npm version](https://badge.fury.io/js/@burger-editor%2Fmcp-server.svg)](https://badge.fury.io/js/@burger-editor%2Fmcp-server)         | MCP (Model Context Protocol) サーバー実装 |
| [@burger-editor/migrator](./packages/@burger-editor/migrator/)             | [![npm version](https://badge.fury.io/js/@burger-editor%2Fmigrator.svg)](https://badge.fury.io/js/@burger-editor%2Fmigrator)             | バージョン間移行ツール                    |
| [@burger-editor/utils](./packages/@burger-editor/utils/)                   | [![npm version](https://badge.fury.io/js/@burger-editor%2Futils.svg)](https://badge.fury.io/js/@burger-editor%2Futils)                   | 共通ユーティリティ関数                    |

#### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/d-zero-dev/BurgerEditor.git
cd BurgerEditor

# 依存関係のインストール
yarn install

# すべてのパッケージをビルド
yarn build
```

#### ビルドとテスト

```bash
# すべてのパッケージをビルド
yarn build

# テストの実行
yarn vitest run

# Lintの実行
yarn lint
```

#### コントリビューションガイドライン

- プルリクエストを作成する前に、すべてのテストが通ることを確認してください
- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) の形式に従ってください
- コード変更時は適切なテストを追加してください
- Cursor Rulesとプロジェクトのコーディング規約に従ってください

## License

**Dual Licensed under MIT OR Apache-2.0**

This software is available under your choice of the following licenses:

1. **MIT License**
   Recommended when used as part of baserCMS or the official BurgerEditor Plugin,
   both developed and distributed by D-ZERO Co., Ltd.

2. **Apache License 2.0**
   For all other use cases, including standalone, third-party, or commercial use.

**Files:**

- `LICENSE-MIT` - MIT License text
- `LICENSE-APACHE-2.0` - Apache License 2.0 text
- `NOTICE` - Attribution notices (required for Apache 2.0)

For inquiries, contact: system@d-zero.co.jp
