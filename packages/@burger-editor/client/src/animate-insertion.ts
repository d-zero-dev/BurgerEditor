const INSERTION_ANIMATION_DURATION_MS = 400;

/**
 * Expand the block-insertion marker from zero to its natural height.
 *
 * Implemented with `Element.animate()` because its `finished` promise
 * settles regardless of the animation's duration — a CSS transition +
 * `transitionend` never fires when the duration is 0 (e.g. under
 * `prefers-reduced-motion: reduce`), which would leave the engine's
 * processing flag stuck. Cancellation is also treated as completion.
 * @param markerEl - The marker element wrapping the inserted block
 * @example
 * ```ts
 * await animateInsertion(markerEl);
 * // The marker is fully expanded (or the animation was skipped).
 * ```
 */
export async function animateInsertion(markerEl: HTMLElement): Promise<void> {
	markerEl.style.height = 'auto';
	const targetHeight = markerEl.getBoundingClientRect().height;
	markerEl.style.overflow = 'hidden';

	const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	const animation = markerEl.animate(
		[{ height: '0px' }, { height: `${targetHeight}px` }],
		{
			duration: reducedMotion ? 0 : INSERTION_ANIMATION_DURATION_MS,
			easing: 'ease',
		},
	);
	await animation.finished.then(
		() => {},
		() => {},
	);
}
