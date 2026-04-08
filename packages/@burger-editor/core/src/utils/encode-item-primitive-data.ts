import type { ItemPrimitiveData } from '../item/types.js';

/**
 *
 * @param array
 */
export function encodeItemPrimitiveData(
	array: ItemPrimitiveData | ItemPrimitiveData[],
): ItemPrimitiveData {
	return Array.isArray(array)
		? array
				.map((datum) => {
					const safeString = `${datum}`.toWellFormed().trim();
					const encodedString = encodeURIComponent(safeString);
					return encodedString;
				})
				.join(',')
		: typeof array === 'string'
			? `${array}`.toWellFormed().trim()
			: array;
}
