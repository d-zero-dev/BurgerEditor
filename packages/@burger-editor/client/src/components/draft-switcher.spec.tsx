import { UIStateStore } from '@burger-editor/core';
import { cleanup, screen } from '@testing-library/react';
import { act } from 'react';
import { test, expect, afterEach } from 'vitest';

import { createMockEngine as createBaseMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';

import { DraftSwitcher } from './draft-switcher.js';

afterEach(cleanup);

/**
 * DraftSwitcherの描画に必要な最小のengineモック。uiStateは実物を使う
 * @param type - 現在表示中のエリア種別
 */
function createMockEngine(type: 'main' | 'draft' = 'main') {
	const uiState = new UIStateStore();
	uiState.setActiveArea(type);
	return createBaseMockEngine({
		uiState,
		content: { type },
		commandBus: { receiverId: 'bge-command-bus-test' },
	});
}

test('本稿モードでは本稿ボタンがpressed状態になる', () => {
	const engine = createMockEngine('main');
	renderWithEngine(engine, <DraftSwitcher />);

	expect(
		screen.getByRole('button', { name: /本稿モード/ }).getAttribute('aria-pressed'),
	).toBe('true');
	expect(
		screen.getByRole('button', { name: /下書きモード/ }).getAttribute('aria-pressed'),
	).toBe('false');
});

test('uiState.activeAreaがdraftへ切り替わるとボタンのpressed状態が反転する', () => {
	const engine = createMockEngine('main');
	renderWithEngine(engine, <DraftSwitcher />);

	act(() => {
		engine.uiState.setActiveArea('draft');
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
	renderWithEngine(engine, <DraftSwitcher />);

	expect(screen.queryByText('ソース表示')).toBeNull();

	act(() => {
		engine.uiState.setSourceMode('main', true);
	});

	expect(screen.getByText('ソース表示')).toBeTruthy();
});

test('切替ボタンのcommandforはengine.commandBus.receiverIdを指す（配線漏れの検出）', () => {
	const engine = createMockEngine('main');
	(engine as { commandBus: { receiverId: string } }).commandBus = {
		receiverId: 'bge-command-bus-from-engine',
	};
	renderWithEngine(engine, <DraftSwitcher />);

	expect(
		screen.getByRole('button', { name: /本稿モード/ }).getAttribute('commandfor'),
	).toBe('bge-command-bus-from-engine');
});

test('本稿⇄下書きのコピーボタンは現在のモードに応じて切り替わる', () => {
	const engine = createMockEngine('main');
	renderWithEngine(engine, <DraftSwitcher />);
	expect(screen.getByRole('button', { name: '本稿を下書きにコピー' })).toBeTruthy();

	act(() => {
		engine.uiState.setActiveArea('draft');
	});

	expect(screen.getByRole('button', { name: '下書きを本稿にコピー' })).toBeTruthy();
});
