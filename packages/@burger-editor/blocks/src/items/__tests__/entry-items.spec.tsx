import { describe, expect, test } from 'vitest';

import { editorItems } from '../editor-items.js';
import { items } from '../items.js';

// ルート（`@burger-editor/blocks`）の items は Node.js から読まれるため Editor を
// 持たない定義、`@burger-editor/blocks/editor` の items は同じ定義に Editor を
// 合成したもの。両者の対応が崩れると、サーバー側とブラウザ側で別のアイテムを
// 見ることになる

const ITEM_NAMES = [
	'button',
	'details',
	'download-file',
	'google-maps',
	'hr',
	'image',
	'import',
	'table',
	'title-h2',
	'title-h3',
	'wysiwyg',
	'youtube',
] as const;

describe('ルートの items（Editor なしの定義）', () => {
	test('標準の 12 アイテムを提供する', () => {
		expect(Object.keys(items).toSorted()).toEqual([...ITEM_NAMES]);
	});

	test.each(ITEM_NAMES)('%s は Editor を持たない', (name) => {
		expect('Editor' in items[name]).toBe(false);
	});
});

describe('blocks/editor の items（Editor 付き）', () => {
	test('ルートと同じ 12 アイテムを提供する', () => {
		expect(Object.keys(editorItems).toSorted()).toEqual([...ITEM_NAMES]);
	});

	test.each(ITEM_NAMES)('%s は Editor を持つ', (name) => {
		expect(typeof editorItems[name].Editor).toBe('function');
	});

	test.each(ITEM_NAMES)('%s はルートの定義と同じ内容に Editor を足したもの', (name) => {
		const definition = items[name];
		const withEditor = editorItems[name];

		expect(withEditor.name).toBe(name);
		expect(withEditor.name).toBe(definition.name);
		expect(withEditor.version).toBe(definition.version);
		expect(withEditor.template).toBe(definition.template);
		expect(withEditor.style).toBe(definition.style);
	});

	test.each(ITEM_NAMES)('%s は定義の変換関数をそのまま引き継ぐ', (name) => {
		const definition = items[name] as Record<string, unknown>;
		const withEditor = editorItems[name] as Record<string, unknown>;

		expect(withEditor.toEditorState).toBe(definition.toEditorState);
		expect(withEditor.toItemData).toBe(definition.toItemData);
		expect(withEditor.editorOptions).toBe(definition.editorOptions);
	});
});
