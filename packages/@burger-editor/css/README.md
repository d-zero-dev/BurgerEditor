# @burger-editor/css

[![npm version](https://badge.fury.io/js/@burger-editor%2Fcss.svg)](https://badge.fury.io/js/@burger-editor%2Fcss)

BurgerEditorブロック用の統合スタイルシートパッケージです。

## 概要

`@burger-editor/css`は、[@burger-editor/blocks](../blocks/)で定義されている全ブロックとアイテムのCSSスタイルを統合した配布パッケージです。`general.css`と各アイテムの`style.css`を1つのファイルにまとめて提供します。

## インストール

```bash
npm install @burger-editor/css
```

または

```bash
yarn add @burger-editor/css
```

## 使用方法

### JavaScriptからのインポート

```javascript
import '@burger-editor/css';
```

### HTMLからの読み込み

```html
<link rel="stylesheet" href="/node_modules/@burger-editor/css/style.css" />
```

### Viteでの使用

```javascript
import '@burger-editor/css';
```

### Webpackでの使用

```javascript
import '@burger-editor/css';
```

Webpackの設定で`css-loader`が有効になっている必要があります。

## 含まれるスタイル

このパッケージには以下のスタイルが含まれています：

- **General CSS**: ブロック全体の基本スタイル
- **各アイテムのスタイル**:
  - button
  - details
  - download-file
  - google-maps
  - hr
  - image
  - table
  - title-h2
  - title-h3
  - wysiwyg
  - youtube

## ビルド

このパッケージのCSSは、ビルド時に[@burger-editor/blocks](../blocks/)から自動的に生成されます。

```bash
yarn build
```

ビルドスクリプト（`build.js`）が`@burger-editor/blocks`パッケージからCSSファイルを収集し、`style.css`として統合します。

## 単独利用

BurgerEditorの編集機能を使わず、生成されたHTMLのスタイルだけが必要な場合は、このパッケージのみをインストールすることができます。

```bash
npm install @burger-editor/css
```

```html
<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="/node_modules/@burger-editor/css/style.css" />
	</head>
	<body>
		<!-- BurgerEditorで生成されたHTML -->
		<div data-bge-name="text-image" data-bge-container="grid:2">
			<!-- ... -->
		</div>
	</body>
</html>
```

## 関連パッケージ

- [@burger-editor/blocks](../blocks/) - ブロックとアイテムの定義
- [@burger-editor/core](../core/) - エディタエンジン
- [@burger-editor/runtime](../runtime/) - ブラウザ用ランタイム

## ライセンス

Dual Licensed under MIT OR Apache-2.0
