---
name: major-rotation
description: リリースラインの入れ替え手順。v4 を正式版にするとき、v3 のサポート期限が来たとき、次のメジャーを始めるときに、ライン定義・Renovate・保護・ドキュメントの何をどの順で変えるかを示す
when_to_use: ユーザーが「v4 を正式版にする」「v3 のサポートを終える」「次のメジャーを始める」「ラインを入れ替える」「/major-rotation」と指示した場合。`npm-publish` で正式版（`X.0.0`）を出す前にも読む
disable-model-invocation: true
---

# 前提

- ラインの定義は `scripts/release-lines/lines.mjs`（役割ごとの方針は先頭の JSDoc）。ブランチ名を書く各ファイルとの食い違いは `yarn test --project scripts` の `consistency.spec.mjs` が落とす。**入れ替えは `lines.mjs` から始め、この spec が落とすファイルを 1 つずつ直す**
- いまの定義: `v4`（`dev`、`prerelease`）と `v3`（`v3`、`maintenance`）。v3 は v4 が正式版になるまで脆弱性修正と不具合修正を、その後は脆弱性修正のみを受け取り、v4 の正式版の公開日から 12 か月（`MAINTENANCE_MONTHS_AFTER_NEXT_STABLE`）で終わる
- **保守ラインのブランチ（いまは `v3`）のファイルは `consistency.spec.mjs` が読まない**（別のコードベース）。ラインを入れ替えるたびに、次のファイルを、そのブランチから切ったブランチで手で見直す（PR の base はそのブランチ）。保守ラインが複数あるとき（C）は、それぞれに行う。これを「保守ラインのブランチのファイル」と呼ぶ（次の一覧の中の `3` / `3.x` は、そのブランチのメジャーのこと）:
  - `CLAUDE.md`: ラインの役割、受け取るもの（脆弱性修正のみになったか）、終了の期限、リリースの dist-tag の記述
  - `README.md`: 保守ラインの説明
  - `.github/workflows/publish.yml` の「Determine dist-tag」: ラインのメジャー（`3`）、メッセージの `3.x`
  - `scripts/publish-dist-tag.spec.mjs`: ラインのメジャーの版、期待するメッセージ、期待する dist-tag（`v3`）、テスト名・describe 名の `3` / `3.x` / `v3`
  - 編集したら、そのブランチで `yarn test --project scripts` を実行する（この「確認」は `dev` の `consistency.spec.mjs` とは別）
- リポジトリ外の操作（ruleset、npm の設定）はユーザーが実行する。コマンドを提示して確認を取る
- 各ステップのファイルは別 PR にしてよいが、`lines.mjs` と `consistency.spec.mjs` が通らない状態で止めない

# A. v4 を正式版にするとき

リリースと後始末:

1. `npm-publish` スキルの手順で `yarn release`（graduate）を行う。`publish.yml` は、メジャーが npm の `latest`（`@burger-editor/client`）のメジャー（3）以上なら `latest` で公開するので、全パッケージの `latest` が `4.0.0` になる。`npm dist-tag ls <package>` で全パッケージを確認する
2. 正式版を公開できたら、正式版のなかったパッケージの `latest` を追従させていた仕組みを外す（正式版が `latest` を持つので不要）:
   - `.github/workflows/publish.yml` の `Update npm for dist-tag` と `Move latest for packages without a stable release` の 2 ステップ
   - `scripts/follow-latest-dist-tag.mjs` と `scripts/follow-latest-dist-tag.spec.mjs`

ライン定義の更新（正式版を出した後）:

3. `lines.mjs`: v4 の `role` を正式版の役割に変える（`LineRole` と先頭の JSDoc に `stable` を足し、Renovate は `full`、未リリース通知はあり）。v3 の終了日（v4 の正式版の公開日 + `MAINTENANCE_MONTHS_AFTER_NEXT_STABLE` か月）を JSDoc と各表に書く
4. 脆弱性修正のみになる v3 の受け取るものを、`CLAUDE.md` の「ブランチ構成」と `SECURITY.md` のサポート表で直す（`consistency.spec.mjs` が、この 2 つの表の食い違いと、期間の月数の食い違いを落とす）。README の「サポートするバージョン」は `SECURITY.md` を指すだけなので、直さない
5. `SECURITY.md` の「正式版を公開するまで `alpha`」「v3 が `latest`」「v4 専用パッケージの `latest`」「v4 の正式版を公開すると…`v3` の dist-tag」（未来形の文を現在形に）の記述を現状に直す（`consistency.spec.mjs` は検査しないので、文面は目で確かめる）
6. v3 の保守を脆弱性修正のみにしたことを、`v3` ブランチの `CLAUDE.md` にも書く（PR の base は `v3`。前提の「保守ラインのブランチのファイル」を全部確かめる）。`v3` の `publish.yml` の判定は、`latest` のメジャーが 4 になれば自動で `v3` を付けるので、見直した上で、変更は要らない。最初の 3.x のリリースで、公開されたパッケージ（リリースのコミットの `package.json` の差分に出たもの。4 つ全部とは限らない）に `v3` の dist-tag が付いたことを `npm dist-tag ls <package>` で確かめる

# B. v3 のサポート期限が来たとき

1. `lines.mjs` から v3 を外す
2. `.github/renovate.json`: `baseBranchPatterns` から `v3` を外し、`matchBaseBranches: ["v3"]` のルールを消す。`vulnerabilityAlerts.enabled` は残す（`dev` の脆弱性修正に要る）。公開パッケージの範囲を `bump` するルールの `matchBaseBranches: ["dev"]` は、`lines.mjs` と結びついておらず spec も検査しないので、手で確かめる
3. `.github/workflows/*.yml` の `branches:` に `v3` があれば外す（spec が落とす）。未リリース通知は `lines.mjs` から自動で外れる
4. `CLAUDE.md` の表と `SECURITY.md` の表の v3 の行を「サポート終了」にして、`lines.mjs` の定義から外した状態に合わせる（spec は定義にない行を要求しない）
5. `v3` ブランチの `CLAUDE.md` と `README.md` に「サポート終了」と書く（PR の base は `v3`）。終了後に `v3` からリリースするかはユーザーと決める。しない場合は、`v3` の `publish.yml` の 2 つのトリガー（`push` のタグと `workflow_dispatch`）を外す（ワークフローごと消してもよい）。この変更は、手順 7 で ruleset を読み取り専用にする前にマージする
6. `dev` 側で、v3 のリリースを案内する記述を外すか「終了」と書く: `npm-publish` スキルの「v3 のリリース」の節と、それを指す記述（冒頭の `description`、「前提」の v3 の一文、手順 10 の「v3 の `publish.yml` は別の判定を持つ」、「注意」の `Update npm for dist-tag` の括弧書き）、ルートの `CLAUDE.md` の「`v3`への変更」の項の「`v3`のリリース」の一文、`scripts/release-reminder/report.mjs` の Issue 本文の「v3 系は、同スキルの「v3 のリリース」」の案内
7. リポジトリ外（ユーザー実行）: `v3` ブランチの ruleset を外すか、読み取り専用にする。ブランチは削除しない（タグと履歴を残す）

# C. 次のメジャーを始めるとき

`dev` を次のメジャーの `prerelease` にして、現行の正式版を別のブランチに残す。ライン数と役割が変わるので、ユーザーと次を決めてから始める（ここは手順ではなく判断）:

- 現行の正式版を受け取らせるブランチ名（例: `v4`）と、その役割（`stable` を維持するか `maintenance` にするか）
- 現行の正式版に Renovate がどこまで出すか（`full` か `security-only`）
- 保守するラインの数（常に「最新の正式版とその 1 つ前」にするか）

決まったら `lines.mjs` に行を足し、`renovate.json` の `baseBranchPatterns` と `matchBaseBranches` のルール（公開パッケージの範囲を `bump` するルールの `matchBaseBranches` も、公開を続けるラインに合わせる。spec は検査しない）、`CLAUDE.md`・`SECURITY.md` の表、新しいブランチの ruleset（ユーザー実行）を直す（`dev` の `publish.yml` は現行のラインだけを公開し、古いメジャーは止めるので、直さない。古いメジャーの dist-tag は、次に書く保守のブランチの `publish.yml` が決める）。新しいブランチには、`dev` と同じ `test.yml` を置く。保守に回すブランチの `publish.yml` は、`v3` ブランチの `publish.yml` の「Determine dist-tag」と、安全のための配線（Publish ステップの `DIST_TAG` の環境変数、空のタグの拒否、`from-package`）、`scripts/publish-dist-tag.spec.mjs`（この配線も検査する）を元にして、ラインのメジャー、メッセージの `3.x`、spec の版・期待するメッセージ・dist-tag・テスト名を直す。判定が `@burger-editor/client` の `latest` を見ているので、両方のラインが公開し続けるパッケージかも確かめる。

# 確認

- `yarn test --project scripts`（`consistency.spec.mjs`）が通る
- `yarn lint`（`lint:renovate` を含む）が通る
- `node scripts/release-reminder/index.mjs` をドライランで実行して、各ラインの判定が想定どおりか見る
