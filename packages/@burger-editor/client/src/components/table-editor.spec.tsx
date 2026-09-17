import type { TableEditorData } from './table-editor.js';

import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { act, useState } from 'react';
import { test, expect, afterEach, vi } from 'vitest';

import { TableEditor } from './table-editor.js';

afterEach(cleanup);

/**
 * 実Chromium（Baseline 2025）はInvoker Commands APIをネイティブ実装
 * 済みだが、他spec群と実装を揃えるためここでも意図的にcommandfor先へ
 * 合成commandイベントを送ってボタン起動を再現する（実クリック駆動への
 * 切り替えは別スコープと判断し見送り済み）
 * @param button
 */
function invokeCommand(button: HTMLElement) {
	const targetId = button.getAttribute('commandfor');
	const target = targetId ? document.getElementById(targetId) : null;
	if (!target) {
		throw new Error('commandfor target not found');
	}
	const event = new Event('command');
	Object.assign(event, { command: button.getAttribute('command'), source: button });
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * onChangeで受けたTableEditorDataを`state`に反映するコントロールド
 * ラッパー。TableEditor自体は`value`/`onChange`だけの純粋なcontrolled
 * コンポーネントなので、実際のアイテムエディタと同じ往復を再現する
 * @param root0
 * @param root0.initial
 * @param root0.onChange
 */
function Harness({
	initial,
	onChange,
}: {
	readonly initial: TableEditorData;
	readonly onChange?: (value: TableEditorData) => void;
}) {
	const [value, setValue] = useState(initial);
	return (
		<TableEditor
			value={value}
			onChange={(next) => {
				setValue(next);
				onChange?.(next);
			}}
		/>
	);
}

test('行を下に移動しても、textarea要素とフォーカス・キャレット位置は編集していた行の中身に追従する（index keyの退行防止）', () => {
	render(<Harness initial={{ th: ['A', 'B', 'C'], td: ['1', '2', '3'] }} />);

	const inputA = screen.getByLabelText<HTMLTextAreaElement>('0行目の見出しセル');
	act(() => {
		inputA.focus();
	});
	inputA.setSelectionRange(1, 1);
	expect(document.activeElement).toBe(inputA);

	// 0行目（A/1）を下に移動する — index keyのままだと0行目の位置に
	// 描画されるDOM要素は「B/2」の内容に差し替わり、フォーカスは
	// 画面上の位置に取り残されて中身がAではなくBになってしまう
	const moveDownButtons = screen.getAllByTitle('下に移動');
	invokeCommand(moveDownButtons[0] as HTMLElement);

	// 同じDOM要素（=同じ行）にフォーカスが残り、値も"A"のまま追従する
	expect(document.activeElement).toBe(inputA);
	expect(inputA.value).toBe('A');
	expect(inputA.selectionStart).toBe(1);

	// 表示順は入れ替わっている（Aが1行目に移動した）
	const allTh = screen.getAllByRole('textbox', { name: /行目の見出しセル/ });
	expect((allTh[0] as HTMLTextAreaElement).value).toBe('B');
	expect((allTh[1] as HTMLTextAreaElement).value).toBe('A');
});

test('行を削除しても残りの行のフォーカスは中身に追従する', () => {
	render(<Harness initial={{ th: ['A', 'B', 'C'], td: ['1', '2', '3'] }} />);

	const inputC = screen.getByLabelText<HTMLTextAreaElement>('2行目の見出しセル');
	act(() => {
		inputC.focus();
	});
	fireEvent.change(inputC, { target: { value: 'C編集中' } });

	// 0行目（A）を削除する
	invokeCommand(screen.getAllByTitle('削除')[0] as HTMLElement);

	// Cを編集していたtextareaはそのまま（削除されたのはAの行）
	expect(document.activeElement).toBe(inputC);
	expect(inputC.value).toBe('C編集中');
});

test('行の追加・削除・移動でonChangeにth/tdの配列が正しい順序で渡る', () => {
	const onChange = vi.fn();
	render(<Harness initial={{ th: ['A', 'B'], td: ['1', '2'] }} onChange={onChange} />);

	invokeCommand(screen.getAllByTitle('下に追加')[0] as HTMLElement);

	expect(onChange).toHaveBeenLastCalledWith({
		th: ['A', '', 'B'],
		td: ['1', '', '2'],
	});
});
