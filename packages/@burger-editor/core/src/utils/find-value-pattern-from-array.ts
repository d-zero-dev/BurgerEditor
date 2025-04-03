/**
 *
 * @param array
 * @param pattern
 */
export function findValuePatternFromArray(
	array: readonly string[],
	pattern: RegExp,
): string | null {
	for (const value of array) {
		if (pattern.test(value)) {
			return value;
		}
	}
	return null;
}
