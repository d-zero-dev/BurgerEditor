import { test, expect } from 'vitest';

test('using宣言でDisposableのdisposeがスコープ脱出時に呼ばれる（client project / jsdom）', () => {
	const calls: string[] = [];
	{
		using _a = { [Symbol.dispose]: () => calls.push('a') };
		using _b = { [Symbol.dispose]: () => calls.push('b') };
		calls.push('body');
	}
	expect(calls).toEqual(['body', 'b', 'a']);
});
