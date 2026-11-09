let nextViewTransitionId = 0;

/**
 * Swap two adjacent sibling blocks with a View Transition, then wait until it
 * finishes so `beginProcessing()` covers the same window as before.
 *
 * Animation length and `prefers-reduced-motion: reduce` are controlled by CSS
 * injected into the editable-area iframe (`editable-area-view.tsx`), not here.
 * @param elA - First sibling element
 * @param elB - Second sibling element (same parent as `elA`)
 * @example
 * ```ts
 * await replaceElement(currentBlock.el, currentBlock.el.nextElementSibling as HTMLElement);
 * // The two blocks have exchanged positions in the DOM.
 * ```
 */
export async function replaceElement(elA: HTMLElement, elB: HTMLElement): Promise<void> {
	if (elA.parentElement !== elB.parentElement) {
		throw new Error('The parent element of the two elements is different.');
	}

	const doc = elA.ownerDocument;
	const startViewTransition = doc.startViewTransition?.bind(doc);
	if (!startViewTransition) {
		elB.remove();
		elA.before(elB);
		return;
	}

	const id = ++nextViewTransitionId;
	const nameA = `bge-block-swap-${id}-a`;
	const nameB = `bge-block-swap-${id}-b`;
	const previousNameA = elA.style.viewTransitionName;
	const previousNameB = elB.style.viewTransitionName;

	elA.style.viewTransitionName = nameA;
	elB.style.viewTransitionName = nameB;

	try {
		const transition = startViewTransition(() => {
			elB.remove();
			elA.before(elB);
		});
		await transition.finished;
	} finally {
		if (previousNameA) {
			elA.style.viewTransitionName = previousNameA;
		} else {
			elA.style.removeProperty('view-transition-name');
		}
		if (previousNameB) {
			elB.style.viewTransitionName = previousNameB;
		} else {
			elB.style.removeProperty('view-transition-name');
		}
	}
}
