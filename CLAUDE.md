# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

BurgerEditor v4 は、CMS に埋め込む HTML ブロックエディタ。Lerna + Yarn Workspaces のモノレポ（`packages/@burger-editor/*`）で、headless な core と React UI を分離し、TipTap の Web Components・ローカル CMS・CLI・MCP サーバー・v3 互換レイヤーを同じリポジトリで提供する。

## 実装把握の入口

コードを読み始める前に **[ARCHITECTURE.md](./ARCHITECTURE.md)** を読むこと。全体地図・境界と所有権・依存の向き・不変条件と、変更の種類ごとに読む場所が書いてある。実装詳細の正は各ソースの JSDoc、パッケージの使い方の正は各パッケージの README。

特定のパッケージにだけ関係する規約は `.claude/rules/` にあり、該当ファイルを触ると自動で読み込まれる。

## プロジェクト構成

作業前に以下を確認してプロジェクトの状態を把握すること:

- `package.json` — scripts、`volta`（Node / Yarn バージョン）、`packageManager`
- `lerna.json` — バージョン管理モード（fixed）、対象パッケージ
- `tsconfig.json` — TypeScript 設定
- `vitest.config.ts` — テストプロジェクト定義
- `.yarnrc.yml` — Yarn の挙動（後述のサプライチェーン設定を含む）

## コマンド

```sh
yarn start                    # ローカル CMS サーバー起動
yarn build                    # 全パッケージビルド（lerna run build）
yarn dev                      # 全パッケージを watch（並列）
yarn clean                    # ビルド成果物削除
yarn test                     # テストを Docker 内で実行（--project で絞る）
yarn test:unit                # 同じテストをホストで実行（VR は CI と一致しない）
yarn test:vr:docker           # VR のみ（Docker）
yarn test:vr:docker:update    # VR ベースラインを更新
yarn test:no-compiler         # React Compiler を無効にして client / blocks / blocks-editor を実行
yarn verify:*                 # CI と同じ構造検査（architecture-graph / react-compiler / blocks-boundary / packed-install。後の 2 つは build 後）
yarn lint                     # eslint / stylelint / markuplint / prettier / textlint / cspell
yarn commit                   # Commitizen（cz）でコミット
```

### コマンド制約

- **yarn のみ使用**: npm / pnpm / bun / deno によるコマンド実行は禁止
- **build / lint は全体実行**: 時間がかかっても `yarn build` / `yarn lint` のリポジトリ全体実行を使う。`tsc` / `eslint` / `prettier` / `stylelint` の単発実行・ファイルスコープ実行（`npx eslint <file>` 等）は禁止
- **test はプロジェクト単位**: ローカルでは変更に関連する Vitest プロジェクトだけを `yarn test --project <name>` で実行する（プロジェクト名は `vitest.config.ts` の `name`）。全体実行は CI に任せる。詳細は「テスト」節
- **パッケージディレクトリに cd しない**: 常にリポジトリルートから実行する。個別パッケージを対象にする場合は `yarn workspace <package-name> <command>` を使う
- **コマンドの連続実行禁止**: `&&`、`;`、改行によるコマンド連結をしない。1回の Bash 呼び出しで1コマンドのみ実行する。連結されたコマンドは settings.json の permissions でパターンマッチできず、毎回ユーザーの手動承認が必要になる
- **main / dev ブランチでの作業・コミット禁止**: 作業開始前に `git branch --show-current` で現ブランチを確認し、`main` / `dev` にいる場合は `git switch -c <topic>` でトピックブランチを作ってから作業する
- **git worktree からのビルドは `NX_WORKSPACE_ROOT_PATH` 必須**: リポジトリ内部にネストした worktree（`.claude/worktrees/*` 等）から素の `yarn build` を実行すると、Nx がワークスペースルートをメインチェックアウトに誤解決し、**成功表示のまま成果物がメイン側に書かれる**（worktree の `dist/` は生成されない）。`NX_WORKSPACE_ROOT_PATH=<worktree絶対パス> yarn build` でルートを明示すること

## テスト

`yarn test` は `scripts/docker-yarn.sh` 経由で **linux/amd64 の Docker コンテナ** 内でテストを実行する。VR（Visual Regression）のスクリーンショットを CI と画素単位で一致させるため。初回はイメージのビルドが走る（Apple Silicon では遅い）。イメージの Node は `package.json` の `volta.node` に追従する。

- **ローカル検証は関連プロジェクトのみ**: 変更したパッケージのテストを含むプロジェクトを `yarn test --project <name>`（複数可）で実行する。依存先パッケージを変更した場合は、利用側パッケージのプロジェクトも含める。引数なしの `yarn test`（全プロジェクト）は CI とリリース前（`prerelease`）が担う
- VR を含まないプロジェクトを素早く回すときは `yarn test:unit --project <name>`（ホスト実行）を使う
- **UI に関わる変更では `yarn test:vr:docker` も実行する**。UI を意図的に変えたら `yarn test:vr:docker:update` でベースラインを再生成してコミットに含める
- **Vitest は型チェックしない**。テストが通っても型エラーは `yarn build` でしか出ない
- `vitest.config.ts` にプロジェクトを追加したら `scripts/vitest-project-groups.js` にも登録する（未登録だと設定の読み込みで失敗する）
- React Compiler の有無で挙動が変わる不具合を疑うときは `BGE_NO_COMPILER=1 yarn test:unit` で切り分ける（CI は有効・無効の両方を回す）

## 依存関係の追加

- バージョンは固定で追加する（`yarn add foo@1.2.3`）。`^` / `~` を付けない（`.yarnrc.yml` の `defaultSemverRangePrefix: ''` で既定化されている）
- **モノレポ内のパッケージ間に依存を足したら、ARCHITECTURE.md の依存グラフも同じ変更で直す**（`yarn verify:architecture-graph` が CI で食い違いを落とす）。足してよい向きかは ARCHITECTURE.md の「依存の向き」で判断する
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
- **README は利用者向けの使い方だけ**: 内部実装の解説やファイル一覧を書かない
- **ARCHITECTURE.md は索引**: 全体地図・境界・依存の向き・不変条件・読み方に絞る。実装詳細の保存庫にしない
- **手順は Skill にする**: 何段階もある作業手順は `.claude/skills/` に置き、ARCHITECTURE.md からは名前で指す
- **計画相対概念の禁止**: 実装計画に由来する相対概念（Phase / Step 番号、「本 PR」「今回」「旧実装」「導入予定」）を JSDoc・テスト名・ドキュメントに書かない。現在の挙動と意図的な不在（Why not）として自己完結に書く。コードコメント・JSDoc・テスト名に issue / PR 番号も書かず、理由そのものを書く（例外は PR 本文とコミットメッセージ）
- **ドキュメントと実装の矛盾**: 実装詳細の矛盾は実装が正としてドキュメントを直す。ARCHITECTURE.md の依存の向き・不変条件との矛盾は、実装が設計違反の可能性を先に調査する

## 構造ルール

- **`exports` を壊さない**: `package.json` の `exports` は差分追記のみ。既存の公開パスを削除しない。モノレポ内パッケージ間でも `exports` 経由でのみアクセスする
- **公開 API は厳選する**: `exports` で一括公開しない
- **依存してよいのは ARCHITECTURE.md の依存グラフの矢印だけ**: 新しい矢印は「依存の向き」に反しないか確かめてから足す

## 判断基準

- **変更・修正・レビュー指摘を採用するかは 2 つで決める**: CMS に埋め込むブロックエディタとして、編集操作がブロック定義（`blocks` のアイテム）どおりの HTML を生成・保存し、保存済みのページ（v3 互換の `legacy` / `migrator` が扱うものを含む）を壊さないこと、そして ARCHITECTURE.md の依存の向きと不変条件を守ること。製品の振る舞いでない変更（tooling・docs・CI・skills）では「宣言した意図に対する正しさ」と「既存コードとの一貫性」。実装コスト、diff の大きさ、影響件数、「軽微」は基準ではなく、スキップ・先送り・質問の理由にならない
- **基準が決めることは聞かずにやる**。質問は、基準が決めないことと、リポジトリ外への書き込みのためにある（質問の種別は `impl` スキルが定める）。Claude は「持ち越す」「スキップする」「そのままにする」を自分で決めない。それらは質問に対するユーザーの回答としてだけ存在し、「あとで」「別 PR で」「意図的に変更しない」と書く応答・PR 本文・コミットは、その質問と回答を指せなければならない
- **レビュー指摘は直すか、証拠を添えてユーザーに出す**。「false positive」「元からあった」「意図どおり」はユーザーに対して主張することであって、Claude が 1 人で指摘を閉じる手段ではない

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

| スキル           | パス                                                                 | 用途                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grill me         | `.claude/skills/grill-me/SKILL.md`                                   | 計画・設計の前提を掘り下げて合意形成する                                                                                                                  |
| Impl             | `.claude/skills/impl/SKILL.md`                                       | 合意済み計画の実装・検証・持ち越しの Issue 化・PR 作成・マージ後の台帳確認                                                                                |
| Git              | `.claude/skills/git/SKILL.md`                                        | コミット規約・コミット前コンテンツチェック・破壊的変更の扱い                                                                                              |
| PR               | `.claude/skills/pr/SKILL.md`                                         | PR 作成フロー（base 追従・本文の節構成・push はユーザー実行・CI 監視）                                                                                    |
| Merged           | `.claude/skills/merged/SKILL.md`                                     | マージ後の手順（外部作者への完了コメント・issue への報告）                                                                                                |
| Create issue     | `.claude/skills/create-issue/SKILL.md`                               | 原因まで調べて Issue を起票する（持ち越しの引き継ぎ先）                                                                                                   |
| npm publish      | `.claude/skills/npm-publish/SKILL.md`                                | リリース（dev→main マージ・バージョニング・publish 監視・検証）                                                                                           |
| Refactor         | `.claude/skills/refactor/SKILL.md`                                   | テストファーストのリファクタリング手順                                                                                                                    |
| Product Manager  | `.claude/skills/product-manager/SKILL.md`                            | リポジトリ分析、ドキュメント整合チェック、PR レビュー                                                                                                     |
| QA Engineer      | `.claude/skills/qa-engineer/SKILL.md`                                | コードレビュー、テスト品質チェック                                                                                                                        |
| TipTap extension | `.claude/skills/tiptap-extension/SKILL.md`                           | `custom-element` の Wysiwyg に TipTap 拡張・ツールバーボタンを組み込む手順                                                                                |
| Hono             | `.claude/skills/hono/SKILL.md`（`.agents/skills/hono` への symlink） | Hono 公式 Agent Skill。ルーティング・middleware・JSX・testing・WebSocket 等の inline API リファレンス。更新はユーザーが手動で行う（`npx skills add ...`） |

> リポジトリルートの `skills/`（`editing-burger-editor-pages/` / `building-burger-editor-projects/`）は**利用者に配布する** BurgerEditor 操作スキルであり、`.claude/skills/` の開発用スキルとは別物。混同しないこと。

## AI 操作プロトコル

- **修正前にスキャンする**: 変更を始める前にパッケージ構造・依存関係・`exports` の現状を確認する
- **アーキテクチャガード**: 変更後に構造ルールと ARCHITECTURE.md の依存の向き・不変条件に違反していないかセルフチェックする
- **実装を勝手に広げない**: 合意したスコープの外に手を出さない
