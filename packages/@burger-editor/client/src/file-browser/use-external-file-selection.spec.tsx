import type { SelectedFile } from './store.js';

import { render, cleanup } from '@testing-library/react';
import { test, expect, afterEach } from 'vitest';

import { useExternalFileSelection } from './use-external-file-selection.js';

afterEach(cleanup);

/**
 * @param root0
 * @param root0.tag
 * @param root0.selected
 * @param root0.onCall
 */
function Harness({
	tag,
	selected,
	onCall,
}: {
	readonly tag: string;
	readonly selected: SelectedFile | undefined;
	readonly onCall: (tag: string) => void;
}) {
	// getCurrentPath/onExternalChangeはあえて毎レンダー新しいクロージャにする
	// （tagを固定longcaptureしていないか — stale closureのリグレッションを
	// 検知するため）
	useExternalFileSelection(
		selected,
		() => tag,
		() => onCall(tag),
	);
	return null;
}

test('selectedが変わるより前に他のpropsが更新されていても、最新のgetCurrentPath/onExternalChangeが呼ばれる', () => {
	const calls: string[] = [];
	const onCall = (tag: string) => calls.push(tag);

	const { rerender } = render(
		<Harness tag="first" selected={undefined} onCall={onCall} />,
	);

	// selectedを変えないまま、propsだけを更新する（effectの依存配列は
	// [selected]のみなので、この時点ではeffect自体は再実行されない）
	rerender(<Harness tag="second" selected={undefined} onCall={onCall} />);

	// selectedを変えると、この時点（tag="second"）のgetCurrentPath/
	// onExternalChangeが使われるべき
	rerender(
		<Harness tag="second" selected={{ path: '/a', fileSize: 1 }} onCall={onCall} />,
	);

	expect(calls).toEqual(['second']);
});

test('マウント直後の初回発火はスキップされる（別itemの残留選択を読み込まない）', () => {
	const calls: string[] = [];
	const onCall = (tag: string) => calls.push(tag);

	render(
		<Harness
			tag="mounted"
			selected={{ path: '/residual', fileSize: 1 }}
			onCall={onCall}
		/>,
	);

	expect(calls).toEqual([]);
});

test('selectedのpathが自分自身のgetCurrentPath()と一致する場合は呼ばれない', () => {
	const calls: string[] = [];
	const onCall = (tag: string) => calls.push(tag);

	const { rerender } = render(
		<Harness tag="/same" selected={undefined} onCall={onCall} />,
	);
	rerender(
		<Harness tag="/same" selected={{ path: '/same', fileSize: 1 }} onCall={onCall} />,
	);

	expect(calls).toEqual([]);
});
