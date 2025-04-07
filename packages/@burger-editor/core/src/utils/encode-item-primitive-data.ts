import type { ItemPrimitiveData } from '../item/types.js';

/**
 *
 * @param array
 */
export function encodeItemPrimitiveData(
	array: ItemPrimitiveData | ItemPrimitiveData[],
): string {
	return Array.isArray(array)
		? array
				.map((datum) => {
					const safeString = `${datum}`.toWellFormed().trim();
					const encodedString = encodeURIComponent(safeString);
					return encodedString;
				})
				.join(',')
		: `${array}`.toWellFormed().trim();
}
