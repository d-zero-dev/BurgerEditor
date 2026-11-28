# CLAUDE.md — BurgerEditor `v3`ブランチ

このファイルは Claude Code (claude.ai/code) がこのリポジトリの **`v3`ブランチ** で作業する際のガイダンスです。

## このブランチ（`v3`）の役割

`v3`ブランチは BurgerEditor **3.x 系の保守ライン（`maintenance`）**です。v4 系の開発とは**独立**しており、`v3`を`dev`/`main`にマージしません。

受け取るのは脆弱性修正と不具合修正だけです。v4 の正式版の後は脆弱性修正のみになり、v4 の正式版の公開日から 12 か月で終了します（[SECURITY.md](https://github.com/d-zero-dev/BurgerEditor/blob/dev/SECURITY.md)）。新機能は入れません。依存の更新も、脆弱性修正に必要なもの（メジャーを含みうる）だけです。

## ブランチ戦略

| ブランチ | 用途                                                                      | 系統 |
| -------- | ------------------------------------------------------------------------- | ---- |
| `v3`     | 3.x 系の保守ライン（**このブランチ**）                                    | 3.x  |
| `dev`    | v4 開発のデフォルトブランチ。PR は merge queue 経由でここへマージ         | 4.x  |
| `main`   | v4 のリリース元。自動で作られる Release PR のマージで npm publish（OIDC） | 4.x  |

- `v3`の変更は`v3`ブランチ内で完結させる。`dev`/`main`へ混ぜない
- リリースタグ（`v*`）は Publish App だけが作る（GitHub Rulesets で保護）
- ラインの定義（どのブランチがどの役割か）は`dev`の`.github/release-lines.json`が持つ。このブランチの`.github/release-lines.json`はその写しで、`release-automation lines-check`が読む（同じ内容に保つ。`.github/renovate.json`も`dev`の写しで、Renovate は読まず`lines-check`が読む）。この表と食い違いが出たら`dev`側が正

## 作業・コミットのルール

- **`v3`に作業のコミットを直接積まない**: `v3`から`git switch -c <topic>`でトピックブランチを切り、base を`v3`にして PR を作る。リリースのコミットは Release PR が作る（`.husky/pre-commit`の`release-automation guard`が直接コミットを止める）
- **リポジトリ外の設定**: `v3`の ruleset が、PR（Approve は 0）と必須チェック`ci-ok`・`lines-check`・`full-ci-ok`を要求し、force push と削除を止める。`dev`と違って merge queue はない。bypass は admin ロール（PR を経由するとき）だけ。`release-pr-verified`は必須にしない（公開処理が公開前に Release PR を確かめる）。Environment `release`は`main`と`v3`からの実行だけを許す
- **Renovate**: 設定は default branch（`dev`）の`.github/renovate.json`だけが読まれる。この branch に置いても無視される。`v3`へ出るのは脆弱性修正と lock file maintenance の PR だけで、ブランチ名は`renovate/v3-*`
- **GitHub Actions の digest は手で更新する**: ワークフローの`uses:`は commit の digest で固定している（コメントはその版）。`v3`の Renovate は digest の更新を出さないので、更新するときは手で版を確かめて digest とコメントを直す
- **未リリースの変更**: 利用者に届く変更が`v3`にマージされて 3 日たつと、`dev`の`release-pr.yml`が`v3`向けの Release PR を作る。Nightly（`dev`の`nightly.yml`）が`v3`の Full CI を毎日起動し、脆弱性を監査する

## リリース

- **正式版だけを公開する**。v3 の Release PR は正式版だけを提案する（プレリリース（`-alpha`・`-beta`・`-rc`）は v4 の dist-tag を動かすため）
- リリースは Release PR で行う（`dev`の`npm-publish`スキルの「v3 のリリース」）。`v3`向けの Release PR をマージすると、`publish.yml`が発火して、npm へ publish し、版と dist-tag を確かめる。タグは Publish App が作る。公開は`lerna publish from-package`なので、部分的に失敗しても、同じジョブの再実行（Actions の「Re-run」）で、まだ公開されていないパッケージだけが公開される
- dist-tag は`.github/release-lines.json`の`distTag`が決める（`v3`は`v3-legacy`。`latest`は v4 が使う）。v4 の正式版の後は`distTag`を外し、`release-automation publish`が決める`v3`になる。`latest`を古いメジャーに動かす公開は、公開の前にエラーで止まる
- **コミットの`BREAKING CHANGE`や`!`は書かない**: Release PR は conventional commits から版を決めるので、それがあるとメジャーを超える（4.0.0）。PR の`commit-check`が、そのコミットを拒否する

## パッケージ構成

| パッケージ                    | 役割                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@burger-editor/blocks`       | ブロック・タイプ定義（`src/block/`・`src/type/`）                                                                                                                                                        |
| `@burger-editor/client`       | 管理画面 UI。admin の JS/CSS をビルド（`dist/js/admin/`・`dist/css/admin/`）                                                                                                                             |
| `@burger-editor/runtime`      | 公開側 JS ランタイム（`bge_functions.min.js`：画像ポップアップ / gallery / google-maps / youtube / migration）。ライブラリ非依存（jQuery 不要）。IIFE で`window.BgE`を生やし DOMContentLoaded で自動実行 |
| `@burger-editor/css`          | 公開側スタイルの配布（`bge_style_default.css`）                                                                                                                                                          |
| `@burger-editor/frozen-patty` | HTML↔JSON 双方向変換。client(admin) のみが利用                                                                                                                                                           |

> [!IMPORTANT]
> **`@burger-editor/frozen-patty`は 0.11.0 のソースに固定する。** `package.json`の`version`はモノレポ統一の 3.x 系の版数だが、中身は 0.11.0。v4 版はフィールド名の camelCase 正規化・`innerHTML`の trim などで v3 と非互換になるため、**v3 では v4 版へ上げない**（renovate / `yarn upgrade`での更新に注意）。固定するのは挙動であり、`yarn lint`による整形は受け入れる。

## パッケージ管理

- **npm は使用禁止。常に yarn を使う**（`yarn@4`/Yarn Workspaces + Lerna）

```bash
yarn install
yarn add <package>
yarn remove <package>
```

- **バージョンは固定で追加する**（`yarn add foo@1.2.3`）。`^`/`~`を付けない（`.yarnrc.yml`の`defaultSemverRangePrefix: ''`で既定化されている）
- **`.yarnrc.yml`の保護設定を無効化しない**: `enableScripts: false`（依存の install/postinstall を実行しない）と`npmMinimalAgeGate: 3d`（publish 後 3 日未満のパッケージを拒否）はサプライチェーン対策

## ビルド

```bash
# 全パッケージ
yarn build

# 個別パッケージ
yarn build --scope @burger-editor/<package-name>
```

- パッケージ間の依存関係を常に意識する: `yarn lerna list --graph`
- 型チェックはビルドで行う（client/runtime/frozen-patty の`build`が`tsc`を実行する）。vitest も vite も型チェックしないため、テストが通っても型エラーは`yarn build`でしか出ない。frozen-patty の`build`は`tsconfig.build.json`を使い spec ファイルを除外するので、frozen-patty のテストコードは型チェックされない

## テスト

テストは vitest をホスト上で実行する（Docker は使わない）。

```bash
# 全テスト
yarn test

# プロジェクトを絞る（frozen-patty / client / runtime。名前は vitest.config.ts の name）
yarn test --project client

# 単一テストファイル
yarn vitest run path/to/test.spec.ts
```

## リント

```bash
yarn lint        # 自動修正できるものは修正し、textlint と cspell の検査も行う
yarn lint:eslint # ESLint のみ
```
