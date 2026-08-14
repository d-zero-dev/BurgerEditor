import { test, expect } from 'vitest';

test('using宣言でDisposableのdisposeがスコープ脱出時に呼ばれる（default project）', () => {
	const calls: string[] = [];
	{
		using _a = { [Symbol.dispose]: () => calls.push('a') };
		using _b = { [Symbol.dispose]: () => calls.push('b') };
		calls.push('body');
	}
	expect(calls).toEqual(['body', 'b', 'a']);
});

test('DisposableStackがネイティブに動作する（downlevelヘルパー非依存）', () => {
	const calls: string[] = [];
	{
		using stack = new DisposableStack();
		stack.defer(() => calls.push('deferred'));
		calls.push('body');
	}
	expect(calls).toEqual(['body', 'deferred']);
});
