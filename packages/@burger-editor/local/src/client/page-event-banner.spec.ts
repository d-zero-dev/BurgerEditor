import { afterEach, describe, expect, test, vi } from 'vitest';

import { pageGoneBannerFor, showPageGoneBanner } from './page-event-banner.js';

/**
 * jsdom does not implement the Invoker Commands API — synthesize the
 * `command` event the browser would dispatch on the button's `commandfor`
 * target when clicked. Mirrors `@burger-editor/client`'s
 * `front-matter-editor.spec.tsx` helper of the same shape.
 * @param button
 */
function invokeCommand(button: HTMLElement): void {
	const targetId = button.getAttribute('commandfor');
	const target = targetId ? document.getElementById(targetId) : null;
	if (!target) {
		throw new Error('commandfor target not found');
	}
	const event = new Event('command');
	Object.assign(event, { command: button.getAttribute('command'), source: button });
	target.dispatchEvent(event);
}

afterEach(() => {
	document.body.innerHTML = '';
	vi.useRealTimers();
});

describe('showPageGoneBanner', () => {
	test('renders a "deleted" message', () => {
		showPageGoneBanner({ kind: 'deleted' });
		expect(document.body.textContent).toContain('deleted elsewhere');
	});

	test('renders a "renamed" message including the destination', () => {
		showPageGoneBanner({ kind: 'renamed', to: '/new-name.html' });
		expect(document.body.textContent).toContain('renamed elsewhere');
		expect(document.body.textContent).toContain('/new-name.html');
	});

	test('replaces an existing banner instead of stacking a second one', () => {
		showPageGoneBanner({ kind: 'deleted' });
		showPageGoneBanner({ kind: 'renamed', to: '/b.html' });
		expect(document.querySelectorAll('#bge-page-event-banner')).toHaveLength(1);
		expect(document.body.textContent).toContain('renamed elsewhere');
	});

	test('the dismiss button removes the banner', () => {
		showPageGoneBanner({ kind: 'deleted' });
		const dismiss = document.querySelector('button')!;
		invokeCommand(dismiss);
		expect(document.getElementById('bge-page-event-banner')).toBeNull();
	});

	test('auto-dismisses after its timeout', () => {
		vi.useFakeTimers();
		showPageGoneBanner({ kind: 'deleted' });
		expect(document.getElementById('bge-page-event-banner')).not.toBeNull();
		vi.advanceTimersByTime(8000);
		expect(document.getElementById('bge-page-event-banner')).toBeNull();
	});
});

describe('pageGoneBannerFor', () => {
	test('returns null for a "created" event regardless of currentPage', () => {
		const result = pageGoneBannerFor(
			{ type: 'page-event', kind: 'created', to: '/a.html' },
			'/a.html',
			'index.html',
		);
		expect(result).toBeNull();
	});

	test('returns null for a "deleted" event on a different page', () => {
		const result = pageGoneBannerFor(
			{ type: 'page-event', kind: 'deleted', from: '/other.html' },
			'/a.html',
			'index.html',
		);
		expect(result).toBeNull();
	});

	test('returns the banner args for a "deleted" event matching the currently open page', () => {
		const result = pageGoneBannerFor(
			{ type: 'page-event', kind: 'deleted', from: '/a.html' },
			'/a.html',
			'index.html',
		);
		expect(result).toEqual({ kind: 'deleted', to: undefined });
	});

	test('returns the banner args (with `to`) for a "renamed" event matching the currently open page', () => {
		const result = pageGoneBannerFor(
			{ type: 'page-event', kind: 'renamed', from: '/a.html', to: '/b.html' },
			'/a.html',
			'index.html',
		);
		expect(result).toEqual({ kind: 'renamed', to: '/b.html' });
	});

	test('normalizes `from` against indexFileName before comparing (root page vs "/index.html")', () => {
		const result = pageGoneBannerFor(
			{ type: 'page-event', kind: 'deleted', from: '/index.html' },
			'/index.html',
			'index.html',
		);
		expect(result).toEqual({ kind: 'deleted', to: undefined });
	});

	test('returns null when the event carries no `from` at all', () => {
		const result = pageGoneBannerFor(
			{ type: 'page-event', kind: 'deleted' },
			'/a.html',
			'index.html',
		);
		expect(result).toBeNull();
	});
});
