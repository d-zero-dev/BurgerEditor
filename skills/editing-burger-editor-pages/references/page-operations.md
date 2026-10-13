# page-operations — ページ単位の操作

## 作成・改名・複製・削除・結合

- `page_create` — 新規ページ。既存パスなら `exists`（上書きしない）。`config_resolve` の `newFileContent` がプロジェクトの新規ページひな型
- `page_rename` / `page_copy` — 宛先 (`to`) が既に存在すると無条件で `exists`。上書きしたいなら**先に `page_delete` する**
- `page_concat` — 複数の `sources` の編集可能領域を `to` へ順に連結する。`sources` は 1 つ以上必須。`to` が既存なら `readToken` が必要、無ければ新規作成
- `page_delete` — 削除。破壊的操作なので対象を曖昧にしたまま実行しない

いずれも既存ページへの操作は直前の `page_blocks` / 前回の書き込み成功応答から得た `readToken` を要求する（`page_create` を除く）。

## パスの扱い

- 先頭 `/` は OS のルートではなく `documentRoot` 直下を指す
- 末尾 `/` で終わるパスは `indexFileName`（既定 `index.html`。config でプロジェクトごとに変更可）が自動補完される
- `virtualTree.enabled: true` のプロジェクトでは Front Matter の `path`（または `virtualTree.pathKey` で指定されたキー）が論理パスとして使われる。CLI/MCP はどちらの表記でも受け付ける

## `invalidPages`（`virtualTree` 有効時のみ）

`virtualTree.enabled: true` で `pathKey` を持たないファイル（移行待ちのレガシースタブ等）があっても、`page_list` は停止せずそれらをスキップし、戻り値の `invalidPages: [{ file, reason, message }]` に列挙する。`reason` は `missing-key`（キー自体が無い）/ `invalid-type`（型が不正）/ `empty-path`（値が空）のいずれか。移行対応が必要なページの洗い出しに使う。

## Front Matter

- `front_matter_get` は読み取り、`front_matter_set` は書き込み（`readToken` 必須）
- `front_matter_set` は**既定でマージ**。既存キーを保ったまま一部だけ更新できる。`replace: true` で全置換
- `patch` に配列を渡すと失敗する。配列を含む値を書きたいときは、そのキー単体の値としてオブジェクトの中に入れて渡す
- 複数ページへ一括で同じ変更を入れたいときは `page_list` でパス一覧を取り、各ページごとに `front_matter_get`（または `page_blocks`）で読んでから `front_matter_set` する — `readToken` はページごとに別物なので使い回さない
