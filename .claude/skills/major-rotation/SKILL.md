---
name: major-rotation
description: リリースラインの入れ替え手順。v4 を正式版にするとき、v3 のサポート期限が来たとき、次のメジャーを始めるときに、ライン定義・Renovate・保護・ドキュメントの何をどの順で変えるかを示す
when_to_use: ユーザーが「v4 を正式版にする」「v3 のサポートを終える」「次のメジャーを始める」「ラインを入れ替える」「/major-rotation」と指示した場合。`npm-publish` で正式版（`X.0.0`）を出す前にも読む
disable-model-invocation: true
---

# 前提

- ラインの定義は `scripts/release-lines/lines.mjs`（役割ごとの方針は先頭の JSDoc）。ブランチ名を書く各ファイルとの食い違いは `yarn test --project scripts` の `consistency.spec.mjs` が落とす。**入れ替えは `lines.mjs` から始め、この spec が落とすファイルを 1 つずつ直す**
- いまの定義: `v4`（`dev`、`prerelease`）と `v3`（`v3`、`maintenance`）。v3 は v4 が正式版になるまで脆弱性修正と不具合修正を、その後は脆弱性修正のみを受け取り、v4 の正式版の公開日から 12 か月（`MAINTENANCE_MONTHS_AFTER_NEXT_STABLE`）で終わる
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
5. `SECURITY.md` の「正式版を公開するまで `alpha`」「v3 が `latest`」「v4 専用パッケージの `latest`」の記述を現状に直す（`consistency.spec.mjs` は検査しないので、文面は目で確かめる）
6. v3 の保守を脆弱性修正のみにしたことを、`v3` ブランチの `CLAUDE.md` にも書く（PR の base は `v3`）

# B. v3 のサポート期限が来たとき

1. `lines.mjs` から v3 を外す
2. `.github/renovate.json`: `baseBranchPatterns` から `v3` を外し、`matchBaseBranches: ["v3"]` のルールを消す。`vulnerabilityAlerts.enabled` は残す（`dev` の脆弱性修正に要る）。公開パッケージの範囲を `bump` するルールの `matchBaseBranches: ["dev"]` は、`lines.mjs` と結びついておらず spec も検査しないので、手で確かめる
3. `.github/workflows/*.yml` の `branches:` に `v3` があれば外す（spec が落とす）。未リリース通知は `lines.mjs` から自動で外れる
4. `CLAUDE.md` の表と `SECURITY.md` の表の v3 の行を「サポート終了」にして、`lines.mjs` の定義から外した状態に合わせる（spec は定義にない行を要求しない）
5. リポジトリ外（ユーザー実行）: `v3` ブランチの ruleset を外すか、読み取り専用にする。ブランチは削除しない（タグと履歴を残す）

# C. 次のメジャーを始めるとき

`dev` を次のメジャーの `prerelease` にして、現行の正式版を別のブランチに残す。ライン数と役割が変わるので、ユーザーと次を決めてから始める（ここは手順ではなく判断）:

- 現行の正式版を受け取らせるブランチ名（例: `v4`）と、その役割（`stable` を維持するか `maintenance` にするか）
- 現行の正式版に Renovate がどこまで出すか（`full` か `security-only`）
- 保守するラインの数（常に「最新の正式版とその 1 つ前」にするか）

決まったら `lines.mjs` に行を足し、`renovate.json` の `baseBranchPatterns` と `matchBaseBranches` のルール（公開パッケージの範囲を `bump` するルールの `matchBaseBranches` も、公開を続けるラインに合わせる。spec は検査しない）、`CLAUDE.md`・`SECURITY.md` の表、新しいブランチの ruleset（ユーザー実行）、`publish.yml` の dist-tag（`v<major>`）を直す。新しいブランチには、`dev` と同じ `test.yml` を置く。

# 確認

- `yarn test --project scripts`（`consistency.spec.mjs`）が通る
- `yarn lint`（`lint:renovate` を含む）が通る
- `node scripts/release-reminder/index.mjs` をドライランで実行して、各ラインの判定が想定どおりか見る
