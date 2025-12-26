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

		// Special case: if minLength >= 3, all previous elements match, and last elements are both in [0, 1] range,
		// ignore the last element difference and check length
		if (minLength >= 3 && aLast >= 0 && aLast <= 1 && bLast >= 0 && bLast <= 1) {
			// If lengths differ, shorter array's elements are all matched
			if (a.length !== b.length) {
				return 0;
			}
			// Same length, all elements matched including last (treated as equal)
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

	// All elements are equal up to minLength
	return 0;
}
