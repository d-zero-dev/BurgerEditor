import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { highlightElement } from './highlight.js';

let el: HTMLElement;
let originalMatchMedia: typeof matchMedia | undefined;

beforeEach(() => {
	document.body.innerHTML = '';
	el = document.createElement('div');
	document.body.append(el);
	originalMatchMedia = globalThis.matchMedia;
});

afterEach(() => {
	if (originalMatchMedia) {
		globalThis.matchMedia = originalMatchMedia;
	}
	vi.useRealTimers();
});

/**
 * @param matches
 */
function stubReducedMotion(matches: boolean): void {
	globalThis.matchMedia = ((query: string) => ({
		matches,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
		onchange: null,
	})) as unknown as typeof matchMedia;
}

describe('highlightElement', () => {
	test('sets data-bge-highlight and removes it once animationend fires', async () => {
		stubReducedMotion(false);
		const promise = highlightElement(el, { scroll: false });
		// The attribute is set synchronously before the scroll/blink await chain
		// resolves — poll via microtask so it's observable without a real animation.
		await Promise.resolve();
		expect(Object.hasOwn(el.dataset, 'bgeHighlight')).toBe(true);
		el.dispatchEvent(new Event('animationend'));
		await promise;
		expect(Object.hasOwn(el.dataset, 'bgeHighlight')).toBe(false);
	});

	test('resolves immediately without touching the attribute when prefers-reduced-motion is set', async () => {
		stubReducedMotion(true);
		await highlightElement(el);
		expect(Object.hasOwn(el.dataset, 'bgeHighlight')).toBe(false);
	});

	test('resolves via its fallback timer if animationend never fires', async () => {
		stubReducedMotion(false);
		vi.useFakeTimers();
		const promise = highlightElement(el, { scroll: false });
		await vi.advanceTimersByTimeAsync(2000);
		await promise;
		expect(Object.hasOwn(el.dataset, 'bgeHighlight')).toBe(false);
	});

	test('resolves via its fallback timer if scrollend never fires', async () => {
		stubReducedMotion(false);
		vi.useFakeTimers();
		const scrollIntoViewSpy = vi.spyOn(el, 'scrollIntoView').mockImplementation(() => {});
		const promise = highlightElement(el, { blink: false });
		await vi.advanceTimersByTimeAsync(400);
		await promise;
		expect(scrollIntoViewSpy).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
	});

	test('blink: false skips the attribute entirely', async () => {
		stubReducedMotion(false);
		await highlightElement(el, { scroll: false, blink: false });
		expect(Object.hasOwn(el.dataset, 'bgeHighlight')).toBe(false);
	});

	test('scroll: false never calls scrollIntoView', async () => {
		stubReducedMotion(false);
		const scrollIntoViewSpy = vi.spyOn(el, 'scrollIntoView').mockImplementation(() => {});
		await highlightElement(el, { scroll: false, blink: false });
		expect(scrollIntoViewSpy).not.toHaveBeenCalled();
	});
});
