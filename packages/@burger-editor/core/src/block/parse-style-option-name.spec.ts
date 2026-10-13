import { test, expect } from 'vitest';

import { parseStyleOptionName } from './parse-style-option-name.js';

test.each([
	['--bge-options-gap', { category: 'gap', key: null }],
	['--bge-options-gap--2x', { category: 'gap', key: '2x' }],
	['--bge-options-padding-block--x-large', { category: 'padding-block', key: 'x-large' }],
	['--bge-options-_grid_cols--wide', { category: '_grid_cols', key: 'wide' }],
	['--bge-options-見出し--大', { category: '見出し', key: '大' }],
	['--bge-options-gap---x', { category: 'gap', key: '-x' }],
])('%s を分解する', (property, expected) => {
	expect(parseStyleOptionName(property)).toEqual(expected);
});

test.each([
	['--gap--2x', 'プレフィックスが無い'],
	['--bge-options-', 'カテゴリ名が空'],
	['--bge-options---2x', 'カテゴリ名が空'],
	['--bge-options-gap--', '値名が空'],
	['--bge-options-gap--x--y', '-- が 2 つ以上ある'],
])('%s は分解しない（%s）', (property) => {
	expect(parseStyleOptionName(property)).toBeNull();
});
