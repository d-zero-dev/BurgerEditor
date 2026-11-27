---
name: major-rotation
description: 系列の移行（v4 の正式版化、次メジャーの開始、旧系列 v3 の終了）。系列定義・Renovate・CI・SECURITY.md・文書・GitHub の設定をまとめて切り替える
when_to_use: 系列移行の Issue（rotation・end of support）を渡されたとき、またはユーザーが「v4 を正式版にする」「v3 のサポートを終える」「次のメジャーを始める」「/major-rotation」と指示したとき。`npm-publish` で `promote=stable` の Release PR を作る前にも読む
disable-model-invocation: true
---

系列の正は `.github/release-lines.json`。この手順は、まずファイルを変え、`release-automation lines-check` が指す食い違いを直していく。

いまの定義：`dev`（現行系列 v4、alpha。`main` から公開）と `v3`（旧系列。`v3` から公開）。v3 は v4 が正式版になるまで脆弱性修正と不具合修正を、その後は脆弱性修正のみを受け取り、v4 の正式版の公開日から 12 か月で終わる。

リポジトリ外への書き込み（ブランチの作成・ロック、Ruleset、Environment、dist-tag、Issue の Close）は、対象と内容を示してユーザーの承認を得てから行う。コマンドの実行（ruleset、npm の設定）はユーザーが行う。

# 1. どの移行かを決める

| 契機                                                      | 移行                    |
| --------------------------------------------------------- | ----------------------- |
| ユーザーが v4 の正式版化を指示した                        | A. v4 を正式版にする    |
| rotation Issue（`Rotate the release lines after vX.0.0`） | B. 正式版の公開後の整理 |
| end of support Issue（`End of support for vN on ...`）    | C. 旧系列の終了         |
| ユーザーが次メジャーの開始を指示した                      | D. 次メジャーの開始     |

1つずつ確認する：対象のメジャー番号、移行の種類。

# 2. 移行ごとの変更

## A. v4 を正式版にする

`dev` は v4 のプレリリース（alpha）で、`dev` の Release PR を段階ごとに昇格させて正式版にする。

1. `npm-publish` スキルで、`promote=beta`、`promote=rc`、`promote=stable` の順に Release PR を作って公開する。段階を飛ばすかはユーザーが決める。各段階の公開は、そのたびに全パッケージの dist-tag（`beta`・`rc`）を確かめる
2. 正式版（`promote=stable`）の Release PR は、v3 の定期 lock file maintenance を止める Renovate のルール（`release-automation: lock file maintenance stopped on security-only lines`）と系列定義の変更を含む。手で消さない
3. 公開の後、**全パッケージの `latest` が `4.0.0` になったことを `npm dist-tag ls <package>` で確かめる**。`latest` が古い alpha のまま来た v4 専用パッケージも、この公開で初めて `4.0.0` に動く。動かないパッケージが残ったら、`npm-publish` の「失敗したとき」のとおり同じジョブを再実行する
4. 確かめたあと、インストールと `npx` のコマンドから `@alpha` を外す（確かめる前に外すと、動かなかったパッケージが古い alpha のままになる）。対象は、ルートの `README.md`、各パッケージの `README.md`、`skills/`
5. `SECURITY.md` の「正式版を公開するまで `alpha`」「v3 が `latest`」「v4 専用パッケージの `latest`」「v4 の正式版を公開すると…`v3` の dist-tag」の記述を、現在形で現状に直す。`v3` の行にサポート終了日を書く（`release-automation classify` が出す日付。`lines-check` が検査する）
6. v3 の保守が脆弱性修正のみになったことを、ルートの `CLAUDE.md` の「ブランチ構成」と `v3` ブランチの `CLAUDE.md`（PR の base は `v3`）に書く。`v3` ブランチのファイルは別のコードベースなので、手で見直す（下の「`v3` ブランチのファイル」）
7. 最初の 3.x のリリースで、公開されたパッケージに `v3` の dist-tag が付いたことを `npm dist-tag ls <package>` で確かめる（リリースのコミットの `package.json` の差分に出たもの。4 つ全部とは限らない）

## B. 正式版の公開後の整理

Issue に書かれた公開結果と lock file maintenance の停止を確かめ、次を行う：

1. 系列定義の旧系列に `successorStable` は書かない（`v<新>.0.0` のタグから読める）
2. `SECURITY.md` の旧系列の行にサポート終了日を書く
3. npm の dist-tag：旧系列の次の公開で `v<旧>` が付くことを確かめる。`latest` が新しいメジャーを指していることを確かめる
4. 「3. 系列名を書いている場所」のうち残っているものを直す

## C. 旧系列の終了

**終了日より前に、終了の効力を持つ PR のマージと設定変更をしない**。PR は準備してよい。

終了日以降に：

1. 系列定義から系列を外す
2. Renovate の `baseBranchPatterns` と旧系列のルール（`release-automation: previous lines take vulnerability fixes and lock file maintenance only`）から外す。`vulnerabilityAlerts` は残す（`dev` の脆弱性修正に要る）。公開パッケージの範囲を `bump` するルールの `matchBaseBranches: ["dev"]` は、`lines-check` が検査しないので手で確かめる
3. ワークフローの `branches:` から外す（`test.yml`・`full-ci.yml`・`verify-release-pr.yml`・`publish.yml`）
4. `SECURITY.md` の行を「End of life」にする。`CLAUDE.md` の表も合わせる
5. `v3` ブランチの `CLAUDE.md` と `README.md` に「サポート終了」と書く（PR の base は `v3`）。この変更は、ブランチをロックする前にマージする
6. ブランチをロックする（消さない。タグも残す）。リポジトリ外（ユーザー実行）：`v3` ブランチの ruleset を、読み取り専用にする
7. `dev` 側で、v3 のリリースを案内する記述を外すか「終了」と書く：`npm-publish` スキルの「v3 のリリース」の節と、それを指す記述（冒頭の `description`、`when_to_use`）、ルートの `CLAUDE.md` の「`v3`への変更」の項
8. その系列の `release-blocker`・audit Issue を、終了したことを書いて Close する

## D. 次メジャーの開始

前提：`dev` が正式版（`release-automation classify` で現行系列が `[stable]`）。プレリリース中なら始められないことをユーザーに伝えて止まる。

1. 現行の正式版の扱いを、ユーザーと決める：現行の正式版を受け取らせるブランチ名（例：`v4`）、保守するラインの数（常に「最新の正式版とその 1 つ前」にするか）
2. 現行の最新の正式版タグから `v<現行>` ブランチを作る
3. 系列定義に `v<現行>` を `previous` で足し、`dev` のメジャーを上げる。`lines-check` が指す食い違いを直す
4. 新しいブランチに Ruleset を作る（`/repo-setup` の references/rulesets.md の「次メジャー系列・旧系列のブランチ」）。`test.yml`・`publish.yml` などのワークフローは、`dev` と同じものを置く
5. 最初の Release PR は、`package.json`／`lerna.json` を `<次>.0.0-alpha.0` にした PR の後、手動起動で作る

# 3. 系列名を書いている場所

- `.github/release-lines.json`
- `.github/renovate.json`（`baseBranchPatterns`、旧系列のルール、公開パッケージの範囲を `bump` するルールの `matchBaseBranches`）
- `.github/workflows/*.yml` の `branches:`
- `SECURITY.md`
- `CLAUDE.md` の「ブランチ構成」
- GitHub の Ruleset と Environment の Deployment branches

`release-automation lines-check` で最初の4つの一部を検査できる。残りは目で確かめる。

## `v3` ブランチのファイル

`v3` ブランチは別のコードベースで、`dev` の `lines-check` は読まない。系列を入れ替えるたびに、次のファイルを、`v3` から切ったブランチで見直す（PR の base は `v3`）。

- `CLAUDE.md`：系列の役割、受け取るもの（脆弱性修正のみになったか）、終了の期限
- `README.md`：保守ラインの説明
- `.github/workflows/`：`test.yml`・`full-ci.yml`・`verify-release-pr.yml`・`publish.yml` の `branches:`
- 編集したら、そのブランチの `yarn test` を実行する

# 4. 検証

- [ ] `release-automation classify` がエラー0件で、系列が意図どおり
- [ ] `release-automation lines-check` がエラー0件
- [ ] `yarn lint`（`lint:renovate` を含む）が通る
- [ ] 各系列のブランチへの PR で `ci-ok`・`full-ci-ok` が動く
- [ ] Nightly の次の実行で、全系列の Full CI が起動するか再利用される
- [ ] Renovate の次の実行で、Dependency Dashboard の対象ブランチが系列と一致する

全部が満たされるまで Issue を Close しない。
