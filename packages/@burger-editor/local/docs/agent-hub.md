# Agent Hub — 状態観測・外部変更検知

Agent Hub 全体の概要（エンドポイント一覧、非ループバック bind 時の認証、デバッグ方法）は [README.md の Agent Hub セクション](../README.md#agent-hub)を参照。このドキュメントは状態観測（`GET /api/agent/events` / `editor_wait_for_event`）と外部変更の能動検知（`fs.watch`）、それに紐づくブラウザ側の挙動（ナビツリー再ハイドレート・通知バナー）に絞って書く。

## `GET /api/agent/events` / `editor_wait_for_event`

`AgentHub` は起動時に `agent/event-log.ts` の `EventLog`（既定 500 件のリングバッファ）を 1 つ持つ。`agent/hub.ts`（`TabHub` 自体は `EventLog` を知らない — セッション遷移をハンドリングする `hub.ts` 側が `TabHub` の戻り値を見て積む）、`agent/route.ts` のディスク／ブラウザ適用の成功パス、`agent/fs-watcher.ts` の外部変更検知が、このログへ次のイベント種別を積む。

| イベント種別                                     | 発火元                                                                                                           | 主なペイロード                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `session-connected`                              | `hello` が受理された（`serverSession` が一致した）とき                                                           | `{ sessionId, page }`                                                  |
| `session-disconnected`                           | `/ws/editor` の切断（`route.tsx` の `onClose` → `AgentHub.closeSession`）                                        | `{ sessionId, page }`                                                  |
| `ui-state`                                       | `ui-state` フレーム受信のたび                                                                                    | `{ sessionId, uiState }`                                               |
| `ui-idle`                                        | `ui-state` が busy → idle に遷移したとき（`ui-state` に加えて追加で発火）                                        | `{ sessionId }`                                                        |
| `content-saved`                                  | ブラウザ適用・ディスク適用いずれかの書き込み成功（`front_matter_set` とページ構造系ツールを除く）                | `{ page, appliedTo }`                                                  |
| `content-changed`                                | `fs.watch` が local 外からの変更を検知したとき、または invoke 前のハッシュ比較で外部変更を検知したとき           | `{ page }`                                                             |
| `front-matter-changed`                           | `front_matter_set` の成功                                                                                        | `{ page, appliedTo: 'disk' }`                                          |
| `page-created` / `page-deleted` / `page-renamed` | `page_create` / `page_copy` / `page_concat`（created）、`page_delete`（deleted）、`page_rename`（renamed）の成功 | `{ from?, to? }`（ブラウザへの `page-event` ブロードキャストと同じ形） |

`GET /api/agent/events?since=&timeoutMs=&types=` と `editor_wait_for_event({ since, timeoutMs, types })` は同じ `EventLog.waitFor` を呼ぶ薄いラッパー。

- `since` 省略時は「呼び出し時点より後のイベントのみ」。過去分の再生はしない
- `timeoutMs` は既定 10,000ms、上限 30,000ms（超過分は無言でクランプ）
- `types` に `AGENT_EVENT_TYPES`（`agent/event-log.ts`）に無い値を渡すと 400 `invalid`
- 応答は `{ events, nextSince, timedOut, overflowed }`。`overflowed: true` は、`since` に渡したカーソルより古いイベントがリングバッファから溢れて失われている可能性があることを示す — 取りこぼしを検知したら `editor_state_get` で状態を取り直す
- HTTP 接続が切断されるとサーバー側の待受も即座に終了する（`c.req.raw.signal` を `waitFor` の `signal` に渡している）

`@burger-editor/mcp-server` の `router.ts` は `editor_wait_for_event` を転送するときだけ、`local` 側の `timeoutMs`（クランプ後）に 5,000ms のマージンを足した `AbortSignal.timeout` を fetch に付ける。これは通常経路ではない — 正常時は `local` 自身が `timeoutMs` 以内に 200 で応答するので、この abort は「`local` がハングした」場合だけの安全弁。

## 外部変更の能動検知（`agent/fs-watcher.ts`）

`invoke` のたびに行っているディスクハッシュ比較（`agent/route.ts` の `runViaBrowserOrDisk`）は受動的 — エージェントが何か呼ぶまで気づかない。`fs-watcher.ts` は `fs.watch(documentRoot, { recursive: true })` で IDE の直接編集や別プロセスの disk モード書き込みを能動的に検知し、該当ページを開いているタブへ即座に `reload { reason: 'external-change' }` を送って `content-changed` イベントを積む。

**スコープ**: `virtualTree.enabled: false` のときのみ起動する（`commands/server.ts`）。`virtualTree` 有効時はディスクのファイル名（`<id>.html`）から論理パスへの逆引きに `route.tsx` が閉じ込めている `ResolverState` が必要で、それをこの機能のためだけに外へ引き回すコストが、既存の受動検知（invoke 時のハッシュ比較。virtualTree 有効時も正しく動く）に対する追加の利益に見合わない。将来 `ResolverState` を共有しやすい形に切り出す機会があれば拡張余地はある。

`hub.revisions`（`RevisionRegistry`）にエントリが無い、または `persistedHash` が `null`（＝一度もエージェントが読み書きしていない）ページへの変更は無視する — 無関係なファイルへの変更でタブを再読み込みさせないため。自分自身の保存（`route.ts` が書き込み直後に `persistedHash` を更新する）は、`fs.watch` のコールバックが（非同期・デバウンスされて）発火する頃には比較対象のハッシュが既に一致しているため、二重通知にはならない。

**受動検知（`runViaBrowserOrDisk`）も検知した外部変更を自分で `bump()` する**: `invoke` 時のハッシュ比較が外部変更を検知して `stale` を投げるとき、`fs-watcher.ts` の `handleChange` と同じく `hub.revisions.bump()` で `persistedHash` を新しいハッシュへ進めてから `content-changed` を積む。先に検知した側が変更を「引き取る」ことで、もう一方の検知（`invoke` 前後で独立に走る `fs.watch` コールバック）が同じ外部変更を古い `persistedHash` と比較して二重に `content-changed`／reload を発生させることを防いでいる。

**Linux（Docker テスト環境）で実際に踏んだ罠**: `yarn test`（Docker/Linux）で `fs-watcher.spec.ts` を実行したところ、1 回の書き込みに対して revision が 2 回分（+2）進む不具合が実測で見つかった。原因は inotify（Linux）が macOS の FSEvents と異なり 1 回の書き込みに対してコールバックを 2 回発火させることがあり、非同期の `computeContentHash` を挟む間に両方のコールバックが同じ古い `persistedHash` を読んでしまう競合状態だった。対策として `hash-check.ts` の比較対象エントリは `computeContentHash` の **後に** 再取得する（`handleChange` 内、`bump()` との間に `await` を挟まない）。回帰テストは `fs-watcher.ts` がテスト専用に公開する `__handleChangeForTest` を `Promise.all` で 2 回同時に呼び、実際の OS イベント回数に依存せず決定的に再現している。

**Linux（Docker テスト環境）での `recursive: true` 対応**: Node のドキュメント上、`recursive` オプションは元々 macOS / Windows でのみ確実にサポートされるとされていた。`fs-watcher.spec.ts` はサブディレクトリを含む実ファイル変更で検証しており、`yarn test`（Docker/Linux）がこの機能の実地確認を兼ねる。Linux で機能しないことが判明した場合は chokidar 等サードパーティ実装への切り替えを検討する（新規依存追加はサプライチェーン方針上ユーザー確認が必要）。

## ブラウザ側: ナビツリー再ハイドレート・通知バナー

`client/agent-link.ts` の `AgentLinkOptions.onPageEvent` に登録したコールバックが、`page-event`（作成・削除・改名）を受信するたびに呼ばれる。`client/create-editor.ts` はここで:

1. 常に `client/nav-tree.ts` の `hydrateNavTree()` を呼び直す（同関数は複数回呼んでも安全な冪等な再描画関数として設計済み）
2. `client/page-event-banner.ts` の `pageGoneBannerFor(message, page, indexFileName)`（純粋関数 — 「自分が開いているページの `deleted`/`renamed` か」の判定だけを担い、DOM 操作を持たないため単体テストしやすい）が非 `null` を返したときだけ、同ファイルの `showPageGoneBanner()` で非ブロッキングの通知バナーを出す（`alert()` は使わない）

`agent/route.ts` の `notifyPageEvent` が、各ページ系ツールの成功結果から `from` / `to` を埋めて `page-event` をブロードキャストしている（`page_delete` の結果は `{ path }`、`page_rename` は `{ from, to }` など、ツールごとに結果の形が異なるため `pageEventTarget()` が読み替える）。

## 参考リンク

- [README.md の Agent Hub セクション](../README.md#agent-hub)

## このドキュメントの更新責任

`@burger-editor/local` のメンテナ。イベント種別・エンドポイント契約・`fs-watcher` のスコープを変更したら同時にこのドキュメントを更新する。
