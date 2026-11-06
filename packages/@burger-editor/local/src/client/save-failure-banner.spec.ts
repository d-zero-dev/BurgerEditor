import { afterEach, describe, expect, test, vi } from 'vitest';

import { clearSaveFailureBanner, showSaveFailureBanner } from './save-failure-banner.js';

afterEach(() => {
	document.body.innerHTML = '';
	vi.useRealTimers();
});

/**
 * Dispatch the Invoker Commands `command` event a button would send to the banner
 * @param button
 */
function invoke(button: Element | null | undefined) {
	const banner = document.querySelector('[role="alert"]');
	const event = new Event('command') as Event & { command: string };
	event.command = button?.getAttribute('command') ?? '';
	banner?.dispatchEvent(event);
}

/**
 * @param label
 */
function button(label: string) {
	return [...document.querySelectorAll('button')].find((b) => b.textContent === label);
}

describe('showSaveFailureBanner', () => {
	test.each([
		[
			'conflict',
			'このページは別の場所（別のタブ、エージェント、外部のエディター）で更新されています。この画面の変更は保存されていません。',
		],
		[
			'not-found',
			'このページは移動または削除されています。この画面の変更は保存されていません。',
		],
		[
			'path-taken',
			'このパスは別のページが使っています。この画面の変更は保存されていません。',
		],
		['failed', '保存できませんでした。この画面の変更は保存されていません。'],
	] as const)('tells why the content was not saved (%s)', (reason, message) => {
		showSaveFailureBanner(reason, () => {});

		expect(document.querySelector('[role="alert"]')?.textContent).toContain(message);
	});

	test('stays until it is dismissed (it does not disappear on its own)', () => {
		vi.useFakeTimers();
		showSaveFailureBanner('failed', () => {});

		vi.advanceTimersByTime(60_000);

		expect(document.querySelector('[role="alert"]')).not.toBeNull();
	});

	test('a conflict offers a reload, which reloads the page', () => {
		const reload = vi.fn();
		showSaveFailureBanner('conflict', reload);

		const reloadButton = button('再読み込み');
		invoke(reloadButton);

		expect(reloadButton?.getAttribute('commandfor')).toBe(
			document.querySelector('[role="alert"]')?.id,
		);
		expect(reload).toHaveBeenCalledOnce();
	});

	test.each(['not-found', 'path-taken', 'failed'] as const)(
		'%s offers no reload (reopening the same path would not help)',
		(reason) => {
			showSaveFailureBanner(reason, () => {});

			expect(button('再読み込み')).toBeUndefined();
		},
	);

	test('the dismiss button removes it', () => {
		showSaveFailureBanner('failed', () => {});

		invoke(document.querySelector('button[aria-label="閉じる"]'));

		expect(document.querySelector('[role="alert"]')).toBeNull();
	});

	test('a second failure replaces the notice instead of adding another', () => {
		showSaveFailureBanner('failed', () => {});
		showSaveFailureBanner('conflict', () => {});

		const banners = document.querySelectorAll('[role="alert"]');
		expect(banners).toHaveLength(1);
		expect(banners[0]?.textContent).toContain('別の場所');
	});
});

describe('clearSaveFailureBanner', () => {
	test('removes the notice (a later save succeeded)', () => {
		showSaveFailureBanner('failed', () => {});

		clearSaveFailureBanner();

		expect(document.querySelector('[role="alert"]')).toBeNull();
	});
});
