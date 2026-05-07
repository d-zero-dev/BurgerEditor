# Virtual File Tree（仮想ファイルツリー）採用ガイド

外部 CMS / ヘッドレス連携向けに、`documentRoot` 配下を「フラットな ID 名のファイル群」のまま運用しつつ、編集 UI 上では Front Matter の値からツリー構造を再構築するオプトイン機能。

このドキュメントは「採用するかしないかの判断」「採用するなら何を準備するか」「失敗時の戻し方」を扱う。機能の API リファレンスは [README.md](../README.md#virtual-file-tree仮想ファイルツリー) を参照。

---

## いつ使うか

以下のすべてに当てはまるプロジェクトで採用する。

- 外部システム（CMS、独自ファイルサーバ、エクスポートパイプライン）が `<id>.html` のような不透明な ID 名でファイルを管理しており、その命名を変えられない
- 編集者には「about ページ」「会社情報 / 沿革」のような直感的なパスでファイルを見せたい
- 各ファイルの Front Matter に論理パスを書くフィールド（既定 `path`、変更可）が用意できる

## いつ使わないか

以下のいずれかに当てはまるプロジェクトでは採用しない。`virtualTree.enabled = false`（既定）のまま使う。

- すでにディレクトリ構造で HTML を整理している（`pages/about/index.html` 等）。仮想ツリーに切り替える必然性がない
- ファイル名が人間可読（`about.html`、`company.html` 等）で運用上問題ない
- 同じ論理パスを複数のファイルに持たせたい、または論理パスがファイル間で衝突する可能性がある
- 編集者に ID を意識させたくない（仮想モード時は新規作成ダイアログで ID 入力が必須）

---

## 採用前提

仮想モードを有効化してサーバを起動するためには、`documentRoot` 直下の **すべての `*.html`** が以下を満たす必要がある。満たさないファイルが 1 つでもあれば起動が失敗する。

1. Front Matter を持っている（`---` で囲まれた YAML ブロック）
2. Front Matter に `pathKey`（既定 `path`）を **空でない文字列値** として持っている
3. `pathKey` の値がプロジェクト内で **一意**（衝突したら起動拒否）

例：

```html
---
path: company/about.html
title: 会社概要
---

<div class="my-editor">…</div>
```

---

## 採用手順

### 1. プロジェクトの状態を確認する

```bash
# documentRoot 直下の HTML 数を数える
find <documentRoot> -maxdepth 1 -name '*.html' | wc -l

# Front Matter を持たないファイルを洗い出す
for f in <documentRoot>/*.html; do
    head -1 "$f" | grep -q '^---$' || echo "no frontmatter: $f"
done
```

### 2. 設定を有効化

`burgereditor.config.js` に以下を追記。

```js
export default {
	// ...既存の設定...
	virtualTree: {
		enabled: true,
		pathKey: 'path', // プロジェクトで使うキー名
	},
};
```

### 3. 起動

```bash
yarn dev
# または
npx bge
```

成功すればブラウザでツリーが論理パスで表示される。失敗時は次節へ。

### 4. オプトアウト（戻し方）

ディスクは一切変更されないため、`virtualTree.enabled = false` に戻すだけでいつでも元の挙動に戻せる。再起動するとフラット ID のままディスク階層がツリーに反映される。

---

## 失敗パターンとリカバリ

### `PathConflictError: Conflicting logical paths in virtual tree`

複数のファイルが同じ論理パスを主張している。

```
Conflicting logical paths in virtual tree:
  - "about.html" claimed by: 1.html, 2.html
```

**対処**: 列挙された 2 つ以上のファイルのうち、いずれか以外の Front Matter `path` を別の値に書き換えて再起動。

### `Front matter "path" missing or not a string in <file>`

該当ファイルに Front Matter がない、または `pathKey` の値が文字列でない（数値、`null`、配列、欠落）。

**対処**: ファイルを開いて Front Matter を追加または修正。

```html
---
path: some/logical/path.html
---
```

### `IdAlreadyExistsError: File ID "<id>" is already in use`

新規作成 API が叩かれたが、その ID は既にディスクに存在している。クライアントの入力ミスがほとんど。

実際のメッセージには末尾に `(currently mapped to "<logical-path>")` が付き、その ID が現在どの論理パスで運用されているかを示す。重複していたファイルの所在をそこから辿れる。

**対処**: 新規作成ダイアログで重複しない ID を再入力する。

### `400 Resolved path escapes documentRoot`

ID やパスに `..`、`/`、`\` などのパス区切り / トラバーサル試行が含まれている（[セキュリティ修正済み](../README.md#virtual-file-tree仮想ファイルツリー)）。

**対処**: ID には以下を含めない。

- パス区切り `/` および `\`
- NUL 文字 `\0`
- `.`（ドット 1 つ）あるいは `..`（ドット 2 つ）そのもの
- 先頭が `.` で始まる文字列（dotfile）

それ以外の文字は許可されますが、ファイル名としての安全性を考えると英数字・アンダースコア・ハイフン・ドット（先頭以外）に絞るのが無難です。

---

## トラブルシュート

### 仮想ツリーに登録したはずのファイルが UI から開けない

論理パス（Front Matter の `path`）に `..` や絶対パス風の値が含まれていないか確認する。論理パスはディスクへ届かないので脱出はしないが、ブラウザのリンク正規化で別 URL に飛ばされるため UI から開けなくなる。詳細は [#755](https://github.com/d-zero-dev/BurgerEditor/issues/755)。

### 起動失敗のメッセージが Stack Trace に埋もれる

現状は uncaught exception として Node が出力する。専用の整形は [#754](https://github.com/d-zero-dev/BurgerEditor/issues/754) で対応予定。当面はメッセージの最初の数行（`Error: ...` の直後）のみを読めば原因が特定できる。

---

## 参考リンク

- [README.md の Virtual File Tree セクション](../README.md#virtual-file-tree仮想ファイルツリー) — API リファレンス
- [#753](https://github.com/d-zero-dev/BurgerEditor/issues/753) — `client/create-editor.ts` のテスト整備
- [#754](https://github.com/d-zero-dev/BurgerEditor/issues/754) — 起動失敗時の出口テスト
- [#755](https://github.com/d-zero-dev/BurgerEditor/issues/755) — 論理パスのサニタイズ
- [gray-matter](https://github.com/jonschlinkert/gray-matter) — 内部で使っている Front Matter パーサ
- 検索キーワード: `BurgerEditor virtualTree` / `PathConflictError` / `IdAlreadyExistsError` / `@burger-editor/local frontmatter path`

## このドキュメントの更新責任

`@burger-editor/local` のメンテナ。仮想ツリー機能の挙動を変更したら同時にこのドキュメントを更新する。RC 期間中の仕様変更は自由。安定リリース後はマイグレーションパスをここに追記する。
