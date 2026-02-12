/**
 * Compare two priority arrays
 * Smaller numbers have higher priority.
 * @param a First priority array
 * @param b Second priority array
 * @returns 0 if priorities are equal, -1 if a has lower priority than b, 1 if a has higher priority than b
 */
export function comparePriority(a: readonly number[], b: readonly number[]): number {
	// Empty array has the highest priority (smallest number)
	if (a.length === 0 && b.length === 0) {
		return 0;
	}
	if (a.length === 0) {
		return 1; // a has higher priority
	}
	if (b.length === 0) {
		return -1; // a has lower priority
	}

	const minLength = Math.min(a.length, b.length);

	for (let i = 0; i < minLength - 1; i++) {
		if (a[i]! > b[i]!) {
			return -1;
		}
		if (a[i]! < b[i]!) {
			return 1;
		}
	}

	// If all elements up to minLength - 1 match, compare the last element
	if (minLength > 0) {
		const aLast = a[minLength - 1]!;
		const bLast = b[minLength - 1]!;

		// Special case for deeply nested layers (depth >= 3):
		// When the last element is in the [0, 1] range (0 = unlayered fallback, 1 = single declared layer),
		// the difference at that depth is not meaningful for priority resolution.
		// This treats sub-layer positions with only trivial priority values as equivalent,
		// deferring to the parent layer priority already resolved by earlier elements.
		if (minLength >= 3 && aLast >= 0 && aLast <= 1 && bLast >= 0 && bLast <= 1) {
			return 0;
		}

		// Normal comparison for last element
		if (aLast > bLast) {
			return -1;
		}
		if (aLast < bLast) {
			return 1;
		}
	}

	// All elements are equal up to minLength — shorter array (unlayered) has higher priority
	if (a.length < b.length) return 1;
	if (a.length > b.length) return -1;
	return 0;
}
