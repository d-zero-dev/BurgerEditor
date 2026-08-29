/**
 * Which parts of `highlightElement`'s attention cue to run. Both default to
 * `true`; a caller that has already scrolled (or that highlights many blocks
 * in a row and only wants one scroll) opts out per part rather than
 * re-implementing the blink.
 * @example
 * ```ts
 * await highlightElement(el, { scroll: false }); // blink in place
 * ```
 */
export interface HighlightOptions {
	readonly scroll?: boolean;
	readonly blink?: boolean;
}

// Both are safety nets for environments/timings where the "real" completion
// signal (`scrollend`, `animationend`) never fires — without them a caller
// awaiting highlight() could hang indefinitely instead of degrading to "no
// visible highlight, but the promise still resolves".
const SCROLL_FALLBACK_MS = 400;
const BLINK_FALLBACK_MS = 2000;

/**
 * Scroll a block into view and blink it, resolving once both finish (or
 * their fallback timers do). Used by the disk/browser mutation path to show
 * an agent-driven edit's target before applying it — see `BurgerBlock.highlight()`.
 * Only toggles the `data-bge-highlight` attribute; the blink itself is a CSS
 * animation owned by the UI layer (`client`'s injected stylesheet), not core,
 * since core has no opinion on how a highlight should look.
 * @param el
 * @param options
 */
export async function highlightElement(
	el: HTMLElement,
	options: HighlightOptions = {},
): Promise<void> {
	const { scroll = true, blink = true } = options;
	// A user who asked their OS for reduced motion gets neither the scroll
	// nor the blink — showing "reduced" motion instead of "none" would still
	// be the thing they opted out of.
	if (prefersReducedMotion()) {
		return;
	}
	if (scroll) {
		el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		await waitForScrollEnd();
	}
	if (blink) {
		await blinkOnce(el);
	}
}

/**
 * Whether the viewer asked their OS for reduced motion.
 */
function prefersReducedMotion(): boolean {
	return (
		typeof matchMedia === 'function' &&
		matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/**
 * `scrollend` fires on whichever element actually scrolled, not necessarily
 * `el` itself — listening on `window` catches it via bubbling in browsers
 * that support the event at all. Browsers that don't (or a scroll that was
 * already at rest, so nothing fires) fall back to `SCROLL_FALLBACK_MS`.
 */
function waitForScrollEnd(): Promise<void> {
	return new Promise((resolve) => {
		const timeoutId = setTimeout(resolve, SCROLL_FALLBACK_MS);
		if (typeof window !== 'undefined' && 'onscrollend' in window) {
			window.addEventListener(
				'scrollend',
				() => {
					clearTimeout(timeoutId);
					resolve();
				},
				{ once: true },
			);
		}
	});
}

/**
 * @param el
 */
function blinkOnce(el: HTMLElement): Promise<void> {
	return new Promise((resolve) => {
		const timeoutId = setTimeout(finish, BLINK_FALLBACK_MS);
		/**
		 *
		 */
		function finish() {
			clearTimeout(timeoutId);
			delete el.dataset.bgeHighlight;
			el.removeEventListener('animationend', finish);
			resolve();
		}
		el.addEventListener('animationend', finish, { once: true });
		el.dataset.bgeHighlight = '';
	});
}
