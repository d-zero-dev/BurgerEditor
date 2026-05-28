# CLAUDE.md — BurgerEditor `v3` ブランチ

このファイルは Claude Code (claude.ai/code) がこのリポジトリの **`v3` ブランチ** で作業する際のガイダンスです。

## このブランチ（`v3`）の役割

`v3` ブランチは BurgerEditor **3.x 系の継続メンテナンス用**ブランチです。v4 系の開発とは**独立**しており、`v3` を `dev` / `main` にマージしません。

## ブランチ戦略

| ブランチ | 用途                                                           | 系統 |
| -------- | -------------------------------------------------------------- | ---- |
| `v3`     | 3.x 系の継続メンテ（**このブランチ**）                         | 3.x  |
| `dev`    | v4 開発のデフォルトブランチ。PR はここへマージ                 | 4.x  |
| `main`   | v4 リリース用。直接 push のみ。tag push で npm publish（OIDC） | 4.x  |

- `v3` の変更は `v3` ブランチ内で完結させる。`dev` / `main` へ混ぜない
- リリースタグ（`v*`）は CODEOWNERS のみ作成・削除可（GitHub Rulesets で保護）

## パッケージ構成

| パッケージ                    | 役割                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@burger-editor/blocks`       | ブロック・タイプ定義（`src/block/`・`src/type/`）                                                                                                                      |
| `@burger-editor/client`       | 管理画面 UI。admin の JS/CSS をビルド（`dist/js/admin/`・`dist/css/admin/`）                                                                                           |
| `@burger-editor/runtime`      | 公開側 JS ランタイム（`bge_functions.min.js`：gallery=Psycle / google-maps / youtube / colorbox migration）。IIFE で `window.BgE` を生やし DOMContentLoaded で自動実行 |
| `@burger-editor/css`          | 公開側スタイルの配布（`bge_style_default.css`）                                                                                                                        |
| `@burger-editor/frozen-patty` | HTML↔JSON 双方向変換。client(admin) のみが利用                                                                                                                         |

> [!IMPORTANT]
> **`@burger-editor/frozen-patty` は 0.11.0 のソースに固定する。** `package.json` の `version` はモノレポ統一のため `3.5.0-alpha.0` だが、中身は 0.11.0。v4 版はフィールド名の camelCase 正規化・`innerHTML` の trim などで v3 と非互換になるため、**v3 では v4 版へ上げない**（renovate / `yarn upgrade` での更新に注意）。

## パッケージ管理

- **npm は使用禁止。常に yarn を使う**（`yarn@4` / Yarn Workspaces + Lerna）

```bash
yarn install
yarn add <package>
yarn remove <package>
```

## ビルド

```bash
# 全パッケージ
yarn build

# 個別パッケージ
yarn build --scope @burger-editor/<package-name>
```

- パッケージ間の依存関係を常に意識する: `npx lerna list --graph`

## テスト

テストは vitest をホスト上で実行する（Docker は使わない）。

```bash
# 全テスト
yarn test

# 単一テストファイル
npx vitest run path/to/test.spec.ts
```

## リント

```bash
yarn lint        # チェック
yarn lint:fix    # 自動修正
yarn lint:eslint # ESLint のみ
```
