import { describe, expect, test } from 'vitest';

import { dataFromHtml } from './data-from-html.js';

describe('dataFromHtml', () => {
	test('リストの中のリストは、外側の項目ごとの配列の配列として読む', () => {
		const html =
			'<div data-bge-list><section><ul data-bge-list><li data-bge="label">a1</li><li data-bge="label">a2</li></ul></section>' +
			'<section><ul data-bge-list><li data-bge="label">b1</li></ul></section></div>';

		expect(dataFromHtml(html)).toStrictEqual({ label: [['a1', 'a2'], ['b1']] });
	});

	// ItemData の型は 2 段までだが、読み取り自体は深さを変えない（型を合わせるだけ）
	test('3 段以上の入れ子も、そのままの深さで返す', () => {
		const html =
			'<div data-bge-list><div><div data-bge-list><div><ul data-bge-list><li data-bge="v">a</li></ul></div></div></div></div>';

		expect(dataFromHtml(html)).toStrictEqual({ v: [[['a']]] });
	});
});
