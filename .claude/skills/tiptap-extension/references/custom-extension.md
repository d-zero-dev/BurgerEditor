# カスタム拡張の書き方

公式拡張では足りない独自の属性・コマンドを持たせる場合の実装パターン。実装の正は `packages/@burger-editor/custom-element/src/tiptap-extentions/paragraph-with-align.ts` の `ParagraphWithAlign`。

## 目次

- [既存ノードを拡張する（ParagraphWithAlign）](#既存ノードを拡張するparagraphwithalign)
- [属性の parseHTML / renderHTML](#属性の-parsehtml--renderhtml)
- [既存ノードと同名で上書きする場合の解決順](#既存ノードと同名で上書きする場合の解決順)
- [テスト例](#テスト例)
- [見た目に影響する属性の CSS](#見た目に影響する属性の-css)

## 既存ノードを拡張する（ParagraphWithAlign）

```ts
import Paragraph from '@tiptap/extension-paragraph';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		paragraphWithAlign: {
			setAlign: (alignment: ParagraphAlignment) => ReturnType;
			unsetAlign: () => ReturnType;
			toggleAlign: (alignment: ParagraphAlignment) => ReturnType;
		};
	}
}

export type ParagraphAlignment = 'start' | 'center' | 'end';

export const ParagraphWithAlign = Paragraph.extend({
	name: 'paragraph', // 既存ノードと同名にして置き換える

	addAttributes() {
		return {
			...this.parent?.(), // 親の属性を継承する
			'data-bgc-align': {
				default: null,
				parseHTML: (element) => {
					const align = element.dataset.bgcAlign;
					if (align && ['start', 'center', 'end'].includes(align)) {
						return align;
					}
					return null; // 不正値は捨てる
				},
				renderHTML: (attributes) => {
					if (!attributes['data-bgc-align']) {
						return {}; // 値が無ければ属性を出力しない
					}
					return { 'data-bgc-align': attributes['data-bgc-align'] };
				},
			},
		};
	},

	addCommands() {
		return {
			setAlign:
				(alignment: ParagraphAlignment) =>
				({ commands }) =>
					commands.updateAttributes('paragraph', { 'data-bgc-align': alignment }),
			unsetAlign:
				() =>
				({ commands }) =>
					commands.resetAttributes('paragraph', 'data-bgc-align'),
			toggleAlign:
				(alignment: ParagraphAlignment) =>
				({ commands, editor }) => {
					if (editor.isActive('paragraph', { 'data-bgc-align': alignment })) {
						return commands.unsetAlign();
					}
					return commands.setAlign(alignment);
				},
		};
	},
});
```

要点:

- `declare module '@tiptap/core'` でコマンドを型宣言する。宣言しないと `editor.chain().toggleAlign()` が型エラーになる
- `addAttributes()` では `...this.parent?.()` で親の属性を残す
- 新しい Node / Mark を一から作る場合は `Node.create()` / `Mark.create()` を使い、同ディレクトリの `note.ts`・`flex-box.ts`・`button-like-link.ts` を参考にする

## 属性の parseHTML / renderHTML

| 関数         | 役割                                 | 守ること                                           |
| ------------ | ------------------------------------ | -------------------------------------------------- |
| `parseHTML`  | DOM から属性値を読む                 | 許可リストで検証し、不正値は `null` を返す         |
| `renderHTML` | 属性値を HTML 出力用の属性に変換する | 値が `null` のときは `{}` を返す（属性を出さない） |

どちらかが欠けると、HTML ⇔ Wysiwyg の往復で属性が消え、構造変更として検出される。

```ts
parseHTML: (element) => {
	const value = element.getAttribute('data-custom');
	if (value && ['valid1', 'valid2'].includes(value)) {
		return value;
	}
	return null;
},
```

## 既存ノードと同名で上書きする場合の解決順

`BgeWysiwygElement` は `[StarterKit, BgeWysiwygEditorKit, ...BgeWysiwygElement.extensions]` の順で拡張を渡す。`StarterKit` の `paragraph` と `ParagraphWithAlign` は両方とも登録され、`@tiptap/core` の `resolveExtensions` が次のように処理する。

1. `addExtensions()` を展開して平坦化する（親の直後に子が並ぶ）
2. `priority` の降順で安定ソートする。`Paragraph.extend()` は親の `priority: 1000` を継承するため、同値のまま登録順が保たれる
3. 同名があると `[tiptap warn]: Duplicate extension names found: ['paragraph']. This can lead to issues.` を出す（このリポジトリでは既知の想定内の警告）
4. スキーマ構築（`getSchemaByResolvedExtensions`）では名前をキーにノード定義を作るため、**ソート後の並びで後ろにある方** が採用される

したがって `BgeWysiwygEditorKit` に入れれば `StarterKit` 版より後ろになり上書きできる。`priority` を親より大きくすると前に並び、逆に負ける点に注意する。

## テスト例

`packages/@burger-editor/custom-element/src/bge-wysiwyg-element/index.spec.ts` に追加する。

```ts
test('expectHTML preserves <sup> elements correctly', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>x<sup>2</sup></p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	expect(element.expectHTML('<p>x<sup>2</sup></p>')).toBe('<p>x<sup>2</sup></p>');
});

test('expectHTML preserves data-bgc-align attribute', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p data-bgc-align="center">Text</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	expect(element.expectHTML('<p data-bgc-align="center">Text</p>')).toBe(
		'<p data-bgc-align="center">Text</p>',
	);
});
```

網羅すべき観点:

- 要素・属性が `expectHTML` で保持される
- 不正な属性値が除去される（既存の `expectHTML ignores invalid data-bgc-align values` を参照）
- その要素を含む HTML で Wysiwyg モードへ切り替えられる（`hasStructureChange` が立たない。既存の `should allow switching to Wysiwyg mode when data-bgc-align attributes exist` を参照）

## 見た目に影響する属性の CSS

- Wysiwyg 内の汎用属性: `packages/@burger-editor/blocks/src/general.css`

  ```css
  :where([data-bgc-align]) {
  	&[data-bgc-align='start'] {
  		text-align: start;
  	}
  	&[data-bgc-align='center'] {
  		text-align: center;
  	}
  	&[data-bgc-align='end'] {
  		text-align: end;
  	}
  }
  ```

- 特定アイテムでのみ使う属性: そのアイテムのディレクトリ内の `style.css`
- `@burger-editor/css` は blocks の `general.css` と各アイテムの `style.css` をビルド時に統合するため、blocks 側に書けば反映される
