# live-editing — Agent Hub（ブラウザとの同時編集）

BurgerEditor v4 のローカル開発サーバー（`bge`）は「Agent Hub」という入口を持ち、AI からの書き込みを、そのページを開いているブラウザタブへ直接届ける。人間がブラウザで見ている画面が、ハイライトアニメーション付きでその場で書き換わる。タブが開いていなければ黙ってディスクへ書く。**どちらの経路でも、AI から見た入出力の契約は同一。**

## `appliedTo` は情報でしかない

書き込み系ツールの成功応答には `appliedTo: 'browser' | 'disk'` が入る。「ブラウザに届いたか、ディスクに直接書いたか」を示すだけで、**この値によって次に呼ぶツールや振る舞いを変えてはいけない**。`block_ensure_id` と `front_matter_set` はブラウザにタブが開いていても常に `'disk'` になる（ブラウザ relay の対象外）。

## `user-editing` — 人間が操作中

対象ページを開いているタブで、人間がダイアログを開いている、またはソースモード編集中だと、書き込みは `user-editing` で失敗する（nack）。**これはエラーではなく「今は競合するから待て」という信号**。

対処:

```
editor_wait_for_event({ types: ['ui-idle'] })
```

で `ui-idle` イベント（busy → idle への遷移）を待ってから同じ書き込みを再試行する。busy かどうかを先に知りたければ `editor_state_get` で `sessions[].uiState`（`openDialog` / `sourceMode` / `processing` / `editingBlockIndex`）を確認してもよい。

## `editor_state_get` — 開いているタブの状態

引数なし。`{ mode: 'disk' | 'local', sessions: [{ page, revision, uiState, connectedAt }] }` を返す。

- **disk モード（ローカルサーバーが到達不能）でもエラーにならない。** `{ mode: 'disk', sessions: [] }` が正常な応答。「タブが開いていない」は disk モードでは有効な情報。
- local モードでは、実際に `hello` を送ってきたタブだけが `sessions` に載る。

## `editor_wait_for_event` — 状態変化のロングポーリング

引数: `{ since?, types?, timeoutMs? }`。**disk モードでは呼べない**（`local-required` エラー）。

- `since` を省略すると「呼び出し時点より後のイベントのみ」が対象になる。過去分は再生されない
- `timeoutMs` の既定は 10,000ms、上限 30,000ms（超えると無言でクランプされる）
- `types` に未知の値を渡すと `invalid` で 400
- 応答の `overflowed: true` は、`since` より古いイベントがリングバッファ（既定 500 件）から溢れて失われた可能性を示す。取りこぼしを疑ったら `editor_state_get` で状態を取り直す

イベント種別（`types` に指定できる値）:

| type                                             | いつ発火するか                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `session-connected` / `session-disconnected`     | タブが接続／切断したとき                                                                        |
| `ui-state`                                       | タブの UI 状態が変化するたび                                                                    |
| `ui-idle`                                        | `ui-state` が busy → idle に遷移したとき（`user-editing` 回避に使う）                           |
| `content-saved`                                  | ディスク／ブラウザいずれかへの書き込みが成功したとき（Front Matter とページ構造系ツールを除く） |
| `content-changed`                                | 外部（IDE の直接編集や別プロセス）からの変更を検知したとき                                      |
| `front-matter-changed`                           | `front_matter_set` の成功                                                                       |
| `page-created` / `page-deleted` / `page-renamed` | ページ構造系ツールの成功                                                                        |

## 外部変更由来の `stale`

`readToken` を正しく渡していても、**IDE で直接ファイルを保存した直後**などは `stale` になることがある。これはディスクの内容が `readToken` 発行時と食い違っている（＝外部変更を検知した）ことを示す。応答に同梱される `readToken` と `currentBlocks` で状態を確認し、意図通りの変更が既に外部で入っているなら、それを踏まえて再度読み直す。

## `local-unreachable` — 自分で `bge` を起動しない

ローカル開発サーバーに届かない、またはタブが応答前に切断された場合に返る。**AI がユーザーに代わって `bge` を起動しようとしてはいけない。** ユーザーへの報告に留める。再試行すればディスクへの書き込みとして成功することもある。
