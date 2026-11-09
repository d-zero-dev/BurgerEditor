// cspell:words unhover
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { test, expect, afterEach, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';

import { BlockMenuButton } from './block-menu-button.js';

afterEach(cleanup);

beforeAll(() => {
	if (!('interestForElement' in HTMLButtonElement.prototype)) {
		throw new Error('interestfor is not supported in this Chromium build');
	}
});

/**
 * @param container
 */
function getHint(container: HTMLElement): HTMLElement {
	const hint = container.querySelector('[popover="hint"]');
	if (!hint || !(hint instanceof HTMLElement)) {
		throw new Error('hint popover element not found');
	}
	return hint;
}

/**
 *
 */
function renderBlockMenuButton() {
	return render(
		<BlockMenuButton
			label="ブロックを削除"
			command="--remove-block"
			commandfor="bge-command-bus-test">
			<span aria-hidden>icon</span>
		</BlockMenuButton>,
	);
}

test('初期状態ではhintが閉じている', () => {
	const { container } = renderBlockMenuButton();
	const hint = getHint(container);
	expect(hint.matches(':popover-open')).toBe(false);
});

test('interestforとpopover=hintでボタンとhintが結ばれる', () => {
	const { container } = renderBlockMenuButton();
	const button = screen.getByRole('button', { name: 'ブロックを削除' });
	const hint = getHint(container);

	expect(button.getAttribute('interestfor')).toBe(hint.id);
	expect(button.getAttribute('aria-labelledby')).toBe(hint.id);
	expect(hint.getAttribute('popover')).toBe('hint');
});

test('ホバーでhintが開き、Escで閉じたあともポインタを動かさず閉じたまま', async () => {
	const { container } = renderBlockMenuButton();
	const button = screen.getByRole('button', { name: 'ブロックを削除' });
	const hint = getHint(container);

	await act(async () => {
		await userEvent.hover(button);
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(true);
	expect(hint).toHaveTextContent('ブロックを削除');

	await act(async () => {
		await userEvent.keyboard('{Escape}');
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(false);
	await expect
		.poll(() => hint.matches(':popover-open'), { timeout: 500, interval: 50 })
		.toBe(false);
});

test('フォーカスでhintが開き、Escで閉じてもフォーカスはボタンに残る', async () => {
	const { container } = renderBlockMenuButton();
	const button = screen.getByRole('button', { name: 'ブロックを削除' });
	const hint = getHint(container);

	act(() => {
		button.focus();
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(true);

	await act(async () => {
		await userEvent.keyboard('{Escape}');
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(false);
	expect(document.activeElement).toBe(button);
});
