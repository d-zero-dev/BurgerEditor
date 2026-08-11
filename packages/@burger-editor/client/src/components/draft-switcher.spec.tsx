import type { BurgerEditorEngine } from '@burger-editor/core';

import { UIStateStore } from '@burger-editor/core';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { test, expect, afterEach } from 'vitest';

import { DraftSwitcher } from './draft-switcher.js';

afterEach(cleanup);

/**
 * DraftSwitcherの描画に必要な最小のengineモック。uiStateは実物を使う
 * @param type - 現在表示中のエリア種別
 */
function createMockEngine(type: 'main' | 'draft' = 'main') {
	const el = document.createElement('div');
	const uiState = new UIStateStore();
	return {
		el,
		uiState,
		content: { type },
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any as BurgerEditorEngine;
}

test('本稿モードでは本稿ボタンがpressed状態になる', () => {
	const engine = createMockEngine('main');
	render(<DraftSwitcher engine={engine} />);

	expect(
		screen.getByRole('button', { name: /本稿モード/ }).getAttribute('aria-pressed'),
	).toBe('true');
	expect(
		screen.getByRole('button', { name: /下書きモード/ }).getAttribute('aria-pressed'),
	).toBe('false');
});

test('bge:switch-contentでdraftへ切り替わるとボタンのpressed状態が反転する', () => {
	const engine = createMockEngine('main');
	render(<DraftSwitcher engine={engine} />);

	act(() => {
		(engine.content as { type: string }).type = 'draft';
		engine.el.dispatchEvent(
			new CustomEvent('bge:switch-content', { detail: { content: 'draft' } }),
		);
	});

	expect(
		screen.getByRole('button', { name: /本稿モード/ }).getAttribute('aria-pressed'),
	).toBe('false');
	expect(
		screen.getByRole('button', { name: /下書きモード/ }).getAttribute('aria-pressed'),
	).toBe('true');
});

test('uiState.sourceModeが自エリアのソース表示中はソース表示ラベルが出る', () => {
	const engine = createMockEngine('main');
	render(<DraftSwitcher engine={engine} />);

	expect(screen.queryByText('ソース表示')).toBeNull();

	act(() => {
		engine.uiState.setSourceMode('main', true);
	});

	expect(screen.getByText('ソース表示')).toBeTruthy();
});

test('本稿⇄下書きのコピーボタンは現在のモードに応じて切り替わる', () => {
	const engine = createMockEngine('main');
	const { rerender } = render(<DraftSwitcher engine={engine} />);
	expect(screen.getByRole('button', { name: '本稿を下書きにコピー' })).toBeTruthy();

	act(() => {
		(engine.content as { type: string }).type = 'draft';
		engine.el.dispatchEvent(
			new CustomEvent('bge:switch-content', { detail: { content: 'draft' } }),
		);
	});
	rerender(<DraftSwitcher engine={engine} />);

	expect(screen.getByRole('button', { name: '下書きを本稿にコピー' })).toBeTruthy();
});
