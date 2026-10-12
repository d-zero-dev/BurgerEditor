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

### 🤖 AI エージェント / スクリプトから操作したい方向け

Claude Code 等の AI エージェント、または非対話なスクリプトからページ・ブロックを編集したい方は次を参照してください：

- [@burger-editor/cli](./packages/@burger-editor/cli/) — JSON-only な CLI（`npx @burger-editor/cli <subcommand>`）
- [@burger-editor/mcp-server](./packages/@burger-editor/mcp-server/) — Model Context Protocol サーバー。v3 / v4 両対応
- [skills/editing-burger-editor-pages/](./skills/editing-burger-editor-pages/) — 既存ページのブロック編集向け SKILL
- [skills/building-burger-editor-projects/](./skills/building-burger-editor-projects/) — プロジェクト構築・カスタムブロック向け SKILL

`npx skills add d-zero-dev/BurgerEditor --skill editing-burger-editor-pages` のように `--skill` で個別に導入できます（省略すると両方が導入対象になります）。

**主な内容:**

- CLI / MCP 経由のページ・ブロック操作（create/read/update/delete）
- カタログ・アイテム・スタイルオプションのスキーマ取得
- 設定ファイル（`burgereditor.config.js`）の自動解決（cosmiconfig が親ディレクトリを walk-up）

### 👨‍💻 Contributor向け

BurgerEditor は Lerna + Yarn Workspaces のモノレポです。

- [ARCHITECTURE.md](./ARCHITECTURE.md) — パッケージの全体地図・境界・依存の向き・変更の種類ごとに読む場所
- [CLAUDE.md](./CLAUDE.md) — コマンド・ブランチ・テスト・依存追加のルール（AI エージェントと共通）

#### パッケージ一覧

| パッケージ                                                                 | バージョン                                                                                                                               | 説明                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [@burger-editor/core](./packages/@burger-editor/core/)                     | [![npm version](https://badge.fury.io/js/@burger-editor%2Fcore.svg)](https://badge.fury.io/js/@burger-editor%2Fcore)                     | エディタエンジンのコア実装                |
| [@burger-editor/client](./packages/@burger-editor/client/)                 | [![npm version](https://badge.fury.io/js/@burger-editor%2Fclient.svg)](https://badge.fury.io/js/@burger-editor%2Fclient)                 | ReactベースのクライアントUI               |
| [@burger-editor/blocks](./packages/@burger-editor/blocks/)                 | [![npm version](https://badge.fury.io/js/@burger-editor%2Fblocks.svg)](https://badge.fury.io/js/@burger-editor%2Fblocks)                 | 標準ブロックとアイテムの定義              |
| [@burger-editor/cli](./packages/@burger-editor/cli/)                       | [![npm version](https://badge.fury.io/js/@burger-editor%2Fcli.svg)](https://badge.fury.io/js/@burger-editor%2Fcli)                       | AI エージェント向け JSON-only CLI         |
| [@burger-editor/css](./packages/@burger-editor/css/)                       | [![npm version](https://badge.fury.io/js/@burger-editor%2Fcss.svg)](https://badge.fury.io/js/@burger-editor%2Fcss)                       | ブロック用スタイルシート                  |
| [@burger-editor/custom-element](./packages/@burger-editor/custom-element/) | [![npm version](https://badge.fury.io/js/@burger-editor%2Fcustom-element.svg)](https://badge.fury.io/js/@burger-editor%2Fcustom-element) | TipTap統合のWeb Components                |
| [@burger-editor/file-io](./packages/@burger-editor/file-io/)               | [![npm version](https://badge.fury.io/js/@burger-editor%2Ffile-io.svg)](https://badge.fury.io/js/@burger-editor%2Ffile-io)               | Node 側 fs / config / virtual-path 集約   |
| [@burger-editor/frozen-patty](./packages/@burger-editor/frozen-patty/)     | [![npm version](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty.svg)](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty)     | HTMLとJSONデータの相互変換ライブラリ      |
| [@burger-editor/inspector](./packages/@burger-editor/inspector/)           | [![npm version](https://badge.fury.io/js/@burger-editor%2Finspector.svg)](https://badge.fury.io/js/@burger-editor%2Finspector)           | HTML検査・検索ユーティリティ              |
| [@burger-editor/legacy](./packages/@burger-editor/legacy/)                 | [![npm version](https://badge.fury.io/js/@burger-editor%2Flegacy.svg)](https://badge.fury.io/js/@burger-editor%2Flegacy)                 | v3互換性サポート                          |
| [@burger-editor/local](./packages/@burger-editor/local/)                   | [![npm version](https://badge.fury.io/js/@burger-editor%2Flocal.svg)](https://badge.fury.io/js/@burger-editor%2Flocal)                   | ローカルファイルシステム向けCMS実装       |
| [@burger-editor/mcp-server](./packages/@burger-editor/mcp-server/)         | [![npm version](https://badge.fury.io/js/@burger-editor%2Fmcp-server.svg)](https://badge.fury.io/js/@burger-editor%2Fmcp-server)         | MCP (Model Context Protocol) サーバー実装 |
| [@burger-editor/migrator](./packages/@burger-editor/migrator/)             | [![npm version](https://badge.fury.io/js/@burger-editor%2Fmigrator.svg)](https://badge.fury.io/js/@burger-editor%2Fmigrator)             | バージョン間移行ツール                    |
| [@burger-editor/runtime](./packages/@burger-editor/runtime/)               | [![npm version](https://badge.fury.io/js/@burger-editor%2Fruntime.svg)](https://badge.fury.io/js/@burger-editor%2Fruntime)               | ブラウザ用ランタイムライブラリ            |
| [@burger-editor/utils](./packages/@burger-editor/utils/)                   | [![npm version](https://badge.fury.io/js/@burger-editor%2Futils.svg)](https://badge.fury.io/js/@burger-editor%2Futils)                   | 共通ユーティリティ関数                    |

#### 開発

```bash
git clone https://github.com/d-zero-dev/BurgerEditor.git
cd BurgerEditor
yarn install
yarn build
yarn test       # Docker 内で実行する（VR のスクリーンショットを CI と一致させるため）
yarn lint
yarn storybook  # 管理画面 UI のカタログ
```

- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) の形式に従ってください（`yarn commit`）
- PR は `dev` ブランチへ向けてください

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
