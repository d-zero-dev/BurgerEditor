import { test, expect, describe } from 'vitest';

import { getValues } from './get-values.js';

describe('getValues', () => {
	test('basic', () => {
		const el = document.createElement('div');
		el.dataset.field = 'foo:data-foo';
		el.dataset.foo = 'bar';
		expect(getValues(el)).toStrictEqual([['foo', 'bar', false]]);
	});

	test('shorthand', () => {
		const el = document.createElement('div');
		el.dataset.field = ':foo';
		el.dataset.fieldFoo = 'bar';
		expect(getValues(el)).toStrictEqual([['foo', 'bar', false]]);
	});

	test('URL', () => {
		const el = document.createElement('img');
		el.dataset.field = 'foo:src';
		el.setAttribute('src', 'path/to/file.png');
		expect(getValues(el)).toStrictEqual([['foo', 'path/to/file.png', false]]);
		expect(el.src).toBe('https://www.d-zero.co.jp/path/to/file.png');
	});

	describe('<source> の未設定の属性', () => {
		test('属性が無ければ、プロパティの既定値（空文字・0）ではなく null を返す', () => {
			const el = document.createElement('source');
			el.dataset.field = 'a:srcset, b:media, c:width, d:height';

			expect(getValues(el)).toStrictEqual([
				['a', null, false],
				['b', null, false],
				['c', null, false],
				['d', null, false],
			]);
		});

		test('属性があればその値を返す', () => {
			const el = document.createElement('source');
			el.dataset.field = 'a:srcset, b:media';
			el.setAttribute('srcset', '/sp.png');
			el.setAttribute('media', '(max-width: 767px)');

			expect(getValues(el)).toStrictEqual([
				['a', '/sp.png', false],
				['b', '(max-width: 767px)', false],
			]);
		});

		test('空文字の属性は空文字のまま返す（無いことと区別する）', () => {
			const el = document.createElement('source');
			el.dataset.field = 'a:media';
			el.setAttribute('media', '');

			expect(getValues(el)).toStrictEqual([['a', '', false]]);
		});

		test('sizes も、属性が無ければ null を返す', () => {
			const el = document.createElement('source');
			el.dataset.field = 'a:sizes';

			expect(getValues(el)).toStrictEqual([['a', null, false]]);
		});

		test('width / height が属性にあれば、その値を返す', () => {
			const el = document.createElement('source');
			el.dataset.field = 'a:width, b:height';
			el.setAttribute('width', '300');
			el.setAttribute('height', '200');

			const values = getValues(el);
			expect(values.map(([name, value]) => [name, String(value)])).toStrictEqual([
				['a', '300'],
				['b', '200'],
			]);
		});

		test('<source> 以外の要素の未設定の属性は、プロパティの値を返す', () => {
			const el = document.createElement('img');
			el.dataset.field = 'a:alt';

			expect(getValues(el)).toStrictEqual([['a', '', false]]);
		});
	});

	describe('style(--custom-property)', () => {
		test('型の変換を指定すると、カスタムプロパティの値は属性と同じく変換する', () => {
			const el = document.createElement('div');
			el.dataset.field = 'n:style(--per-view)';
			el.setAttribute('style', '--per-view: 3');

			expect(getValues(el, true)).toStrictEqual([['n', 3, false]]);
		});

		test('型の変換を指定しなければ、カスタムプロパティの値は文字列のまま', () => {
			const el = document.createElement('div');
			el.dataset.field = 'n:style(--per-view)';
			el.setAttribute('style', '--per-view: 3');

			expect(getValues(el)).toStrictEqual([['n', '3', false]]);
		});

		test('カスタムプロパティの URL は、型の変換を指定しても書き換えない', () => {
			const el = document.createElement('div');
			el.dataset.field = 'u:style(--link)';
			el.setAttribute('style', `--link: ${location.origin}/path/to/page`);

			expect(getValues(el, true)).toStrictEqual([
				['u', `${location.origin}/path/to/page`, false],
			]);
		});

		test('通常のプロパティの値は、型の変換を指定しても変換しない', () => {
			const el = document.createElement('div');
			el.dataset.field = 'n:style(z-index)';
			el.setAttribute('style', 'z-index: 3');

			expect(getValues(el, true)).toStrictEqual([['n', '3', false]]);
		});
	});
});
