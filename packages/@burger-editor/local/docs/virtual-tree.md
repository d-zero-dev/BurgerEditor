# Virtual File Tree（仮想ファイルツリー）採用ガイド

外部 CMS/ヘッドレス連携向けに、`documentRoot`配下を「フラットな ID 名のファイル群」のまま運用しつつ、編集 UI 上では Front Matter の値からツリー構造を再構築するオプトイン機能。

このドキュメントは「採用するかしないかの判断」「採用するなら何を準備するか」「失敗時の戻し方」を扱う。設定とパス形式のリファレンスは[README.md の Virtual File Tree セクション](../README.md#virtual-file-tree)を参照。

---

## いつ使うか

以下のすべてに当てはまるプロジェクトで採用する。

- 外部システム（CMS、独自ファイルサーバ、エクスポートパイプライン）が`<id>.html`のような不透明な ID 名でファイルを管理しており、その命名を変えられない
- 編集者には「about ページ」「会社情報/沿革」のような直感的なパスでファイルを見せたい
- 各ファイルの Front Matter に論理パスを書くフィールド（既定`path`、変更可）が用意できる

## いつ使わないか

以下のいずれかに当てはまるプロジェクトでは採用しない。`virtualTree.enabled = false`（既定）のまま使う。

- すでにディレクトリ構造で HTML を整理している（`pages/about/index.html`等）。仮想ツリーに切り替える必然性がない
- ファイル名が人間可読（`about.html`、`company.html`等）で運用上問題ない
- 同じ論理パスを複数のファイルに持たせたい、または論理パスがファイル間で衝突する可能性がある
- 編集者に ID を意識させたくない（仮想モード時は新規作成ダイアログで ID 入力が必須）

---

## 採用前提

仮想モードを有効化してサーバを起動するためには、`documentRoot`直下の **すべての`*.html`** が以下を満たす必要がある。満たさないファイルが 1 つでもあれば起動が失敗する。

1. Front Matter を持っている（`---`で囲まれた YAML ブロック）
2. Front Matter に`pathKey`（既定`path`）を **空でない文字列値** として持っている
   - 値の先頭スラッシュは除去されて正規化される。`path: foo.html`と`path: /foo.html`は同じ論理パスとして扱われる
   - 先頭の連続スラッシュ（`//foo.html`、`///foo.html`等）も同様に除去される
   - 正規化後に空文字列になる値（`'/'`のみ、`'////'`のみ等）は受け付けない
3. `pathKey`の値がプロジェクト内で **一意**（衝突したら起動拒否）

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

`burgereditor.config.js`に以下を追記。

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
npx bge
```

成功すればブラウザでツリーが論理パスで表示される。失敗時は次節へ。

### 4. オプトアウト（戻し方）

ディスクは一切変更されないため、`virtualTree.enabled = false`に戻すだけでいつでも元の挙動に戻せる。再起動するとフラット ID のままディスク階層がツリーに反映される。

---

## 起動失敗のメッセージと対処

起動時の検査に失敗すると、メッセージを stderr に出して exit code 1 で終了する（スタックトレースは出ない）。PM2/systemd などのプロセスマネージャは exit code で失敗を判定できる。

### 論理パスの衝突

複数のファイルが同じ論理パスを主張している。衝突している論理パスと、それを主張するファイルが一覧される。

```
Conflicting logical paths in virtual tree:
  - "about.html" claimed by: 1.html, 2.html

Fix the conflicting front matter "path" values in the listed files and retry.
```

**対処**: 列挙されたファイルのうち 1 つを残し、他のファイルの Front Matter `path`を別の値に書き換えて再起動する。

### Front Matter の`pathKey`が不正

最初に見つかった不正なファイルについて、次のいずれかが出る（`path`は`pathKey`の値、`1.html`はファイル名）。

```
Failed to load virtualTree resolver state:
  Front matter "path" missing in 1.html
```

| メッセージ（2 行目）                                         | 原因                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `Front matter "path" missing in 1.html`                      | Front Matter が無い、または`pathKey`のキーが無い           |
| `Front matter "path" is not a string (got number) in 1.html` | 値が文字列でない（`got`の後に実際の型が入る）              |
| `Front matter "path" is an empty string in 1.html`           | 値が空文字列                                               |
| `Front matter "path" normalizes to empty string in 1.html`   | 値が`'/'`や`'///'`のように、先頭スラッシュ除去後に空になる |

**対処**: ファイルを開いて Front Matter を追加または修正し、再起動する。

```html
---
path: some/logical/path.html
---
```

---

## 編集 API が返すエラー

新規作成（`POST /api/content/create`）と保存（`POST /api/content`）は、不正な入力を次のエラーで拒否する。

### ID が既に使われている（409）

```
File ID "10.html" is already in use (currently mapped to "company/about.html").
```

新規作成で指定した ID（`.html`が付いていなければ補われる）が、既に別の論理パスで登録されている。括弧内の論理パスから既存ファイルを辿れる。

**対処**: 新規作成ダイアログで重複しない ID を再入力する。

### 論理パスが空になる（400）

```
Logical path normalizes to empty string: "/"
```

送信した`path`/`frontMatter[pathKey]`が`'/'`や`'///'`のように、先頭スラッシュ除去後に空文字列になる。

**対処**: パスにファイル名を含める。例: `'/about.html'`は`'about.html'`として登録される。

### ID に使えない文字が含まれている（400）

```
id must not contain path separators, NUL bytes, or be "." / ".." / a dotfile
```

ID には以下を含められない。

- パス区切り`/`および`\`
- NUL 文字`\0`
- `.`（ドット 1 つ）あるいは`..`（ドット 2 つ）そのもの
- 先頭が`.`で始まる文字列（dotfile）

それ以外の文字は許可されるが、ファイル名としての安全性を考えると英数字・アンダースコア・ハイフン・ドット（先頭以外）に絞るのが無難。

### 論理パスに`..` / `.` / NUL が含まれている（400）

```
logical path must not contain "." or ".." segments or NUL bytes
```

`frontMatter[pathKey]`経由のときは先頭に`Front matter "path" `が付く。任意位置の`..`/`.`セグメント（`../foo.html`、`foo/../bar.html`、`./foo.html`、`foo/./bar.html`など）と NUL 文字が対象。

理由: 論理パスはファイルシステムに届かないので`documentRoot`の外には出ないが、ブラウザは`<a href="/../foo.html">`のクリック時に URL を`/foo.html`へ正規化してしまう。一方サーバ側の登録キーは`../foo.html`のままなので対応するファイルを引けず、ファイルは保存されているのに UI から二度と開けなくなる（[PR #758](https://github.com/d-zero-dev/BurgerEditor/pull/758)）。

**対処**: パスから`..`/`.`セグメントを除き、ファイル名を含む通常の論理パス（`company/about.html`等）に書き換える。

> **注意**: この検査は API の入力にだけ掛かる。ディスク上の Front Matter に`..` / `.`セグメントを含む論理パスが既に書かれていても起動時には検査されず、そのページは編集 UI から開けない。Front Matter を直接編集して論理パスを修正してから再起動すること。

---

## 参考リンク

- [README.md の Virtual File Tree セクション](../README.md#virtual-file-tree) — 設定とパス形式のリファレンス
- [gray-matter](https://github.com/jonschlinkert/gray-matter) — 内部で使っている Front Matter パーサ
