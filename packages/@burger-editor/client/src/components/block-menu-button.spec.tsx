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

test('interestforとpopover=hintで、ホバーとフォーカスで開きEscで閉じる', async () => {
	const { container } = render(
		<BlockMenuButton
			label="ブロックを削除"
			command="--remove-block"
			commandfor="bge-command-bus-test">
			<span aria-hidden>icon</span>
		</BlockMenuButton>,
	);
	const button = screen.getByRole('button', { name: 'ブロックを削除' });
	const hint = getHint(container);

	expect(button.getAttribute('interestfor')).toBe(hint.id);
	expect(button.getAttribute('aria-labelledby')).toBe(hint.id);
	expect(hint.getAttribute('popover')).toBe('hint');

	await act(async () => {
		await userEvent.hover(button);
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(true);

	await act(async () => {
		await userEvent.keyboard('{Escape}');
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(false);

	await act(async () => {
		button.blur();
		await userEvent.unhover(button);
	});

	act(() => {
		button.focus();
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(true);

	await act(async () => {
		await userEvent.keyboard('{Escape}');
	});
	await expect.poll(() => hint.matches(':popover-open')).toBe(false);
});
