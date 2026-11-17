# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

BurgerEditor v4 は、CMS に埋め込む HTML ブロックエディタ。Lerna + Yarn Workspaces のモノレポ（`packages/@burger-editor/*`）で、headless な core と React UI を分離し、TipTap の Web Components・ローカル CMS・CLI・MCP サーバー・v3 互換レイヤーを同じリポジトリで提供する。

## 実装把握の入口

コードを読み始める前に **[ARCHITECTURE.md](./ARCHITECTURE.md)** を読むこと。全体地図・境界と所有権・依存の向き・不変条件と、変更の種類ごとに読む場所が書いてある。実装詳細の正は各ソースの JSDoc、パッケージの使い方の正は各パッケージの README。

特定のパッケージにだけ関係する規約は`.claude/rules/`にあり、該当ファイルを触ると自動で読み込まれる。

## プロジェクト構成

作業前に以下を確認してプロジェクトの状態を把握すること:

- `package.json` — scripts、`volta`（Node/Yarn バージョン）、`packageManager`
- `lerna.json` — バージョン管理モード（fixed）、対象パッケージ
- `tsconfig.json` — TypeScript 設定
- `vitest.config.ts` — テストプロジェクト定義
- `.yarnrc.yml` — Yarn の挙動（後述のサプライチェーン設定を含む）

## ブランチ構成

| ライン | ブランチ | 役割          | 受け取るもの                                                                                         | Renovate                                         |
| ------ | -------- | ------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `v4`   | `dev`    | `prerelease`  | 新機能・修正・依存更新。リリースは`main`に`dev`をマージして切る                                      | すべて。`dependencies`のメジャーだけレビュー待ち |
| `v3`   | `v3`     | `maintenance` | 脆弱性修正・不具合修正。v4 の正式版の後は脆弱性修正のみで、v4 の正式版の公開日から 12 か月で終了する | 脆弱性修正と lock file maintenance のみ          |

- **ラインの定義は`scripts/release-lines/lines.mjs`**。ブランチ名を書くファイル（`.github/renovate.json`・ワークフロー・`.husky/pre-commit`・この表・`SECURITY.md`）との食い違いは`yarn test --project scripts`が落とす。ラインを入れ替える手順は`major-rotation`スキル
- **`main`は v4 のリリース元**: `dev`をマージして`yarn release`でバージョンを切り、タグを push する（`npm-publish`スキル）。`main`の push でも`test.yml`が走る。通常の作業は`main`に積まない
- **`dev`は merge queue 経由でマージする**: 必須チェックは`ci-ok`（`test.yml`の`test`と`test-no-compiler`の集約。ジョブを足したら`ci-ok`の`needs`にも足す。`yarn test --project scripts`が食い違いを落とす）。PR を作ったら CI を待ち、マージはキューが行う（Renovate は auto-merge でキューに入る）。`test.yml`は`dev`への push では走らず（キューが、マージ結果に対して`merge_group`で走らせる）、admin のバイパスで`dev`へ直接 push した場合は CI が走らない
- **リポジトリ外の設定に依存している**（コードを見ても分からないので、復旧するときや公開パッケージを足すときに確かめる）: (a)`dev`・`main`・`v3`の ruleset（`dev`は merge queue で、マージ方式はマージコミット、必須チェックは`ci-ok`）、(b) GitHub の private vulnerability reporting（`SECURITY.md`の報告先）、(c) npmjs.com の各パッケージの Trusted Publisher（`publish.yml`からの公開を許す設定。`npm trust github <package> --file publish.yml --repository d-zero-dev/BurgerEditor --allow-publish`。公開パッケージを足したら設定する。ただし、registry に一度も公開されていないパッケージには設定できないので、新しいパッケージの最初の公開だけは手で行い、その後に設定する。手順は`d-zero-dev/repos-manager`の`npm-oidc-trusted-publishing-setup.md`）
- **公開の後に CI から`npm dist-tag`は実行しない**: 実行するには、パッケージごとに npmjs.com の Trusted Publisher で「Allow npm dist-tag」を設定する画面操作が要る（npm 11 と 12 の`npm trust`にはそのフラグがない）。その設定をしない代わりに、正式版のない v4 専用パッケージの`latest`は最初の正式版まで動かず、バージョンを指定しないインストールは古い alpha になる（`alpha`が最新を指す。READMEs と skills のコマンドは`@alpha`を付けている）。dist-tag は`lerna publish --dist-tag`が公開時に付ける。`latest`を手で動かす手順は`npm-publish`スキルの手順 10
- **`v3`への変更**は、`v3`から切ったトピックブランチで作り、base を`v3`にして PR を作る。`v3`は v3 系の別のコードベースで、`dev`からのマージはしない。`v3`のリリースは、`v3`の`publish.yml`が`dev`とは別の判定（正式版だけを公開）を持つので、`npm-publish`スキルの「v3 のリリース」に従う
- **`.husky/pre-commit`が止めるのは`dev`への直接コミット**。`main`と`v3`は`lerna version`がリリースのコミットを書く場所なので止めない（作業のコミットを直接積まない規則は変わらない）
- Renovate のブランチ名は、対象ブランチごとに`renovate/dev-*`/`renovate/v3-*`になる
- 未リリースの変更は`release-reminder`ワークフローが Issue にして知らせる（利用者に届く変更が 3 日リリースされないとき）

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
yarn lint                     # eslint / stylelint / markuplint / prettier / textlint / cspell / renovate（renovate.json の検証）
yarn commit                   # Commitizen（cz）でコミット
```

### コマンド制約

- **yarn のみ使用**: npm/pnpm/bun/deno によるコマンド実行は禁止
- **build / lint は全体実行。lint は build の後**: 時間がかかっても`yarn build`/`yarn lint`のリポジトリ全体実行を使う。`yarn lint`は必ず`yarn build`の後に実行する（CI も Build → Lint の順）。ESLint の型を使うルールはビルド成果物（`dist/`）から型情報を得るため、ビルド前に実行すると誤判定し、`--fix`が型の断言（`as`・`!`）や理由付きの`eslint-disable`を無関係なファイルから消してしまう。`tsc`/`eslint`/`prettier`/`stylelint`の単発実行・ファイルスコープ実行（`npx eslint <file>`等）は禁止
- **`lint:renovate`は`RENOVATE_X_IGNORE_RE2=true`付きで実行する**（`package.json`のとおり）: `.yarnrc.yml`の`enableScripts: false`で`renovate`の RE2（ネイティブの正規表現エンジン）がビルドされず、付けないと毎回警告のスタックトレースが出る。RE2 なしの標準の正規表現で検証するので、RE2 にしかない制約は検出できない。ネイティブのビルドを許すか、`renovate`を使わなくなったら外す
- **test はプロジェクト単位**: ローカルでは変更に関連する Vitest プロジェクトだけを`yarn test --project <name>`で実行する（プロジェクト名は`vitest.config.ts`の`name`）。全体実行は CI に任せる。詳細は「テスト」節
- **パッケージディレクトリに cd しない**: 常にリポジトリルートから実行する。個別パッケージを対象にする場合は`yarn workspace <package-name> <command>`を使う
- **コマンドの連続実行禁止**: `&&`、`;`、改行によるコマンド連結をしない。1回の Bash 呼び出しで1コマンドのみ実行する。連結されたコマンドは settings.json の permissions でパターンマッチできず、毎回ユーザーの手動承認が必要になる
- **main / dev / v3 ブランチでの作業・コミット禁止**: 作業開始前に`git branch --show-current`で現ブランチを確認し、`main`/`dev`/`v3`にいる場合は`git switch -c <topic>`でトピックブランチを作ってから作業する。例外は`lerna version`が書くリリースのコミットだけ（`npm-publish`スキル）
- **git worktree からのビルドは`NX_WORKSPACE_ROOT_PATH`必須**: リポジトリ内部にネストした worktree（`.claude/worktrees/*`等）から素の`yarn build`を実行すると、Nx がワークスペースルートをメインチェックアウトに誤解決し、**成功表示のまま成果物がメイン側に書かれる**（worktree の`dist/`は生成されない）。`NX_WORKSPACE_ROOT_PATH=<worktree絶対パス> yarn build`でルートを明示すること

## テスト

`yarn test`は`scripts/docker-yarn.sh`経由で **linux/amd64 の Docker コンテナ** 内でテストを実行する。VR（Visual Regression）のスクリーンショットを CI と画素単位で一致させるため。初回はイメージのビルドが走る（Apple Silicon では遅い）。イメージの Node は`package.json`の`volta.node`に追従する。

- **ローカル検証は関連プロジェクトのみ**: 変更したパッケージのテストを含むプロジェクトを`yarn test --project <name>`（複数可）で実行する。依存先パッケージを変更した場合は、利用側パッケージのプロジェクトも含める。引数なしの`yarn test`（全プロジェクト）は CI とリリース前（`prerelease`）が担う
- VR を含まないプロジェクトを素早く回すときは`yarn test:unit --project <name>`（ホスト実行）を使う
- **UI コンポーネントを追加・変更したら story も合わせる**: `storybook`パッケージに、それに沿った story を同じ変更で足すか直す（1 つの story に 1 つの状態）。story はテストではないので、振る舞いの検査はプロジェクトのテストに書く
- **UI に関わる変更では`yarn test:vr:docker`も実行する**。UI を意図的に変えたら`yarn test:vr:docker:update`でベースラインを再生成してコミットに含める
- **Vitest は型チェックしない**。テストが通っても型エラーは`yarn build`でしか出ない
- `vitest.config.ts`にプロジェクトを追加したら`scripts/vitest-project-groups.js`にも登録する（未登録だと設定の読み込みで失敗する）
- React Compiler の有無で挙動が変わる不具合を疑うときは`BGE_NO_COMPILER=1 yarn test:unit`で切り分ける（CI は有効・無効の両方を回す）

## 依存関係の追加

- バージョンは固定で追加する（`yarn add foo@1.2.3`）。`^`/`~`を付けない（`.yarnrc.yml`の`defaultSemverRangePrefix: ''`で既定化されている）
  - **例外は公開パッケージの外部の`dependencies`と`peerDependencies`**: `^`の範囲で書く（`yarn add foo@^1.2.3`）。利用者のインストールが、リリースした版より古い版に重複排除されたり、`react`の版が 1 つ違うだけで peer の条件に合わなくなったりしないため。`.github/renovate.json`の`rangeStrategy: bump`のルールが、更新のたびに下限を上げる。ワークスペース内のパッケージ同士（lerna の`--exact`）、`devDependencies`、private の`storybook`は固定のまま。`scripts/published-ranges.spec.mjs`（`yarn test --project scripts`）がこの書き方の食い違いを落とす。**下限を上げる副作用**: `peerDependencies`の下限も、更新のたびに（minor/patch は自動マージで）上がり、下限より古い版を使う利用者は、その版以降の peer の条件に合わなくなる。alpha の間は許容しているが、正式版以降は破壊的変更に当たるので、そのときに peer を`bump`から外すか見直す
  - 利用者側のサプライチェーン保護（公開からの待ち時間）は利用者の設定でしか効かない。README と`SECURITY.md`で設定を推奨している
  - **`playwright`の版を変えるときは、`test.yml`と`Dockerfile.vr`のイメージタグ（`mcr.microsoft.com/playwright:v<版>-noble`）も同じ版にする**。ブラウザのビルドが版ごとに違い、ずれると`Executable doesn't exist`で落ちる。Renovate は npm の版に連動して 1 つの PR で直し、食い違いは`yarn test --project scripts`が検出する。イメージは digest で固定しない（digest はタグより優先されるので、タグだけ上がると古いブラウザが残る）
- **GitHub Actions（`uses:`）は、commit の digest で固定し、コメントは完全な版（`# v7.0.1`）にする**。浮動のタグ（`# v7`）だと、Renovate が更新の古さ（`minimumReleaseAge`の 7 日）を測る基準の版がなく、`renovate/stability-days`が永遠に pending になって、更新が自動マージされない。`renovate.json`の`helpers:pinGitHubActionDigestsToSemver`が完全な版を書き、手書きの食い違いは`yarn test --project scripts`が検出する。`v3`の Renovate は digest の更新を出さないので、`v3`は手で更新する
- **モノレポ内のパッケージ間に依存を足したら、ARCHITECTURE.md の依存グラフも同じ変更で直す**（`yarn verify:architecture-graph`が CI で食い違いを落とす）。足してよい向きかは ARCHITECTURE.md の「依存の向き」で判断する
- **追加したら`.github/renovate.json`の`packageRules`を確認する**。そのパッケージが既存の`groupName`グループに入るべきか、新しいグループを作るべきかを判断する
  - `config:recommended`は`group:monorepos`を含むため、**同一 monorepo から公開されるパッケージ群（`@vitest/*`、`@tiptap/*`、`playwright`系など）は設定なしで自動的に束ねられる**。手で書く必要はない
  - 手当てが必要なのは Renovate が推測できない**ベンダー横断の結合**:
    - 本体と型定義のペア（`debug` + `@types/debug`）。DefinitelyTyped は別リポジトリで公開されるため自動グループ化されない
    - peer dependency で結ばれた別ベンダーのパッケージ（`hono` + `zod` + `@hono/zod-validator`）
    - `resolutions`で固定しているパッケージとその利用側
    - 自前の`@d-zero/*`パッケージ群
  - 判断基準は「**片方だけバージョンが上がった状態でビルドと型チェックが通るか**」。通らないなら同じ`groupName`にまとめる
- グループ化を怠ると、Renovate が個別に PR を作り、片方だけマージされた中間状態で CI が赤になる。結果として**両方の PR がマージできなくなる**
- グルーピングの現状は`git branch -r --list 'origin/renovate/*'`で確認できる。`*-monorepo`サフィックスのブランチは`group:monorepos`による自動グループ。対象ブランチが`dev`と`v3`の 2 つなので、ブランチ名は`renovate/dev-*`/`renovate/v3-*`になる

## ドキュメント原則

情報は置き場で役割が決まる。**コードには How、テストコードには What、コミットログには Why、コードコメントには Why not**（Why が必要なときは Why も書く）。

- **JSDoc = 公開 API（export）の API ユーザー向け文書**: IDE ホバーで実装を読まない読者に届くため、WHAT/HOW/WHY を適切に書き、`@example`を必須とする。メインの公開 API は README にも載せる
- **非公開 API の JSDoc は必須にしない**: ただし複雑な内部モジュールの設計 WHY/Why not はファイルレベル JSDoc が推奨置き場
- **README は利用者向けの使い方だけ**: 内部実装の解説やファイル一覧を書かない
- **ARCHITECTURE.md は索引**: 全体地図・境界・依存の向き・不変条件・読み方に絞る。実装詳細の保存庫にしない
- **手順は Skill にする**: 何段階もある作業手順は`.claude/skills/`に置き、ARCHITECTURE.md からは名前で指す
- **計画相対概念の禁止**: 実装計画に由来する相対概念（Phase/Step 番号、「本 PR」「今回」「旧実装」「導入予定」）を JSDoc・テスト名・ドキュメントに書かない。現在の挙動と意図的な不在（Why not）として自己完結に書く。コードコメント・JSDoc・テスト名に issue/PR 番号も書かず、理由そのものを書く（例外は PR 本文とコミットメッセージ）
- **ドキュメントと実装の矛盾**: 実装詳細の矛盾は実装が正としてドキュメントを直す。ARCHITECTURE.md の依存の向き・不変条件との矛盾は、実装が設計違反の可能性を先に調査する

## 構造ルール

- **`exports`を壊さない**: `package.json`の`exports`は差分追記のみ。既存の公開パスを削除しない。モノレポ内パッケージ間でも`exports`経由でのみアクセスする
- **公開 API は厳選する**: `exports`で一括公開しない
- **依存してよいのは ARCHITECTURE.md の依存グラフの矢印だけ**: 新しい矢印は「依存の向き」に反しないか確かめてから足す

## 判断基準

- **変更・修正・レビュー指摘を採用するかは 2 つで決める**: CMS に埋め込むブロックエディタとして、編集操作がブロック定義（`blocks`のアイテム）どおりの HTML を生成・保存し、保存済みのページ（v3 互換の`legacy`/`migrator`が扱うものを含む）を壊さないこと、そして ARCHITECTURE.md の依存の向きと不変条件を守ること。製品の振る舞いでない変更（tooling・docs・CI・skills）では「宣言した意図に対する正しさ」と「既存コードとの一貫性」。実装コスト、diff の大きさ、影響件数、「軽微」は基準ではなく、スキップ・先送り・質問の理由にならない
- **基準が決めることは聞かずにやる**。質問は、基準が決めないことと、リポジトリ外への書き込みのためにある（質問の種別は`impl`スキルが定める）。Claude は「持ち越す」「スキップする」「そのままにする」を自分で決めない。それらは質問に対するユーザーの回答としてだけ存在し、「あとで」「別 PR で」「意図的に変更しない」と書く応答・PR 本文・コミットは、その質問と回答を指せなければならない
- **レビュー指摘は直すか、証拠を添えてユーザーに出す**。「false positive」「元からあった」「意図どおり」はユーザーに対して主張することであって、Claude が 1 人で指摘を閉じる手段ではない

## セキュリティ

### 機密情報の取り扱い

- `.env`、`.env.*`等の機密ファイルを読み取り・編集・コミットしない（機密ファイルの判断は`.gitignore`を参考にすること）
- コミット前に`git diff --staged`で機密情報（API キー、トークン、パスワード、企業名、顧客情報）が含まれていないか確認する
- **サンプル値は予約済み慣例に従う**: ドメインは`example.com`/`*.example`/`*.test`等（RFC 2606/6761）、IP は TEST-NET。実在の無関係ドメイン、未取得の創作ドメイン、案件識別子、実データの断片を成果物に残さない（詳細は`.claude/skills/git/SKILL.md`のサンプル値慣例チェック）
- 環境変数やシークレットをコード内にハードコードしない

### サプライチェーン保護

- **yarn dlx は完全禁止**: ローカルパッケージを使わずリモートから直接実行するため、サプライチェーン攻撃に脆弱
- **npx は原則使わない**: package.json の scripts で定義されたコマンドを`yarn <script>`で実行すること
- 新しい依存パッケージの追加は慎重に。既存の依存で解決できないか先に確認する
- `yarn add`する前にパッケージの信頼性（ダウンロード数、メンテナンス状況、既知の脆弱性）を確認する
- `yarn add`する場合はバージョンを固定する（例: `yarn add foo@1.2.3`）
- lockfile（yarn.lock）の手動編集は禁止
- **`.yarnrc.yml`の保護設定を無効化しない**: `enableScripts: false`（依存の install/postinstall を実行しない）と`npmMinimalAgeGate: 7d`（publish 後7日未満のパッケージを拒否）はサプライチェーン対策。自社パッケージを publish 直後に取り込むために一時的に外した場合は、`yarn.lock`固定後に**必ず復元してコミットする**

## スキル

| スキル           | パス                                                                | 用途                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grill me         | `.claude/skills/grill-me/SKILL.md`                                  | 計画・設計の前提を掘り下げて合意形成する                                                                                                                  |
| Impl             | `.claude/skills/impl/SKILL.md`                                      | 合意済み計画の実装・検証・持ち越しの Issue 化・PR 作成・マージ後の台帳確認                                                                                |
| Git              | `.claude/skills/git/SKILL.md`                                       | コミット規約・コミット前コンテンツチェック・破壊的変更の扱い                                                                                              |
| PR               | `.claude/skills/pr/SKILL.md`                                        | PR 作成フロー（base 追従・本文の節構成・push はユーザー実行・CI 監視）                                                                                    |
| Merged           | `.claude/skills/merged/SKILL.md`                                    | マージ後の手順（外部作者への完了コメント・issue への報告）                                                                                                |
| Create issue     | `.claude/skills/create-issue/SKILL.md`                              | 原因まで調べて Issue を起票する（持ち越しの引き継ぎ先）                                                                                                   |
| npm publish      | `.claude/skills/npm-publish/SKILL.md`                               | リリース（dev→main マージ・バージョニング・publish 監視・検証）                                                                                           |
| Major rotation   | `.claude/skills/major-rotation/SKILL.md`                            | リリースラインの入れ替え（v4 正式版・v3 の終了・次のメジャー）の手順                                                                                      |
| Refactor         | `.claude/skills/refactor/SKILL.md`                                  | テストファーストのリファクタリング手順                                                                                                                    |
| Product Manager  | `.claude/skills/product-manager/SKILL.md`                           | リポジトリ分析、ドキュメント整合チェック、PR レビュー                                                                                                     |
| QA Engineer      | `.claude/skills/qa-engineer/SKILL.md`                               | コードレビュー、テスト品質チェック                                                                                                                        |
| TipTap extension | `.claude/skills/tiptap-extension/SKILL.md`                          | `custom-element`の Wysiwyg に TipTap 拡張・ツールバーボタンを組み込む手順                                                                                 |
| Hono             | `.claude/skills/hono/SKILL.md`（`.agents/skills/hono`への symlink） | Hono 公式 Agent Skill。ルーティング・middleware・JSX・testing・WebSocket 等の inline API リファレンス。更新はユーザーが手動で行う（`npx skills add ...`） |

> リポジトリルートの`skills/`（`editing-burger-editor-pages/` / `building-burger-editor-projects/`）は**利用者に配布する** BurgerEditor 操作スキルであり、`.claude/skills/`の開発用スキルとは別物。混同しないこと。

## AI 操作プロトコル

- **修正前にスキャンする**: 変更を始める前にパッケージ構造・依存関係・`exports`の現状を確認する
- **アーキテクチャガード**: 変更後に構造ルールと ARCHITECTURE.md の依存の向き・不変条件に違反していないかセルフチェックする
- **実装を勝手に広げない**: 合意したスコープの外に手を出さない
