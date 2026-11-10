import { describe, expect, test } from 'vitest';

import { valueFilter } from './value-filter.js';

describe('valueFilter', () => {
	test.each([
		['<p data-bge="a" title="t">x</p>', '<p title="t">x</p>'],
		['<p title="t" data-bgb-x="1">x</p>', '<p title="t">x</p>'],
		['<p data-bgt="2" title="t">x</p>', '<p title="t">x</p>'],
		// 隣り合う属性の 2 つ目以降も取り除く
		['<p data-bge="a" data-bgb-x="1" title="t">x</p>', '<p title="t">x</p>'],
		['<p data-bge="a" data-bgb="1" data-bgt="2" title="t">x</p>', '<p title="t">x</p>'],
	])(
		'HTML の data-bge* / data-bgb* / data-bgt* 属性を取り除く: %s',
		(input, expected) => {
			expect(valueFilter(input)).toBe(expected);
		},
	);

	test('HTML でない文字列と文字列でない値はそのまま返す', () => {
		expect(valueFilter('text')).toBe('text');
		expect(valueFilter(5)).toBe(5);
		expect(valueFilter(null)).toBeNull();
	});

	// サニタイザーに届く前に呼ばれるので、解釈の途中でスクリプトを実行してはならない。
	// 本物の文書で解釈すると、img が読み込みに失敗した時点で onerror が走る
	test('解釈の途中でイベントハンドラを実行しない', async () => {
		const fired: number[] = [];
		(globalThis as { __valueFilterFired?: number[] }).__valueFilterFired = fired;
		try {
			valueFilter('<img src="x" onerror="globalThis.__valueFilterFired.push(1)">');
			await new Promise((resolve) => setTimeout(resolve, 300));
			expect(fired).toStrictEqual([]);
		} finally {
			delete (globalThis as { __valueFilterFired?: number[] }).__valueFilterFired;
		}
	});
});
