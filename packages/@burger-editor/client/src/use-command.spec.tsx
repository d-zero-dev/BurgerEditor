import type { BurgerCommandEvent } from '@burger-editor/core';

import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { act, useState } from 'react';
import { test, expect, afterEach } from 'vitest';

import { useCommand } from './use-command.js';

afterEach(cleanup);

/**
 * `commandfor`先へ合成commandイベントを送ってボタン起動を再現する。
 * ハンドラがReact stateを更新しうるため、実イベントとして`act()`で包む
 * @param target
 * @param command
 */
function dispatchCommand(target: Element, command: string) {
	const event = new Event('command') as BurgerCommandEvent;
	Object.assign(event, { command, source: null });
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * マウント直後は要素を出さず、`show`を`true`にした後の再レンダーで
 * 初めて`rootRef`付きの要素を条件付きレンダーする harness。
 * `useCommand`が返すのが`RefObject`ではなくref callbackであることの
 * 存在理由（後からマウントされた要素にも配線できること）を直接検証する
 * @param root0
 * @param root0.onPing
 */
function LateMount({ onPing }: { readonly onPing: () => void }) {
	const [show, setShow] = useState(false);
	const rootRef = useCommand<HTMLDivElement>({ '--ping': onPing });

	return (
		<div>
			{/* type無しボタンはmarkuplintのcommand必須ルールの対象外 —
			Invoker Commandsの検証対象ではない、テスト専用のトリガー
			ボタンのため */}
			<button onClick={() => setShow(true)}>show</button>
			{show ? (
				<div ref={rootRef} data-testid="late-root">
					late
				</div>
			) : null}
		</div>
	);
}

test('マウント後に条件付きレンダーで現れた要素にもcommandが配線される', () => {
	const onPing = () => {
		calls.push(true);
	};
	const calls: boolean[] = [];

	render(<LateMount onPing={onPing} />);

	expect(screen.queryByTestId('late-root')).toBeNull();

	fireEvent.click(screen.getByText('show'));
	const root = screen.getByTestId('late-root');

	dispatchCommand(root, '--ping');

	expect(calls).toEqual([true]);
});

/**
 * 毎レンダー新しい`handlers`オブジェクト（インラインの矢印関数）を渡す
 * harness。`useEffectEvent`で読むことで、DOMリスナーの再アタッチなしに
 * ハンドラが常に最新レンダーの`count`をクロージャで読めることを検証する
 */
function FreshHandlersEachRender() {
	const [count, setCount] = useState(0);
	const [observed, setObserved] = useState<readonly number[]>([]);
	const rootRef = useCommand<HTMLDivElement>({
		'--record': () => {
			setObserved((prev) => [...prev, count]);
		},
	});

	return (
		<div>
			{/* type無しボタンはmarkuplintのcommand必須ルールの対象外 —
			Invoker Commandsの検証対象ではない、テスト専用のトリガー
			ボタンのため */}
			<button onClick={() => setCount((c) => c + 1)}>increment</button>
			<div ref={rootRef} data-testid="root">
				{observed.join(',')}
			</div>
		</div>
	);
}

test('handlersが毎レンダー新しいオブジェクトでも最新レンダーのクロージャで呼ばれる', () => {
	render(<FreshHandlersEachRender />);
	const root = screen.getByTestId('root');

	dispatchCommand(root, '--record');
	fireEvent.click(screen.getByText('increment'));
	fireEvent.click(screen.getByText('increment'));
	dispatchCommand(root, '--record');

	// 1回目は count=0、DOMリスナーの再アタッチなしに2回のincrement後は
	// count=2の状態を読めている（再アタッチが起きていれば購読が途切れて
	// 2回目のdispatchが届かない可能性がある）
	expect(screen.getByTestId('root').textContent).toBe('0,2');
});
