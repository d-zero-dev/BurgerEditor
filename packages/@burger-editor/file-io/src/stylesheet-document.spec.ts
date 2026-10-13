import { EMPTY_CUSTOM_PROPERTY_VALUE } from '@burger-editor/core';
import { test, expect } from 'vitest';

import { createStylesheetDocument } from './stylesheet-document.js';

test('CSS テキストを順番どおりのスタイルシートとして持つ文書を返す', () => {
	const doc = createStylesheetDocument([
		'[data-bge-container] { --a: 1px; }',
		'[data-bge-container] { --b: 2px; }',
	]);

	const sheets = [...doc.styleSheets];
	expect(sheets).toHaveLength(2);
	expect(
		sheets.map((sheet) => (sheet.cssRules[0] as CSSStyleRule).style.item(0)),
	).toEqual(['--a', '--b']);
	expect(doc.defaultView).not.toBeNull();
});

test('CSS 内の </style> で文書の構造が壊れない', () => {
	const doc = createStylesheetDocument(['/* </style><p>x</p> */ :root { --a: 1px; }']);

	expect(doc.styleSheets).toHaveLength(1);
	expect(doc.body.children).toHaveLength(0);
});

test('空の値で宣言したカスタムプロパティを目印の値で残す', () => {
	const doc = createStylesheetDocument([
		'[data-bge-container] { --a: 1px; --b: ; --c:\n\t; --d:; }',
	]);

	const style = (doc.styleSheets[0]!.cssRules[0] as CSSStyleRule).style;
	expect(style.getPropertyValue('--a')).toBe('1px');
	expect(style.getPropertyValue('--b')).toBe(EMPTY_CUSTOM_PROPERTY_VALUE);
	expect(style.getPropertyValue('--c')).toBe(EMPTY_CUSTOM_PROPERTY_VALUE);
	// `--d:;` は空白が無く、ブラウザでも構文エラーで捨てられる
	expect(style.getPropertyValue('--d')).toBe('');
});

test('コメントと文字列の中の空の宣言には手を付けない', () => {
	const doc = createStylesheetDocument([
		'/* --a: ; */ .x { content: "--b: ;"; } .y { content: \'--c: ;\'; }',
	]);

	const rules = [...doc.styleSheets[0]!.cssRules] as CSSStyleRule[];
	expect(rules[0]!.style.getPropertyValue('content')).toBe('"--b: ;"');
	expect(rules[1]!.style.getPropertyValue('content')).toBe('"--c: ;"');
});

test('グローバルの document には手を付けない', () => {
	const before = document.head.innerHTML;

	createStylesheetDocument([':root { --a: 1px; }']);

	expect(document.head.innerHTML).toBe(before);
});
