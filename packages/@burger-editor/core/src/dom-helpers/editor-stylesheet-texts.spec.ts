import { test, expect } from 'vitest';

import { editorStylesheetTexts } from './editor-stylesheet-texts.js';

test('レイヤー順の宣言・base 層・各スタイルシートの順に並べる', () => {
	expect(
		editorStylesheetTexts(
			{ a: { style: '.a{}' }, b: { style: '' }, c: { style: '.c{}' } },
			'.general{}',
			[
				{ css: '.project{}' },
				{ css: '.ui{}', layer: 'bge-ui' },
				{ css: '.unlayered{}', layer: '' },
			],
		),
	).toEqual([
		'@layer bge-component-bases, bge-components, bge-ui;',
		'@layer bge-component-bases {.a{}\n.c{}\n.general{}}',
		'@layer bge-components {.project{}}',
		'@layer bge-ui {.ui{}}',
		'.unlayered{}',
	]);
});
