---
name: npm-publish
description: npm パッケージのリリース（dev→main マージ、バージョニング、tag push、publish workflow 監視、publish 結果検証、dev への同期）。v3 系のリリースは末尾の「v3 のリリース」
when_to_use: ユーザーが「リリースして」「publish して」「バージョン上げて」「v3 をリリースして」「/npm-publish」と指示した場合
disable-model-invocation: true
---

# 前提

- リリースは `main` ブランチから行う。`dev` の変更を `main` にマージしてから実行する。v3 系のリリースは `v3` ブランチで行う（末尾の「v3 のリリース」）。ラインの定義は `scripts/release-lines/lines.mjs`。利用者に届く変更が 3 日リリースされないと `release-reminder` ワークフローが Issue を開く。v4 の正式版を出すときは `major-rotation` スキルも読む
- `lerna version` は `main` / `v3` にリリースのコミットを書く。`.husky/pre-commit` はこれらのブランチを止めない（止めるのは `dev` のみ）
- `v*` タグ push で `publish.yml` が発火し、npm へ自動 publish される（OIDC Trusted Publishing）
- **publish は取り消せない**。各ステップでユーザーの確認を取る
- **`yarn release` / `git push` 系はユーザーが実行する**。エージェントは実行せず（`.claude/settings.json` で deny されている）`!` プレフィックス付きのコマンドを提示し、完了報告を待つ

# 対象パッケージ

Lerna **fixed モード**のため、全パッケージが同一バージョンで上がる。

| ディレクトリ                             | npm パッケージ名                |
| ---------------------------------------- | ------------------------------- |
| `packages/@burger-editor/blocks`         | `@burger-editor/blocks`         |
| `packages/@burger-editor/cli`            | `@burger-editor/cli`            |
| `packages/@burger-editor/client`         | `@burger-editor/client`         |
| `packages/@burger-editor/core`           | `@burger-editor/core`           |
| `packages/@burger-editor/css`            | `@burger-editor/css`            |
| `packages/@burger-editor/custom-element` | `@burger-editor/custom-element` |
| `packages/@burger-editor/file-io`        | `@burger-editor/file-io`        |
| `packages/@burger-editor/frozen-patty`   | `@burger-editor/frozen-patty`   |
| `packages/@burger-editor/inspector`      | `@burger-editor/inspector`      |
| `packages/@burger-editor/legacy`         | `@burger-editor/legacy`         |
| `packages/@burger-editor/local`          | `@burger-editor/local`          |
| `packages/@burger-editor/mcp-server`     | `@burger-editor/mcp-server`     |
| `packages/@burger-editor/migrator`       | `@burger-editor/migrator`       |
| `packages/@burger-editor/runtime`        | `@burger-editor/runtime`        |
| `packages/@burger-editor/utils`          | `@burger-editor/utils`          |

# 手順

## 1. ワーキングツリーの状態確認

`git status` で未コミットの変更・未追跡ファイルがないか確認する。

- クリーンなら次へ
- 変更があればユーザーに報告し、`git stash` / コミット / 中断のいずれかを尋ねる。指示に従ってから次へ

汚れたまま先に進むとマージ・バージョニングが意図しない差分を巻き込むため、ここは省略しない。

## 2. main と dev の最新化

```bash
git fetch origin
git checkout main
git pull origin main
git checkout dev
git pull origin dev
git checkout main
```

両ブランチをローカルで最新にしてから `main` に戻る。`dev` を最新にしておくのは、手順 11 の `main` → `dev` 同期でそのまま使うため。

いずれかの `pull` が失敗したらユーザーに報告して指示を仰ぐ。

## 3. 未マージ PR の確認

リリースに含めるべき PR が残っていないか確認し、あればユーザーに提示して続行可否を尋ねる。

```bash
gh pr list --base dev --state open
```

## 4. dev → main マージ

`dev` が `main` より進んでいる場合、差分コミットをユーザーに提示してからマージする。

```bash
git log --oneline main..dev
git merge dev --no-edit
```

コンフリクトが発生したらユーザーに報告して指示を仰ぐ。

## 5. lockfile の同期確認

```bash
yarn install
git diff yarn.lock
```

差分が出たらユーザーに報告し、コミットしてから次へ。CI の `yarn install --immutable` が失敗するのを防ぐため必須。

## 6. 事前チェック

```bash
yarn build
yarn lint
yarn test
```

lint は build の後に実行する（ビルド前だと ESLint の型を使うルールが誤判定し、`--fix` が無関係なファイルを書き換える）。すべてパスすること。`yarn test` は Docker 経由で VR まで走るため時間がかかるが省略しない。`main` の CI が green かも併せて確認する。

```bash
gh run list --branch main --limit 5
```

## 7. リリース内容の提示

現在のバージョンと前回タグからの差分をユーザーに提示する。

```bash
git describe --tags --abbrev=0
git log --oneline $(git describe --tags --abbrev=0)..HEAD
```

fixed モードなので `lerna.json` の `version` が現行バージョンの正。`yarn release` は conventional commits からバージョンを自動決定するため、**リリース種別（graduate / alpha / beta / rc）をユーザーに確認する必要はない**。差分は「何が入るか」の確認材料として提示するだけでよい。

あわせて、前回タグ以降に破壊的変更マーカーが無いかを確認する。マーカー付きコミットが 1 つでもあれば `yarn release` の決めるバージョンが変わる。`0.x` ではマイナーに丸められ、`X.0.0-alpha.n`（v4 の alpha はここ）ではプレリリース番号が進むだけだが、安定版（`1.0.0` 以降）とマイナー / パッチのプレリリースではメジャーに跳ねる（段階ごとの効果と、付けてよい条件は `git` スキルの「破壊的変更と振る舞いの変更」）。

```bash
git log <last-tag>..HEAD --format=%s | grep -E '^[a-z]+(\([^)]*\))?!:'
git log <last-tag>..HEAD --format=%B | grep -iE '^(\* +)?BREAKING[ -]CHANGE:'
```

ヒットがあれば提示する。ユーザーがメジャーを承認していた変更ならそのまま進む。承認の無いマーカー（誤って付いたもの）でそれでもリリースするなら、バンプを明示して回避する: `yarn release minor`（または `patch`）。`lerna version` は `--conventional-commits` の推奨より位置引数のバンプを優先し、CHANGELOG は生成する。その CHANGELOG にはコミットの注記から「BREAKING CHANGES」節が入るので、マイナーリリースが破壊的変更を告知する形になる。選択肢を提示するときにそう言う。

振る舞いの変更の段落も集めて、リリース内容の一部として提示する。

```bash
git log <last-tag>..HEAD --grep='^Behavior change'
```

## 8. バージョニングと push（ユーザー実行）

`lerna version` は選択・確認のプロンプトを出すインタラクティブコマンドで、Claude Code の `!` 経由では対話できない（プロンプトが表示されても入力できず止まる）。ユーザーに次の手順を依頼する:

1. Claude Code のセッションを終了する（`exit`）
2. ターミナルで直接 `yarn release` を実行し、プロンプトに対話的に回答する
3. 完了したら `claude --continue` で会話に戻る

```
yarn release          # graduate（正式リリース。通常はこれだけで十分）
```

alpha / beta / rc のプレリリースが必要な場合は、ユーザーが会話の中で明示的に指示したときだけ、上記と同じ exit → 実行 → `--continue` の手順で該当コマンドを案内する。

```
yarn release:alpha    # alpha プレリリース
yarn release:beta     # beta プレリリース
yarn release:rc       # RC プレリリース
```

リリーススクリプトは `--no-push` なので、**コミットとタグの push が別途必要**。ユーザーから完了報告を受けたら、次を提示する。

```
! git push origin main --follow-tags
```

実際にタグが push されたことを確認してから次へ進む。

```bash
git ls-remote --tags origin
```

## 9. publish workflow の監視

`v*` タグ push で `publish.yml` が発火する。バックグラウンド実行で完了を待つ。

```bash
gh run watch --exit-status
```

失敗したらログ URL をユーザーに提示し、「12. 失敗時の対処」へ。

## 10. publish 結果の検証

workflow が success でも publish が意図通りとは限らない。**全パッケージについて**実際の npm 上の状態を確認する。

```bash
npm view @burger-editor/core version
npm view @burger-editor/core dist-tags
```

確認項目:

- バージョンが手順 8 で上げた値と一致しているか
- **dist-tag が意図通りか**。`dev` / `main` の `publish.yml` は `lerna.json` の `version` 文字列から判定する: `-alpha` → `alpha`、`-beta` → `beta`、`-rc` → `rc`、それ以外の `-` を含む版はエラーで止まる（`next` は廃止）。正式版は `latest`。メジャーが npm の `latest`（`@burger-editor/client`）のメジャーより小さい版（古いメジャー）は、プレリリースも正式版も、エラーで止まる（古いメジャーは、そのラインのブランチの `publish.yml` が公開する）。v3 の `publish.yml` は別の判定を持つ（末尾の「v3 のリリース」）
- **正式版を 1 つも持たないパッケージ**（v3 に存在しない v4 専用のパッケージ。`npm view <package> versions` に `-` を含まない版がないもの）は、publish の後に `scripts/follow-latest-dist-tag.mjs` が `latest` も公開した版に動かす。`npm dist-tag ls <package>` で `latest` が今回の版か確認する。動かせていなければワークフローが失敗している（npmjs.com で該当パッケージの Trusted Publisher の「Allow npm dist-tag」が無効になっていないか確認し、`gh run rerun` で直す）
- provenance が付与されているか（`npm view <package> --json` の `dist.attestations`）

fixed モードでも**一部のパッケージだけ publish される（部分 publish）**ことがある。上の表の全パッケージを個別に確認し、漏れがあればユーザーに報告する。

**ここが success の判定点**。npm 上の状態を確認するまでリリース完了と判断してはいけない。

## 11. main → dev の同期

publish の成功を確認した後、バージョン更新コミットを `dev` に取り込む。`dev` へのマージは merge queue を通る PR だけで、`.husky/pre-commit` も `dev` への直接コミットを止めるので、`dev` から同期用のブランチを切って PR にする。

```bash
git checkout dev
git switch -c chore/sync-main
git merge main --no-edit
```

コンフリクトが発生したらユーザーに報告して指示を仰ぐ。マージできたら `/pr` の手順（base は `dev`）へ進む。キューのマージ方式はマージコミットなので、リリースのタグは `dev` からも辿れる（未リリース通知の起点の判定はこれに依存する）。

## 12. 失敗時の対処

- **sigstore の transient 409**: `gh run rerun` で再実行する。`from-package` は未 publish のバージョンのみを対象にするため、成功済みパッケージは二重 publish されない
- **部分 publish**: 成功したパッケージは publish 済みで巻き戻せない。`workflow_dispatch` で publish workflow を再実行すれば、未 publish のパッケージのみが対象になる
- **誤ったバージョンを publish した**: unpublish は原則不可。`npm deprecate <package>@<version> "<理由>"` で非推奨化し、修正版を新バージョンとして publish する。この判断は必ずユーザーに確認を取る
- **publish が失敗したまま中断する場合**: 手順 11 の `dev` 同期は行わない。`main` にバージョン更新コミットだけが残るため、次回リリース時にそこから再開する

# 注意

- **`v*` タグの作成・削除は CODEOWNERS のみ**（GitHub Rulesets で保護）。権限がない場合は手順 8 で失敗するため、実行者がタグ権限者か事前に確認する
- **publish は取り消せない**。手順 5・6 の事前チェックを省略しない
- **Node.js の版（`setup-yarn` と `dev` の `publish.yml`）を上げたら、`dev` の `publish.yml` の `Update npm for dist-tag` ステップが要るか確認する**（v3 の `publish.yml` にそのステップはない）。新しい Node.js が npm 11.21.0 以降を同梱していれば、そのステップは外せる（コメントのとおり）
- **`yarn release` は `prerelease` スクリプト経由で `yarn build; yarn test` を再度走らせる**。手順 6 と重複するが、`lerna version` の途中で失敗するより事前に落としたほうが安全なので省略しない

# v3 のリリース

v3 系（`v3` ブランチ。脆弱性修正と不具合修正のみ。v4 の正式版の後は脆弱性修正のみ）は、`dev` / `main` ではなく `v3` ブランチで行う。違いだけを書く。

- 手順 2〜4 の代わりに、`v3` を最新化して、リリースしたい修正がマージ済みであることを確認する（`main` へのマージは要らない。開いている PR は `gh pr list --base v3`）
- 手順 5〜7 は `v3` で行う。リリース内容の提示は前回の `v3.*` タグからの差分。手順 6 は次のとおり読み替える: `yarn test` は Docker も VR も使わないホストの vitest（v3 の `CLAUDE.md` の「テスト」）で、CI は v3 の `test.yml`（`gh run list --branch v3 --limit 5`）
- 手順 7 の破壊的変更マーカー（`!`・`BREAKING CHANGE:`）の確認は、v3 では**ヒットがあってはならない**（メジャーを承認する場面は 3.x にない）
  - ヒットしたら、リリースの前にユーザーに報告する。誤って付いたマーカーなら、手順 7 のとおり `yarn release patch`（または `minor`）で版を明示して回避する
  - 理由: `yarn release` がメジャーを 4.0.0 に上げ、`publish.yml` が 3.x 以外の版として止める。止まるのはタグの push の後なので、`v4.0.0` のタグが残り、`v3` に 4.0.0 のリリースのコミットが残る。直すには、CODEOWNERS（admin）がリモートのタグを削除し、ローカルのタグも消し（`git tag -d v4.0.0`。残すと次の `git push origin v3 --follow-tags` が再び push し、`git describe` や lerna の変更の検出も最後のタグとして使う）、ユーザーが `v3` のリリースのコミットを revert する（`v3` の ruleset は必須チェックを要求するので、base を `v3` にした PR か、admin のバイパスで行う）。その後の `yarn release` は revert 後の版から始まる（`workflow_dispatch` も、その版を同じ理由で止める）
- 手順 8 は `yarn release`（graduate）だけ。**v3 にプレリリースのスクリプト（`release:alpha`・`release:beta`・`release:rc`）は無い**。v3 は正式版だけを公開し、プレリリースの版は `publish.yml` が止める。push は `! git push origin v3 --follow-tags`
- 手順 9〜10 は、v3 の `publish.yml` が `dev` とは別の判定を持つ。`dev` の対応表（`-alpha` → `alpha` など）は v3 には当てはまらない:
  - 次は、インストールとビルドの前にエラーで止まる: `lerna.json` の版が版の形でない、プレリリース、3.x 以外の版、npm の `latest`（`@burger-editor/client`）が読めない・プレリリース・3 より古い
  - 正式版の dist-tag は、`latest` のメジャーが 3 のうち（v4 の正式版が出るまで）は `latest`、4 以上になった後は `v3`。`v3` の dist-tag は、v4 の正式版の後の最初の 3.x のリリースで初めて付く
  - 公開されうるパッケージは 4 つ（`client`・`css`・`runtime`・`frozen-patty`。上の 15 パッケージの表は `dev` のもの）。v3 の `yarn release` には `--force-publish` がなく、正式版のリリースで上がるのは変更のあったパッケージだけなので、リリースのコミットの `package.json` の差分に出たパッケージを、`dist-tags`・版・provenance で確認する（4 つ全部が上がるとは限らず、上がらないパッケージは部分 publish ではない）
  - `latest` を動かす `scripts/follow-latest-dist-tag.mjs` は v3 には無い（4 つとも正式版を持つ）。npmjs.com の「Allow npm dist-tag」も要らない（dist-tag は `lerna publish --dist-tag` が公開時に付ける）
  - `v3` は semver の範囲に見えるタグ名で、`npm dist-tag add` は受け付けない。付け直す必要が出たら、ユーザーに相談する（publish の `--dist-tag v3` は受け付ける）
- 手順 11 の同期は要らない（`v3` と `dev` は別のコードベースで、互いにマージしない）
- 手順 12 の失敗時の対処のうち、再実行（`from-package`）、`workflow_dispatch`、誤ったバージョンの扱いは v3 にも当てはまる。`workflow_dispatch` は `v3` のブランチを選んで起動する。`from-package` が各パッケージの `package.json` の版のうち未公開のものを公開し、`lerna.json` の版は検査と dist-tag の決定に使われるので、リリースのコミットを push した後に行う。公開が失敗したままでも、`main` はないので、リリースのコミットがそのまま `v3` に残る。v4 の正式版の前後をまたいで再実行すると、残りのパッケージだけが、先に公開されたものと別の dist-tag（`latest` と `v3`）になりうる
- 変更が `v3` にマージされてもリリースされないと、`release-reminder` ワークフローが v3 の Issue を開く
