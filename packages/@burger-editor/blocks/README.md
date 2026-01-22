# @burger-editor/blocks

## 概要

ブロックエディタの標準ブロックと標準アイテムを提供するパッケージです。

> **ℹ️ ブロックの構造仕様について**
> ブロックの構造管理は[@burger-editor/core](../core/)で行われています。
> ブロック構造の詳細仕様については [@burger-editor/core のREADME](../core/README.md#ブロックの仕様) を参照してください。

## 提供されるアイテム

このパッケージでは以下のアイテムを提供しています：

- **button** - ボタン
- **details** - 折りたたみ要素
- **download-file** - ダウンロードファイル
- **google-maps** - Google Maps 埋め込み
- **hr** - 水平線
- **image** - 画像
- **table** - テーブル
- **title-h2** - 大見出し（h2）
- **title-h3** - 中見出し（h3）
- **wysiwyg** - リッチテキストエディタ
- **youtube** - YouTube 動画埋め込み

## 提供されるブロックカタログ

このパッケージではデフォルトのブロックカタログを提供しています：

### 見出し

- **大見出し** (h2) - title-h2 アイテムを使用
- **中見出し** (h3) - title-h3 アイテムを使用

### 基本ブロック

- **テキスト** (wysiwyg) - wysiwyg アイテムを使用
- **画像** (image) - image アイテムを使用
- **折りたたみ** (disclosure) - details アイテムを使用
- **テーブル** (table) - table アイテムを使用
- **YouTube** (youtube) - youtube アイテムを使用

### カード

- **画像 + テキスト** (image-text) - image と wysiwyg アイテムを3列グリッドで組み合わせ
- **テキスト+画像+テキスト** (text-image-text) - wysiwyg、image、wysiwyg を3列グリッドで組み合わせ

### 画像+テキスト

- **画像右寄せ: テキスト回り込み** (text-float-image-end) - 画像が右に浮動し、テキストが回り込み
- **画像左寄せ: テキスト回り込み** (text-float-image-start) - 画像が左に浮動し、テキストが回り込み
- **画像右寄せ: テキスト回り込み無し** (text-start-image-end) - テキストと画像を左右に配置（回り込み無し）
- **画像左寄せ: テキスト回り込み無し** (image-start-text-end) - 画像とテキストを左右に配置（回り込み無し）

### ボタン

- **ボタン** (button) - button アイテムを3つ横並びで配置
- **テキストリンク** (button) - リンク形式のボタンを3つ配置
- **ファイルダウンロード** (file) - download-file アイテムを3つ横並びで配置
- **コンテンツナビゲーション** (content-navigation) - ページ内リンクボタンを4列グリッドで8つ配置

### その他

- **Google Maps** (google-maps) - google-maps アイテムを使用
- **区切り線** (hr) - hr アイテムを使用

## 使用方法

```typescript
import { items, defaultCatalog } from '@burger-editor/blocks';

// アイテムの使用
const wysiwygItem = items.wysiwyg;

// ブロックカタログの使用
const catalog = defaultCatalog;
```

## スタイルシート

このパッケージは以下のCSSファイルを提供します：

### general.css

ブロック全体の基本スタイルを定義します。以下の機能を含みます：

- **ブロックコンテナ**: `[data-bge-container]` - レイアウト、余白、背景色などの基本スタイル
- **グリッドレイアウト**: `grid` - 自動フィット/フィル対応の柔軟なグリッドシステム
- **インラインレイアウト**: `inline` - フレックスボックスベースの横並びレイアウト
- **フロートレイアウト**: `float` - テキスト回り込みレイアウト
- **Wysiwyg内フレックスボックス**: `[data-bgc-flex-box]` - リッチテキスト内での横並びレイアウト
- **Wysiwyg内段落整列**: `[data-bgc-align]` - テキストの左寄せ/中央寄せ/右寄せ

### 各アイテムのスタイル

各アイテムは個別の`style.css`ファイルを持ち、アイテム固有のスタイルを定義します。

> **ℹ️ 統合CSSパッケージ**: すべてのスタイルを1つのファイルで利用したい場合は、[@burger-editor/css](../css/)パッケージを使用してください。

## カスタムアイテムの作成

独自のアイテムを作成する場合は、[@burger-editor/core](../core/README.md)の`createItem`関数を使用します。

> **📖 エディターAPIの詳細**: アイテムエディターのAPIの使い方と実践的なユースケースについては、[アイテムエディターAPIガイド](../../../docs/item-editor-api.md)を参照してください。
