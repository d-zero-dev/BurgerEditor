import { test, expect } from 'vitest';

test('using宣言でDisposableのdisposeがスコープ脱出時に呼ばれる（core project / chromium）', () => {
	const calls: string[] = [];
	{
		using _a = { [Symbol.dispose]: () => calls.push('a') };
		using _b = { [Symbol.dispose]: () => calls.push('b') };
		calls.push('body');
	}
	expect(calls).toEqual(['body', 'b', 'a']);
});

test('AsyncDisposableStackがネイティブに動作する', async () => {
	const calls: string[] = [];
	{
		await using stack = new AsyncDisposableStack();
		stack.defer(() => {
			calls.push('deferred');
		});
		calls.push('body');
	}
	expect(calls).toEqual(['body', 'deferred']);
});
