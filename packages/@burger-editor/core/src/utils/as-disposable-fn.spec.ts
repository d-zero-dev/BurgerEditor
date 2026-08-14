import { test, expect } from 'vitest';

import { asDisposableFn } from './as-disposable-fn.js';

test('戻り値は元の関数と同一の参照である', () => {
	const fn = () => {};

	expect(asDisposableFn(fn)).toBe(fn);
});

test('[Symbol.dispose]()を呼ぶと元の関数が実行される', () => {
	let calls = 0;
	const disposable = asDisposableFn(() => {
		calls++;
	});

	disposable[Symbol.dispose]();

	expect(calls).toBe(1);
});

test('直接呼び出しても[Symbol.dispose]経由でも同じ副作用が起きる', () => {
	let calls = 0;
	const disposable = asDisposableFn(() => {
		calls++;
	});

	disposable();
	disposable[Symbol.dispose]();

	expect(calls).toBe(2);
});

test('using宣言のスコープを抜けると自動的に実行される', () => {
	let calls = 0;
	{
		using _disposable = asDisposableFn(() => {
			calls++;
		});
		expect(calls).toBe(0);
	}

	expect(calls).toBe(1);
});
