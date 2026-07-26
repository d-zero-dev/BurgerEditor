# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

BurgerEditor v4 は、プラットフォーム非依存の HTML ブロックエディタ。Lerna + Yarn Workspaces のモノレポ（`packages/@burger-editor/*` に15パッケージ）で、headless な core と宣言的 UI を分離した構成を取る。React UI・TipTap ベースの Web Components・ローカル CMS・MCP サーバー・v3 互換レイヤーを同一リポジトリで提供する。

Lerna は **fixed モード**で、全パッケージが同一バージョンで上がる。

## 実装把握の入口

コードを読み始める前に **[ARCHITECTURE.md](./ARCHITECTURE.md)** を読むこと。パッケージ構成と依存グラフ、レイヤー分離の原則、機能配置の判断基準、実験的機能の設計、TipTap 拡張の追加手順が記載されている。実装詳細の正は各ソースの JSDoc。

## プロジェクト構成

作業前に以下を確認してプロジェクトの状態を把握すること:

- `package.json` — scripts、`volta`（Node / Yarn バージョン）、`packageManager`
- `lerna.json` — バージョン管理モード（fixed）、対象パッケージ
- `tsconfig.json` — TypeScript 設定
- `vitest.config.ts` — テストプロジェクト定義（`default` / `blocks` / `client` / `core` / `local` / `vr` 等）
- `.yarnrc.yml` — Yarn の挙動（後述のサプライチェーン設定を含む）

## コマンド

```sh
yarn start                    # ローカル CMS サーバー起動
yarn build                    # 全パッケージビルド（lerna run build）
yarn dev                      # 全パッケージを watch（並列）
yarn clean                    # ビルド成果物削除
yarn test                     # 全テスト（VR 含む）を Docker 内で実行
yarn test:unit                # 同じテストをホストで実行（Docker を経由しない）
yarn test:vr                  # VR のみ（ホスト）
yarn test:vr:docker           # VR のみ（Docker）
yarn test:vr:docker:update    # VR ベースラインを更新
yarn lint                     # eslint / stylelint / markuplint / prettier / textlint / cspell
yarn commit                   # Commitizen（cz）でコミット
```

### コマンド制約

- **yarn のみ使用**: npm / pnpm / bun / deno によるコマンド実行は禁止
- **全体実行の強制**: 時間がかかっても `yarn build` / `yarn lint` / `yarn test` のリポジトリ全体実行を使う。`tsc` / `eslint` / `prettier` / `stylelint` の単発実行・ファイルスコープ実行（`npx eslint <file>` 等）は禁止
- **パッケージディレクトリに cd しない**: 常にリポジトリルートから実行する。個別パッケージを対象にする場合は `yarn workspace <package-name> <command>` を使う
- **コマンドの連続実行禁止**: `&&`、`;`、改行によるコマンド連結をしない。1回の Bash 呼び出しで1コマンドのみ実行する。連結されたコマンドは settings.json の permissions でパターンマッチできず、毎回ユーザーの手動承認が必要になる
- **main / dev ブランチでの作業・コミット禁止**: 作業開始前に `git branch --show-current` で現ブランチを確認し、`main` / `dev` にいる場合は `git switch -c <topic>` でトピックブランチを作ってから作業する
- **git worktree からのビルドは `NX_WORKSPACE_ROOT_PATH` 必須**: リポジトリ内部にネストした worktree（`.claude/worktrees/*` 等）から素の `yarn build` を実行すると、Nx がワークスペースルートをメインチェックアウトに誤解決し、**成功表示のまま成果物がメイン側に書かれる**（worktree の `lib/` は生成されない）。`NX_WORKSPACE_ROOT_PATH=<worktree絶対パス> yarn build` でルートを明示すること

## テスト

`yarn test` は `scripts/docker-yarn.sh` 経由で **linux/amd64 の Docker コンテナ（`bge-vr` イメージ）** 内でテストを実行する。VR（Visual Regression）のスクリーンショットが CI と pixel 単位で一致するようにするため。

- **初回はイメージビルドが走る**（Apple Silicon では QEMU エミュレーションのため遅い）。2回目以降は `node_modules` と Yarn キャッシュの named volume を再利用する
- **イメージの Node バージョンは `package.json` の `volta.node` から読まれる**。Node を上げるときは `volta.node` を更新すれば追従する（Dockerfile 側の書き換えは不要）
- `/.dockerenv` / `CI` / `SKIP_DOCKER` のいずれかがあると Docker ラッパーを飛ばして直接実行する。CI は自前の Playwright コンテナ内で動くため、入れ子の Docker にならない
- 開発中に VR 以外を素早く回したいときは `yarn test:unit`（ホスト実行）を使う
- **UI を意図的に変更したら `yarn test:vr:docker:update` でベースラインを再生成する**

## 依存関係の追加

- バージョンは固定で追加する（`yarn add foo@1.2.3`）。`^` / `~` を付けない（`.yarnrc.yml` の `defaultSemverRangePrefix: ''` で既定化されている）
- **追加したら `.github/renovate.json` の `packageRules` を確認する**。そのパッケージが既存の `groupName` グループに入るべきか、新しいグループを作るべきかを判断する
  - `config:recommended` は `group:monorepos` を含むため、**同一 monorepo から公開されるパッケージ群（`@vitest/*`、`@tiptap/*`、`playwright` 系など）は設定なしで自動的に束ねられる**。手で書く必要はない
  - 手当てが必要なのは Renovate が推測できない**ベンダー横断の結合**:
    - 本体と型定義のペア（`debug` + `@types/debug`）。DefinitelyTyped は別リポジトリで公開されるため自動グループ化されない
    - peer dependency で結ばれた別ベンダーのパッケージ（`hono` + `zod` + `@hono/zod-validator`）
    - `resolutions` で固定しているパッケージとその利用側
    - 自前の `@d-zero/*` パッケージ群
  - 判断基準は「**片方だけバージョンが上がった状態でビルドと型チェックが通るか**」。通らないなら同じ `groupName` にまとめる
- グループ化を怠ると、Renovate が個別に PR を作り、片方だけマージされた中間状態で CI が赤になる。結果として**両方の PR がマージできなくなる**
- グルーピングの現状は `git branch -r --list 'origin/renovate/*'` で確認できる。`*-monorepo` サフィックスのブランチは `group:monorepos` による自動グループ

## ドキュメント原則

情報は置き場で役割が決まる。**コードには How、テストコードには What、コミットログには Why、コードコメントには Why not**（Why が必要なときは Why も書く）。

- **JSDoc = 公開 API（export）の API ユーザー向け文書**: IDE ホバーで実装を読まない読者に届くため、WHAT / HOW / WHY を適切に書き、`@example` を必須とする。メインの公開 API は README にも載せる
- **非公開 API の JSDoc は必須にしない**: ただし複雑な内部モジュールの設計 WHY / Why not はファイルレベル JSDoc が推奨置き場
- **計画相対概念の禁止**: 実装計画に由来する相対概念（Phase / Step 番号、「本 PR」「今回」「旧実装」「導入予定」）を JSDoc・テスト名・ドキュメントに書かない。現在の挙動と意図的な不在（Why not）として自己完結に書く。外部参照は issue / PR 番号のみ可
- **ドキュメントと実装の矛盾**: 実装詳細の矛盾は実装が正としてドキュメントを直す。ARCHITECTURE.md のアーキテクチャ原則との矛盾は、実装が設計違反の可能性を先に調査する

## 構造ルール

- **`exports` を壊さない**: `package.json` の `exports` は差分追記のみ。既存の公開パスを削除しない。モノレポ内パッケージ間でも `exports` 経由でのみアクセスする
- **公開 API は厳選する**: `exports` で一括公開しない
- **レイヤーを跨いだ依存を作らない**: 依存方向は ARCHITECTURE.md の依存グラフに従う

## セキュリティ

### 機密情報の取り扱い

- `.env`、`.env.*` 等の機密ファイルを読み取り・編集・コミットしない（機密ファイルの判断は `.gitignore` を参考にすること）
- コミット前に `git diff --staged` で機密情報（API キー、トークン、パスワード、企業名、顧客情報）が含まれていないか確認する
- **サンプル値は予約済み慣例に従う**: ドメインは `example.com` / `*.example` / `*.test` 等（RFC 2606 / 6761）、IP は TEST-NET。実在の無関係ドメイン、未取得の創作ドメイン、案件識別子、実データの断片を成果物に残さない（詳細は `.claude/skills/git/SKILL.md` のサンプル値慣例チェック）
- 環境変数やシークレットをコード内にハードコードしない

### サプライチェーン保護

- **yarn dlx は完全禁止**: ローカルパッケージを使わずリモートから直接実行するため、サプライチェーン攻撃に脆弱
- **npx は原則使わない**: package.json の scripts で定義されたコマンドを `yarn <script>` で実行すること
- 新しい依存パッケージの追加は慎重に。既存の依存で解決できないか先に確認する
- `yarn add` する前にパッケージの信頼性（ダウンロード数、メンテナンス状況、既知の脆弱性）を確認する
- `yarn add` する場合はバージョンを固定する（例: `yarn add foo@1.2.3`）
- lockfile（yarn.lock）の手動編集は禁止
- **`.yarnrc.yml` の保護設定を無効化しない**: `enableScripts: false`（依存の install / postinstall を実行しない）と `npmMinimalAgeGate: 7d`（publish 後7日未満のパッケージを拒否）はサプライチェーン対策。自社パッケージを publish 直後に取り込むために一時的に外した場合は、`yarn.lock` 固定後に**必ず復元してコミットする**

## スキル

| スキル          | パス                                      | 用途                                                            |
| --------------- | ----------------------------------------- | --------------------------------------------------------------- |
| Grill me        | `.claude/skills/grill-me/SKILL.md`        | 計画・設計の前提を掘り下げて合意形成する                        |
| Impl            | `.claude/skills/impl/SKILL.md`            | 合意済み計画の実装・検証・PR 作成のオーケストレーション         |
| Git             | `.claude/skills/git/SKILL.md`             | コミット規約・コミット前コンテンツチェック                      |
| PR              | `.claude/skills/pr/SKILL.md`              | PR 作成フロー（base 追従・push はユーザー実行・CI 監視）        |
| npm publish     | `.claude/skills/npm-publish/SKILL.md`     | リリース（dev→main マージ・バージョニング・publish 監視・検証） |
| Refactor        | `.claude/skills/refactor/SKILL.md`        | テストファーストのリファクタリング手順                          |
| Product Manager | `.claude/skills/product-manager/SKILL.md` | リポジトリ分析、ドキュメント整合チェック、PR レビュー           |
| QA Engineer     | `.claude/skills/qa-engineer/SKILL.md`     | コードレビュー、テスト品質チェック                              |

> `skills/burger-editor-v4/` （リポジトリルート）は**利用者に配布する** BurgerEditor 操作スキルであり、`.claude/skills/` の開発用スキルとは別物。混同しないこと。

## AI 操作プロトコル

- **修正前にスキャンする**: 変更を始める前にパッケージ構造・依存関係・`exports` の現状を確認する
- **アーキテクチャガード**: 変更後に構造ルールと ARCHITECTURE.md の依存方向・レイヤー分離に違反していないかセルフチェックする
- **実装を勝手に広げない**: 合意したスコープの外に手を出さない
