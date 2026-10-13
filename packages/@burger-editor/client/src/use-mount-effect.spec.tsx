import { render, cleanup } from '@testing-library/react';
import { test, expect, afterEach } from 'vitest';

import { useMountEffect } from './use-mount-effect.js';

afterEach(cleanup);

/**
 * @param root0
 * @param root0.value
 * @param root0.onMount
 */
function Harness({
	value,
	onMount,
}: {
	readonly value: number;
	readonly onMount: (value: number) => void;
}) {
	// あえて毎レンダー新しいクロージャを渡す — useMountEffectがマウント時
	// 以外にも呼んでしまう、またはマウント時の古いvalueを固定してしまう
	// 実装（例: useEffect(fn, [fn])）に戻った場合にテストが落ちるように
	useMountEffect(() => onMount(value));
	return null;
}

test('propsが変わって再レンダーされても、マウント時に1回だけ呼ばれる', () => {
	const calls: number[] = [];
	const { rerender } = render(<Harness value={1} onMount={(v) => calls.push(v)} />);

	rerender(<Harness value={2} onMount={(v) => calls.push(v)} />);
	rerender(<Harness value={3} onMount={(v) => calls.push(v)} />);

	expect(calls).toEqual([1]);
});

test('別のコンポーネントインスタンスをマウントすると、それぞれ独立して1回ずつ呼ばれる', () => {
	const calls: number[] = [];
	const { unmount } = render(<Harness value={1} onMount={(v) => calls.push(v)} />);
	unmount();

	render(<Harness value={2} onMount={(v) => calls.push(v)} />);

	expect(calls).toEqual([1, 2]);
});
