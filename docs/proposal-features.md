# BurgerEditor 将来機能提案

## アイテムレベルのスタイル拡張機能

### 概要

現在のBurgerEditorではブロックレベルでのスタイル拡張機能（CSS変数による動的スタイル制御）を提供していますが、アイテム個別のスタイル拡張は戦略的に実装を見送っています。

### 実装を見送る理由

#### 1. 将来の理想的な解決策の存在

**Container Style Queries**により、以下の理想的な実装が可能になる予定：

- アイテムレベルでのCSS変数によるスタイル制御
- 既存システムとの完全な一貫性
- CSS変数ベースの拡張可能なアーキテクチャ

#### 2. 現在の技術での中途半端な実装リスク

**前方互換性の問題**:
現在の技術で実装した場合、Container Style Queries対応時に以下の問題が発生：

```
現在の実装 → 将来の実装への移行時
┌─────────────────────┐    ┌─────────────────────┐
│ 現在の妥協案         │ ❌ │ 将来の実装         │
│ - ハードコード選択肢  │ →  │ - CSS変数自動検出    │
│ - 限定的な拡張性     │    │ - CSS変数ベース拡張  │
│ - 不統一なUI        │    │ - 統一されたUI      │
└─────────────────────┘    └─────────────────────┘
        ↓
   破綻的変更が必要
```

**現在検討可能なアプローチの本質的問題**:

**核心的課題**: CSS変数だけでアイテムレベルのスタイル拡張ができるか？

**選択肢A: ブロックレベルでの対応**

```css
[data-bge-container] {
	--bge-options-button-type--primary: primary;
}
/* ❌ ブロック全体に影響、アイテム固有制御不可 */
```

**選択肢B: 現在のCSS変数システムの限界**

```css
[data-bgi='button'] {
	--bge-options-button-type--primary: primary;
}
/* ❌ CSS変数は定義できるが、動的スタイル適用にクエリ/セレクタ制約 */
```

**選択肢C: 独自のクエリ/セレクタシステム開発**

- ❌ CSS変数値に基づく動的セレクタシステムが必要
- ❌ Container Style Queriesと同等の機能を自前実装
- ❌ 標準仕様と競合するカスタム実装

**UI実装への影響**:

- editor.htmlでの選択肢提供はアプローチが決まれば実装可能
- 問題は選択した値をどうCSS適用につなげるかのアーキテクチャ

#### 3. 戦略的判断

**「今やらない」理由**:

- Container Style QueriesのBrowser Baseline対応で理想的な解決策が利用可能
- 互換性を担保することはメンテナンス上の負債になる
- 現在のブロックレベルスタイル拡張で当面の要求は満たせる

### 将来的な解決策

#### CSSコンテナスタイルクエリー活用

**将来の実装例** (Container Style Queries使用):

```css
/* アイテムレベルでのスタイル変数定義 */
[data-bgi='button'] {
	--bge-options-button-type--primary: primary;
	--bge-options-button-type--secondary: secondary;
	--bge-options-button-type--danger: danger;
	--bge-options-button-type: var(--bge-options-button-type--primary);
}

/* コンテナスタイルクエリーによる動的スタイル適用 */
@container bge-item style(--bge-options-button-type: primary) {
	[data-bgi='button'] a {
		background-color: #007bff;
		color: white;
		border: 1px solid #007bff;
	}
}

@container bge-item style(--bge-options-button-type: secondary) {
	[data-bgi='button'] a {
		background-color: #6c757d;
		color: white;
		border: 1px solid #6c757d;
	}
}

@container bge-item style(--bge-options-button-type: danger) {
	[data-bgi='button'] a {
		background-color: #dc3545;
		color: white;
		border: 1px solid #dc3545;
	}
}
```

#### ブラウザー対応状況

- **Container Style Queries**: [Can I Use](https://caniuse.com/css-container-queries-style)

### 実装提案

#### Phase 1: 基盤整備 (Browser Baseline対応後)

1. **CSS変数検出システムの拡張**
   - アイテムレベルの変数検出対応
   - `[data-bgi='アイテム名']` セレクター内の変数検出

2. **アイテムエディターUI拡張**
   - スタイル拡張セクションの追加
   - ブロックオプションダイアログとの一貫性確保

#### Phase 2: アイテム実装

1. **ボタンアイテム**

   **template.html**:

   ```html
   <a href="" data-bge=":style" style="">
   	<span data-bge="text">ボタン</span>
   </a>
   ```

   **index.ts**:

   ```typescript
   editorOptions: {
     beforeChange(newData) {
       // CSS変数値からスタイル生成
       return {
         ...newData,
         style: `--bge-options-button-type: var(--bge-options-button-type--${newData.buttonType})`
       };
     }
   }
   ```

2. **その他のアイテム**
   - 画像アイテム: フィルター効果、レイアウトモード
   - テキストアイテム: タイポグラフィ、装飾
   - テーブルアイテム: テーマ、レスポンシブ設定

### メリット

1. **デザイナー主導の拡張**
   - CSSファイル追加だけで新しいスタイルオプションを追加可能
   - プログラマーの手を借りずにカスタマイズ可能

2. **統一されたアーキテクチャ**
   - ブロックレベルとアイテムレベルで同じCSS変数システム
   - 既存のスタイル拡張システムとの整合性

3. **拡張性**
   - 将来的な新しいアイテムタイプにも対応
   - CSS変数ベースのプラグインシステム構築可能

### 結論

Container Style QueriesがBrowser Baseline対応することで、CSS変数ベースのアイテムレベルスタイル拡張が実現可能になります。現在の技術で実装すると、将来のContainer Style Queries対応時に互換性維持のメンテナンス負債が発生するため、戦略的に実装を見送ります。それまでは現在のブロックレベルスタイル拡張で対応し、将来的な機能として設計を継続します。
