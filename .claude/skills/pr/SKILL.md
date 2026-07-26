---
name: pr
description: プルリクエストの作成とプッシュ（プリフライトチェック、base 追従、コンフリクト検知含む）
disable-model-invocation: true
---

1. `dev` や `main` ではないトピックブランチにいることを確認する。
2. **base 追従（コンフリクト予防）**: `git fetch origin dev` を実行し、`git log HEAD..origin/dev --oneline` で base が進んでいないか確認する。進んでいれば push 前に `git rebase origin/dev` する。ドキュメント系のコンフリクトは機械的に解決せず、base 側で追加された内容を方針（JSDoc 配置・ARCHITECTURE.md の依存グラフ）に沿って取り込むこと。
3. **プリフライトチェック（必須 — 省略不可）:**
   - `yarn lint`、`yarn build`、`yarn test` がこのセッション内でまだ実行・成功していない場合、続行する前に**今すぐ実行**する。rebase を行った場合は rebase 後に再実行する。
   - `yarn test` は Docker 経由で VR まで走るため時間がかかる。初回はイメージビルドも入る。時間を理由に省略しないこと。
   - 全てがパスしなければならない。失敗があれば続行前に修正する。
   - **`yarn lint` が prettier で意図しない再整形を出した場合は要注意**: コミット済みの整形と食い違う差分は prettier のバージョン差異による drift の可能性がある。自分の変更と無関係な再整形は取り込まず、ユーザーに報告する。
4. 適切な `git` コマンドを使って現在のトピックブランチの変更をレビューする。
   - **サンプル慣例のダブルチェック**: base branch との全 diff（`git diff origin/dev...HEAD`）に対して、`.claude/skills/git/SKILL.md` の「サンプル値の慣例チェック」を再実行する。コミット単位のチェックをすり抜けた実在ドメイン・未取得ドメイン・案件識別子・実データ断片がないかを PR 全体で確認する。検出したら汎用値へ書き換えて追加コミットする。
5. **PR body を一時ファイルに保存する**: scratchpad ディレクトリに PR body（markdown）を書き出す。タイトルは英語、本文は日本語で書く。
6. **push と PR 作成はユーザーが実行する**: エージェントは `git push` / `gh pr create` を実行せず（`.claude/settings.json` で deny されている）、ユーザーがそのまま実行できる `!` 付きコマンドを提示する。ファイルパス引数は必ずダブルクオーテーションで囲む。

   ```
   ! git push -u origin <branch>
   ! gh pr create --base dev --title "<title>" --body-file "<PR body の一時ファイルパス>"
   ```

7. **マージ可能性の確認（CI watch では捕捉できない）:**
   - ユーザーから PR 作成の報告を受けたら、まず `gh pr view <number> --json mergeable,mergeStateStatus` で **`CONFLICTING` / `DIRTY` を検知**する。`gh pr checks --watch` はステータスチェックしか見ないため、コンフリクトは黙って素通りする。
   - `CONFLICTING` なら CI を待たずにステップ 2 の base 追従（rebase + 方針に沿った解決）に戻り、解決後にユーザーへ `! git push --force-with-lease` を依頼する。
8. **CI 監視:**
   - `gh pr checks --watch` を**バックグラウンド実行**で起動して CI の完了を待機する（フォアグラウンド実行はターン内タイムアウトで出力が欠損する）。
   - テストが途中で失敗した場合は完了を待たずに修正作業に戻る。
   - 全テストが通りマージ可能になったらユーザーに報告する。
