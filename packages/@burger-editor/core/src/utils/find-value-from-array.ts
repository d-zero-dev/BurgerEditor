/**
 *
 * @param array
 * @param searchValues
 */
export function findValueFromArray<T extends string>(
	array: readonly string[],
	searchValues: readonly T[],
): T | null {
	for (const value of searchValues) {
		if (array.includes(value)) {
			return value;
		}
	}
	return null;
}
